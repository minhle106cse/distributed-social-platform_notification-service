import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Producer } from 'kafkajs'
import {
  createLogger,
  deadLetterTopic,
  LogContext,
} from '@distributed-social-platform/shared-kernel'
import { KafkaClientService } from './kafka-client.service'

export interface DeadLetterInput {
  topic: string
  key: Buffer | string | null
  value: Buffer | string | null
  reason: 'poison-pill' | 'handler-error'
  error: string
  partition: number
  offset: string
}

/**
 * Routes a terminally-failed message to `<topic>.DLQ` so it is isolated for triage
 * instead of dropped (silent data loss) or replayed forever (partition stall). The
 * original bytes + key are preserved; failure context travels in headers.
 */
@Injectable()
export class DeadLetterProducer implements OnModuleInit, OnModuleDestroy {
  private readonly producer: Producer
  private readonly logger = createLogger('notification-service')

  constructor(kafkaClient: KafkaClientService) {
    this.producer = kafkaClient.client.producer({ idempotent: true })
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect()
  }

  async send(input: DeadLetterInput): Promise<void> {
    const dlqTopic = deadLetterTopic(input.topic)

    await this.producer.send({
      topic: dlqTopic,
      messages: [
        {
          key: input.key ?? undefined,
          value: input.value ?? '',
          headers: {
            'x-dlq-reason': input.reason,
            'x-dlq-error': input.error.slice(0, 2000),
            'x-original-topic': input.topic,
            'x-original-partition': String(input.partition),
            'x-original-offset': input.offset,
            'x-dlq-at': new Date().toISOString(),
          },
        },
      ],
    })

    this.logger.warn(
      { context: LogContext.EVENT_ROUTER, dlqTopic, reason: input.reason, offset: input.offset },
      'Message dead-lettered',
    )
  }
}
