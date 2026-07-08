import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'
import {
  EventRouter,
  ResilientEventConsumer,
  KafkaTopic,
} from '@distributed-social-platform/shared-kernel'
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
    const groupId = config.getOrThrow<string>('env.kafkaNotificationConsumerGroup')

    this.runner = new ResilientEventConsumer({
      consumer: kafkaClient.client.consumer({ groupId }),
      topics: [KafkaTopic.KNOWLEDGE_EVENTS, KafkaTopic.ENGAGEMENT_EVENTS],
      router: new EventRouter(logger)
        .register(itemPublishedHandler)
        .register(followCreatedHandler)
        .register(followRemovedHandler),
      deadLetter,
      logger,
      maxRetries: config.getOrThrow<number>('env.kafkaConsumerMaxRetries'),
      retryBackoffMs: config.getOrThrow<number>('env.kafkaConsumerRetryBackoffMs'),
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
