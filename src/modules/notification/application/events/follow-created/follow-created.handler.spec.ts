import type { CloudEvent, FollowCreatedPayload } from '@distributed-social-platform/shared-kernel'
import type { ISpaceFollowerRepository } from '@/modules/notification/domain/repositories/space-follower.repository'
import { FollowCreatedHandler } from './follow-created.handler'

function buildEvent(overrides: Partial<FollowCreatedPayload> = {}): CloudEvent<FollowCreatedPayload> {
  return {
    specversion: '1.0',
    id: 'event-1',
    source: '/cortex/core-api/Follow',
    type: 'FOLLOW_CREATED',
    time: new Date().toISOString(),
    subject: 'user-1:SPACE:space-1',
    datacontenttype: 'application/json',
    orgid: 'org-1',
    partitionkey: 'user-1:SPACE:space-1',
    data: { userId: 'user-1', targetType: 'SPACE', targetId: 'space-1', ...overrides },
  }
}

describe('FollowCreatedHandler', () => {
  let handler: FollowCreatedHandler
  let mockSpaceFollowerRepo: jest.Mocked<ISpaceFollowerRepository>

  beforeEach(() => {
    mockSpaceFollowerRepo = {
      upsert: jest.fn(),
      remove: jest.fn(),
      findFollowerIds: jest.fn(),
    } as unknown as jest.Mocked<ISpaceFollowerRepository>

    handler = new FollowCreatedHandler(mockSpaceFollowerRepo)
  })

  it('should declare natural-key idempotency (upsert by PK — re-apply is a no-op)', () => {
    expect(handler.idempotency).toBe('natural-key')
  })

  it('should upsert the space_followers projection row for a SPACE follow', async () => {
    await handler.handle(buildEvent())

    expect(mockSpaceFollowerRepo.upsert).toHaveBeenCalledWith({
      orgId: 'org-1',
      spaceId: 'space-1',
      userId: 'user-1',
    })
  })

  it('should ignore DOCUMENT follows (this projection only tracks space fan-out targets)', async () => {
    await handler.handle(buildEvent({ targetType: 'DOCUMENT' }))

    expect(mockSpaceFollowerRepo.upsert).not.toHaveBeenCalled()
  })
})
