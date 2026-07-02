import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { Consumer } from 'kafkajs'
import type { CloudEvent } from '@distributed-social-platform/shared-kernel'
import { EventRouter, LogContext } from '@distributed-social-platform/shared-kernel'
import { KafkaClientService } from '@/infrastructure/kafka/kafka-client.service'
import { DeadLetterProducer } from '@/infrastructure/kafka/dead-letter.producer'
import { handlerRetryCounter } from '@/infrastructure/observability/notification.metrics'
import { ItemPublishedHandler } from '../../application/events/item-published/item-published.handler'
import { FollowCreatedHandler } from '../../application/events/follow-created/follow-created.handler'
import { FollowRemovedHandler } from '../../application/events/follow-removed/follow-removed.handler'

const TOPICS = ['knowledge-events', 'engagement-events']

@Injectable()
export class NotificationEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly consumer: Consumer
  private readonly router: EventRouter
  private readonly maxRetries: number
  private readonly retryBackoffMs: number

  constructor(
    private readonly kafkaClient: KafkaClientService,
    private readonly configService: ConfigService,
    private readonly deadLetter: DeadLetterProducer,
    private readonly itemPublishedHandler: ItemPublishedHandler,
    private readonly followCreatedHandler: FollowCreatedHandler,
    private readonly followRemovedHandler: FollowRemovedHandler,
    @InjectPinoLogger(NotificationEventsConsumer.name)
    private readonly logger: PinoLogger,
  ) {
    const groupId =
      this.configService.get<string>('env.kafkaNotificationConsumerGroup') ??
      'notification-service-group'
    this.maxRetries = this.configService.get<number>('env.kafkaConsumerMaxRetries') ?? 3
    this.retryBackoffMs = this.configService.get<number>('env.kafkaConsumerRetryBackoffMs') ?? 500

    this.consumer = this.kafkaClient.client.consumer({ groupId })
    this.router = new EventRouter(this.logger)
    this.router.register(this.itemPublishedHandler)
    this.router.register(this.followCreatedHandler)
    this.router.register(this.followRemovedHandler)
  }

  async onModuleInit() {
    await this.consumer.connect()
    for (const topic of TOPICS) {
      await this.consumer.subscribe({ topic, fromBeginning: false })
    }

    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        const commit = () =>
          this.consumer.commitOffsets([
            { topic, partition, offset: String(Number(message.offset) + 1) },
          ])

        const raw = message.value?.toString()

        // Empty tombstone → nothing to route.
        if (!raw) {
          await commit()
          return
        }

        // Parse. A malformed/incomplete envelope is a poison pill: retrying never
        // helps, so isolate it in the DLQ immediately and keep the partition moving.
        let event: CloudEvent
        try {
          event = JSON.parse(raw) as CloudEvent
          if (!event.id || !event.type) throw new Error('missing id or type')
        } catch (err) {
          this.logger.error(
            { context: LogContext.EVENT_ROUTER, err, raw },
            'Poison pill — dead-lettering message',
          )
          await this.deadLetter.send({
            topic,
            key: message.key,
            value: message.value,
            reason: 'poison-pill',
            error: String(err),
            partition,
            offset: message.offset,
          })
          await commit()
          return
        }

        // Handler dispatch with bounded in-process retry. Transient failures (DB
        // blip) recover on a retry; a permanently-failing message is dead-lettered
        // after the budget is spent — it never blocks the partition head-of-line.
        try {
          await this.routeWithRetry(event)
        } catch (err) {
          this.logger.error(
            {
              context: LogContext.EVENT_ROUTER,
              err,
              eventId: event.id,
              eventType: event.type,
            },
            'Handler failed after retries — dead-lettering message',
          )
          await this.deadLetter.send({
            topic,
            key: message.key,
            value: message.value,
            reason: 'handler-error',
            error: String(err),
            partition,
            offset: message.offset,
          })
        }

        await commit()
      },
    })

    this.logger.info(
      { context: LogContext.EVENT_ROUTER, topics: TOPICS },
      'NotificationEventsConsumer started',
    )
  }

  private async routeWithRetry(event: CloudEvent): Promise<void> {
    let lastErr: unknown
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await this.router.route(event)
        return
      } catch (err) {
        lastErr = err
        if (attempt < this.maxRetries) {
          handlerRetryCounter.inc({ eventType: event.type })
          this.logger.warn(
            {
              context: LogContext.EVENT_ROUTER,
              err,
              eventId: event.id,
              eventType: event.type,
              attempt: attempt + 1,
              maxRetries: this.maxRetries,
            },
            'Handler error — retrying',
          )
          await this.sleep(this.retryBackoffMs * (attempt + 1)) // linear backoff
        }
      }
    }
    throw lastErr
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async onModuleDestroy() {
    await this.consumer.disconnect()
  }
}
