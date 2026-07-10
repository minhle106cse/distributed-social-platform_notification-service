import type { CloudEvent, KnowledgePublishedPayload } from '@distributed-social-platform/shared-kernel'
import type { INotificationRepository } from '@/modules/notification/domain/repositories/notification.repository'
import type { ISpaceFollowerRepository } from '@/modules/notification/domain/repositories/space-follower.repository'
import { ItemPublishedHandler } from './item-published.handler'

function buildEvent(): CloudEvent<KnowledgePublishedPayload> {
  return {
    specversion: '1.0',
    id: 'event-1',
    source: '/cortex/core-api/KnowledgeItem',
    type: 'KNOWLEDGE_PUBLISHED',
    time: new Date().toISOString(),
    subject: 'item-1',
    datacontenttype: 'application/json',
    orgid: 'org-1',
    partitionkey: 'item-1',
    data: {
      itemId: 'item-1',
      spaceId: 'space-1',
      type: 'DOCUMENT',
      title: 'Onboarding Guide',
      body: 'Step 1...',
      createdByUserId: 'author-1',
    },
  }
}

describe('ItemPublishedHandler', () => {
  let handler: ItemPublishedHandler
  let mockNotificationRepo: jest.Mocked<INotificationRepository>
  let mockSpaceFollowerRepo: jest.Mocked<ISpaceFollowerRepository>

  beforeEach(() => {
    mockNotificationRepo = {
      insertMany: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<INotificationRepository>

    mockSpaceFollowerRepo = {
      upsert: jest.fn(),
      remove: jest.fn(),
      findFollowerIds: jest.fn(),
    } as unknown as jest.Mocked<ISpaceFollowerRepository>

    handler = new ItemPublishedHandler(mockNotificationRepo, mockSpaceFollowerRepo)
  })

  it('should declare dedup-constraint idempotency (enforced by the DB unique index, not application logic)', () => {
    expect(handler.idempotency).toBe('dedup-constraint')
  })

  it('should fan out a notification to every follower EXCEPT the author', async () => {
    mockSpaceFollowerRepo.findFollowerIds.mockResolvedValueOnce([
      'follower-1',
      'follower-2',
      'author-1',
    ])

    await handler.handle(buildEvent())

    const rows = mockNotificationRepo.insertMany.mock.calls[0][0]
    expect(rows.map((r) => r.recipientUserId).sort()).toEqual(['follower-1', 'follower-2'])
    expect(rows.every((r) => r.sourceEventId === 'event-1')).toBe(true)
  })

  it('should skip the insert entirely when the only follower is the author (no recipients)', async () => {
    mockSpaceFollowerRepo.findFollowerIds.mockResolvedValueOnce(['author-1'])

    await handler.handle(buildEvent())

    expect(mockNotificationRepo.insertMany).not.toHaveBeenCalled()
  })
})
