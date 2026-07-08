import { Inject, Injectable } from '@nestjs/common'
import type { CloudEvent } from '@distributed-social-platform/shared-kernel'
import {
  EventType,
  type IIntegrationEventHandler,
  type FollowRemovedPayload,
} from '@distributed-social-platform/shared-kernel'
import type { ISpaceFollowerRepository } from '@/modules/notification/domain/repositories/space-follower.repository'
import { SPACE_FOLLOWER_REPOSITORY } from '@/modules/notification/domain/repositories/space-follower.repository'

@Injectable()
export class FollowRemovedHandler implements IIntegrationEventHandler<FollowRemovedPayload> {
  readonly eventType = EventType.FOLLOW_REMOVED
  // delete by PK [spaceId, userId] — re-apply matches 0 rows (no-op).
  readonly idempotency = 'natural-key' as const

  constructor(
    @Inject(SPACE_FOLLOWER_REPOSITORY)
    private readonly spaceFollowerRepo: ISpaceFollowerRepository,
  ) {}

  async handle(event: CloudEvent<FollowRemovedPayload>): Promise<void> {
    const { targetType, targetId, userId } = event.data

    if (targetType !== 'SPACE') return

    await this.spaceFollowerRepo.remove(targetId, userId)
  }
}
