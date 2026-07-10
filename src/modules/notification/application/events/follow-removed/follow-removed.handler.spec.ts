import type { CloudEvent, FollowRemovedPayload } from '@distributed-social-platform/shared-kernel'
import type { ISpaceFollowerRepository } from '@/modules/notification/domain/repositories/space-follower.repository'
import { FollowRemovedHandler } from './follow-removed.handler'

function buildEvent(
  overrides: Partial<FollowRemovedPayload> = {},
): CloudEvent<FollowRemovedPayload> {
  return {
    specversion: '1.0',
    id: 'event-1',
    source: '/cortex/core-api/Follow',
    type: 'FOLLOW_REMOVED',
    time: new Date().toISOString(),
    subject: 'user-1:SPACE:space-1',
    datacontenttype: 'application/json',
    orgid: 'org-1',
    partitionkey: 'user-1:SPACE:space-1',
    data: { userId: 'user-1', targetType: 'SPACE', targetId: 'space-1', ...overrides },
  }
}

describe('FollowRemovedHandler', () => {
  let handler: FollowRemovedHandler
  let mockSpaceFollowerRepo: jest.Mocked<ISpaceFollowerRepository>

  beforeEach(() => {
    mockSpaceFollowerRepo = {
      upsert: jest.fn(),
      remove: jest.fn(),
      findFollowerIds: jest.fn(),
    } as unknown as jest.Mocked<ISpaceFollowerRepository>

    handler = new FollowRemovedHandler(mockSpaceFollowerRepo)
  })

  it('should declare natural-key idempotency (delete by PK — re-apply matches 0 rows)', () => {
    expect(handler.idempotency).toBe('natural-key')
  })

  it('should remove the space_followers projection row for a SPACE unfollow', async () => {
    await handler.handle(buildEvent())

    expect(mockSpaceFollowerRepo.remove).toHaveBeenCalledWith('space-1', 'user-1')
  })

  it('should ignore DOCUMENT unfollows', async () => {
    await handler.handle(buildEvent({ targetType: 'DOCUMENT' }))

    expect(mockSpaceFollowerRepo.remove).not.toHaveBeenCalled()
  })
})
