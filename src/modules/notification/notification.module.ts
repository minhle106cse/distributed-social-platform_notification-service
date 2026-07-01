import { Module } from '@nestjs/common'
import { ItemPublishedHandler } from './application/events/item-published/item-published.handler'
import { FollowCreatedHandler } from './application/events/follow-created/follow-created.handler'
import { FollowRemovedHandler } from './application/events/follow-removed/follow-removed.handler'
import { PrismaNotificationRepository } from './infrastructure/repositories/prisma-notification.repository'
import { PrismaSpaceFollowerRepository } from './infrastructure/repositories/prisma-space-follower.repository'
import { NotificationEventsConsumer } from './infrastructure/consumers/notification-events.consumer'
import { NotificationController } from './presentation/notification.controller'
import { NOTIFICATION_REPOSITORY } from './application/repositories/notification.repository.interface'
import { SPACE_FOLLOWER_REPOSITORY } from './application/repositories/space-follower.repository.interface'

@Module({
  controllers: [NotificationController],
  providers: [
    // Event handlers
    ItemPublishedHandler,
    FollowCreatedHandler,
    FollowRemovedHandler,
    // Consumer (subscribes to knowledge-events + engagement-events)
    NotificationEventsConsumer,
    // Repositories
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
    {
      provide: SPACE_FOLLOWER_REPOSITORY,
      useClass: PrismaSpaceFollowerRepository,
    },
  ],
})
export class NotificationModule {}
