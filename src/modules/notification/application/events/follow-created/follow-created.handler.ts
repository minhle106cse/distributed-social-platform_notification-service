import { Inject, Injectable } from '@nestjs/common'
import type { CloudEvent } from '@distributed-social-platform/shared-kernel'
import {
  EventType,
  type IIntegrationEventHandler,
  type FollowCreatedPayload,
} from '@distributed-social-platform/shared-kernel'
import type { ISpaceFollowerRepository } from '@/modules/notification/domain/repositories/space-follower.repository'
import { SPACE_FOLLOWER_REPOSITORY } from '@/modules/notification/domain/repositories/space-follower.repository'

@Injectable()
export class FollowCreatedHandler implements IIntegrationEventHandler<FollowCreatedPayload> {
  readonly eventType = EventType.FOLLOW_CREATED
  // upsert by PK [spaceId, userId] — re-apply is a no-op.
  readonly idempotency = 'natural-key' as const

  constructor(
    @Inject(SPACE_FOLLOWER_REPOSITORY)
    private readonly spaceFollowerRepo: ISpaceFollowerRepository,
  ) {}

  async handle(event: CloudEvent<FollowCreatedPayload>): Promise<void> {
    const { userId, targetType, targetId } = event.data
    const orgId = event.orgid

    if (targetType !== 'SPACE') return

    await this.spaceFollowerRepo.upsert({ orgId, spaceId: targetId, userId })
  }
}
