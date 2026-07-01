import { Inject, Injectable } from '@nestjs/common'
import type { CloudEvent } from '@distributed-social-platform/shared-kernel'
import {
  EventType,
  type IIntegrationEventHandler,
  type KnowledgePublishedPayload,
} from '@distributed-social-platform/shared-kernel'
import type { INotificationRepository } from '../../repositories/notification.repository.interface'
import { NOTIFICATION_REPOSITORY } from '../../repositories/notification.repository.interface'
import type { ISpaceFollowerRepository } from '../../repositories/space-follower.repository.interface'
import { SPACE_FOLLOWER_REPOSITORY } from '../../repositories/space-follower.repository.interface'

@Injectable()
export class ItemPublishedHandler implements IIntegrationEventHandler<KnowledgePublishedPayload> {
  readonly eventType = EventType.KNOWLEDGE_PUBLISHED

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: INotificationRepository,
    @Inject(SPACE_FOLLOWER_REPOSITORY)
    private readonly spaceFollowerRepo: ISpaceFollowerRepository,
  ) {}

  async handle(event: CloudEvent<KnowledgePublishedPayload>): Promise<void> {
    const { itemId, orgId, spaceId, title, createdByUserId } = event.data

    const followerIds = await this.spaceFollowerRepo.findFollowerIds(orgId, spaceId)
    const recipients = followerIds.filter((id) => id !== createdByUserId)

    if (recipients.length === 0) return

    await this.notificationRepo.insertMany(
      recipients.map((recipientUserId) => ({
        orgId,
        recipientUserId,
        type: 'NEW_IN_SPACE',
        sourceEventId: event.id,
        itemId,
        spaceId,
        titleSnapshot: title,
        actorUserId: createdByUserId,
      })),
    )
  }
}
