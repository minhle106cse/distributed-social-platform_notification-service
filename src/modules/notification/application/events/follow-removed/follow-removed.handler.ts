import { Inject, Injectable } from "@nestjs/common";
import type { CloudEvent } from "@distributed-social-platform/shared-kernel";
import {
  EventType,
  type IIntegrationEventHandler,
  type FollowRemovedPayload,
} from "@distributed-social-platform/shared-kernel";
import type { ISpaceFollowerRepository } from "../../repositories/space-follower.repository.interface";
import { SPACE_FOLLOWER_REPOSITORY } from "../../repositories/space-follower.repository.interface";

@Injectable()
export class FollowRemovedHandler implements IIntegrationEventHandler<FollowRemovedPayload> {
  readonly eventType = EventType.FOLLOW_REMOVED;

  constructor(
    @Inject(SPACE_FOLLOWER_REPOSITORY)
    private readonly spaceFollowerRepo: ISpaceFollowerRepository,
  ) {}

  async handle(event: CloudEvent<FollowRemovedPayload>): Promise<void> {
    const { targetType, targetId, userId } = event.data;

    if (targetType !== "SPACE") return;

    await this.spaceFollowerRepo.remove(targetId, userId);
  }
}
