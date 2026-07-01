import { Inject, Injectable } from '@nestjs/common'
import type { CloudEvent } from '@distributed-social-platform/shared-kernel'
import {
  EventType,
  type IIntegrationEventHandler,
  type FollowCreatedPayload,
} from '@distributed-social-platform/shared-kernel'
import type { ISpaceFollowerRepository } from '../../repositories/space-follower.repository.interface'
import { SPACE_FOLLOWER_REPOSITORY } from '../../repositories/space-follower.repository.interface'

@Injectable()
export class FollowCreatedHandler implements IIntegrationEventHandler<FollowCreatedPayload> {
  readonly eventType = EventType.FOLLOW_CREATED

  constructor(
    @Inject(SPACE_FOLLOWER_REPOSITORY)
    private readonly spaceFollowerRepo: ISpaceFollowerRepository,
  ) {}

  async handle(event: CloudEvent<FollowCreatedPayload>): Promise<void> {
    const { orgId, userId, targetType, targetId } = event.data

    if (targetType !== 'SPACE') return

    await this.spaceFollowerRepo.upsert({ orgId, spaceId: targetId, userId })
  }
}
