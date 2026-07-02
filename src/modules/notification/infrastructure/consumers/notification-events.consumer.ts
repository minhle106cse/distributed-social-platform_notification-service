import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import { EventRouter, ResilientEventConsumer } from '@distributed-social-platform/shared-kernel'
import { KafkaClientService } from '@/infrastructure/kafka/kafka-client.service'
import { DeadLetterProducer } from '@/infrastructure/kafka/dead-letter.producer'
import { handlerRetryCounter } from '@/infrastructure/observability/notification.metrics'
import { ItemPublishedHandler } from '../../application/events/item-published/item-published.handler'
import { FollowCreatedHandler } from '../../application/events/follow-created/follow-created.handler'
import { FollowRemovedHandler } from '../../application/events/follow-removed/follow-removed.handler'

/**
 * Consumer #1 — notification fan-out + follower projection. One group over both
 * topics (single concern: notifications). All at-least-once mechanics (retry →
 * DLQ, offset discipline) live in shared-kernel's ResilientEventConsumer.
 */
@Injectable()
export class NotificationEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly runner: ResilientEventConsumer

  constructor(
    kafkaClient: KafkaClientService,
    config: ConfigService,
    deadLetter: DeadLetterProducer,
    itemPublishedHandler: ItemPublishedHandler,
    followCreatedHandler: FollowCreatedHandler,
    followRemovedHandler: FollowRemovedHandler,
    @InjectPinoLogger(NotificationEventsConsumer.name) logger: PinoLogger,
  ) {
    const groupId =
      config.get<string>('env.kafkaNotificationConsumerGroup') ?? 'notification-service-group'

    this.runner = new ResilientEventConsumer({
      consumer: kafkaClient.client.consumer({ groupId }),
      topics: ['knowledge-events', 'engagement-events'],
      router: new EventRouter(logger)
        .register(itemPublishedHandler)
        .register(followCreatedHandler)
        .register(followRemovedHandler),
      deadLetter,
      logger,
      maxRetries: config.get<number>('env.kafkaConsumerMaxRetries') ?? 3,
      retryBackoffMs: config.get<number>('env.kafkaConsumerRetryBackoffMs') ?? 500,
      onRetry: (eventType) => handlerRetryCounter.inc({ eventType }),
    })
  }

  onModuleInit() {
    return this.runner.start()
  }

  onModuleDestroy() {
    return this.runner.stop()
  }
}
