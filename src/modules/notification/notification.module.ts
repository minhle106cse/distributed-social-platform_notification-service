import { Module } from '@nestjs/common'
import { ItemPublishedHandler } from './application/events/item-published/item-published.handler'
import { FollowCreatedHandler } from './application/events/follow-created/follow-created.handler'
import { FollowRemovedHandler } from './application/events/follow-removed/follow-removed.handler'
import { MarkNotificationReadHandler } from './application/commands/mark-notification-read/mark-notification-read.handler'
import { GetNotificationsHandler } from './application/queries/get-notifications/get-notifications.handler'
import { PrismaNotificationRepository } from './infrastructure/repositories/prisma-notification.repository'
import { PrismaSpaceFollowerRepository } from './infrastructure/repositories/prisma-space-follower.repository'
import { NotificationEventsConsumer } from './infrastructure/consumers/notification-events.consumer'
import { NotificationController } from './presentation/notification.controller'
import { NOTIFICATION_REPOSITORY } from './domain/repositories/notification.repository'
import { NOTIFICATION_QUERY_REPOSITORY } from './application/queries/notification.query-repository'
import { SPACE_FOLLOWER_REPOSITORY } from './domain/repositories/space-follower.repository'

@Module({
  controllers: [NotificationController],
  providers: [
    // Command/query handlers (auto-discovered + registered by CqrsModule)
    MarkNotificationReadHandler,
    GetNotificationsHandler,
    // Event handlers
    ItemPublishedHandler,
    FollowCreatedHandler,
    FollowRemovedHandler,
    // Consumer (subscribes to knowledge-events + engagement-events)
    NotificationEventsConsumer,
    // Repositories — one instance, two interfaces (write side + read side)
    PrismaNotificationRepository,
    {
      provide: NOTIFICATION_REPOSITORY,
      useExisting: PrismaNotificationRepository,
    },
    {
      provide: NOTIFICATION_QUERY_REPOSITORY,
      useExisting: PrismaNotificationRepository,
    },
    {
      provide: SPACE_FOLLOWER_REPOSITORY,
      useClass: PrismaSpaceFollowerRepository,
    },
  ],
})
export class NotificationModule {}
