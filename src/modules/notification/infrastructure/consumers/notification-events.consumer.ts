import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Consumer } from "kafkajs";
import type { CloudEvent } from "@distributed-social-platform/shared-kernel";
import {
  EventRouter,
  createLogger,
  LogContext,
} from "@distributed-social-platform/shared-kernel";
import { KafkaClientService } from "@/infrastructure/kafka/kafka-client.service";
import { ItemPublishedHandler } from "../../application/events/item-published/item-published.handler";
import { FollowCreatedHandler } from "../../application/events/follow-created/follow-created.handler";
import { FollowRemovedHandler } from "../../application/events/follow-removed/follow-removed.handler";

const TOPICS = ["knowledge-events", "engagement-events"];

@Injectable()
export class NotificationEventsConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private readonly consumer: Consumer;
  private readonly router: EventRouter;
  private readonly logger = createLogger("notification-service");

  constructor(
    private readonly kafkaClient: KafkaClientService,
    private readonly configService: ConfigService,
    private readonly itemPublishedHandler: ItemPublishedHandler,
    private readonly followCreatedHandler: FollowCreatedHandler,
    private readonly followRemovedHandler: FollowRemovedHandler,
  ) {
    const groupId =
      this.configService.get<string>("env.kafkaNotificationConsumerGroup") ??
      "notification-service-knowledge-group";

    this.consumer = this.kafkaClient.client.consumer({ groupId });
    this.router = new EventRouter(this.logger);
    this.router.register(this.itemPublishedHandler);
    this.router.register(this.followCreatedHandler);
    this.router.register(this.followRemovedHandler);
  }

  async onModuleInit() {
    await this.consumer.connect();
    for (const topic of TOPICS) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        const raw = message.value?.toString();

        if (!raw) {
          await this.consumer.commitOffsets([
            { topic, partition, offset: String(Number(message.offset) + 1) },
          ]);
          return;
        }

        let event: CloudEvent;
        try {
          event = JSON.parse(raw) as CloudEvent;
          if (!event.id || !event.type) throw new Error("missing id or type");
        } catch (err) {
          this.logger.error(
            { context: LogContext.EVENT_ROUTER, err, raw },
            "Poison pill — skipping message (TODO DLQ)",
          );
          await this.consumer.commitOffsets([
            { topic, partition, offset: String(Number(message.offset) + 1) },
          ]);
          return;
        }

        try {
          await this.router.route(event);
          await this.consumer.commitOffsets([
            { topic, partition, offset: String(Number(message.offset) + 1) },
          ]);
        } catch (err) {
          this.logger.error(
            {
              context: LogContext.EVENT_ROUTER,
              err,
              eventId: event.id,
              eventType: event.type,
            },
            "Handler error — not committing offset (will retry on restart)",
          );
          throw err;
        }
      },
    });

    this.logger.info(
      { context: LogContext.EVENT_ROUTER, topics: TOPICS },
      "NotificationEventsConsumer started",
    );
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }
}
