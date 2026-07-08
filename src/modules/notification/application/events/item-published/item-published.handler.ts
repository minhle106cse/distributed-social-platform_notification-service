import { Inject, Injectable } from '@nestjs/common'
import type { CloudEvent } from '@distributed-social-platform/shared-kernel'
import {
  EventType,
  type IIntegrationEventHandler,
  type KnowledgePublishedPayload,
} from '@distributed-social-platform/shared-kernel'
import type { INotificationRepository } from '@/modules/notification/domain/repositories/notification.repository'
import { NOTIFICATION_REPOSITORY } from '@/modules/notification/domain/repositories/notification.repository'
import type { ISpaceFollowerRepository } from '@/modules/notification/domain/repositories/space-follower.repository'
import { SPACE_FOLLOWER_REPOSITORY } from '@/modules/notification/domain/repositories/space-follower.repository'

@Injectable()
export class ItemPublishedHandler implements IIntegrationEventHandler<KnowledgePublishedPayload> {
  readonly eventType = EventType.KNOWLEDGE_PUBLISHED
  // Fan-out INSERTs are deduped by @@unique([recipientUserId, sourceEventId]).
  readonly idempotency = 'dedup-constraint' as const

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: INotificationRepository,
    @Inject(SPACE_FOLLOWER_REPOSITORY)
    private readonly spaceFollowerRepo: ISpaceFollowerRepository,
  ) {}

  async handle(event: CloudEvent<KnowledgePublishedPayload>): Promise<void> {
    const { itemId, spaceId, title, createdByUserId } = event.data
    const orgId = event.orgid

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
