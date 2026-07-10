import type { INotificationRepository } from '@/modules/notification/domain/repositories/notification.repository'
import { Notification } from '@/modules/notification/domain/entities/notification.entity'
import { NotificationNotFoundError } from '@/common/errors/notification.error'
import { MarkNotificationReadHandler } from './mark-notification-read.handler'
import { MarkNotificationReadCommand } from './mark-notification-read.command'

describe('MarkNotificationReadHandler', () => {
  let handler: MarkNotificationReadHandler
  let mockNotificationRepo: jest.Mocked<INotificationRepository>

  beforeEach(() => {
    mockNotificationRepo = {
      insertMany: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<INotificationRepository>

    handler = new MarkNotificationReadHandler(mockNotificationRepo)
  })

  it('should throw NotificationNotFoundError when the notification does not belong to (or exist for) this recipient', async () => {
    mockNotificationRepo.findById.mockResolvedValueOnce(null)

    await expect(
      handler.execute(new MarkNotificationReadCommand('missing', 'user-1')),
    ).rejects.toThrow(NotificationNotFoundError)
  })

  it('should mark it read and persist when currently unread', async () => {
    const notification = Notification.rehydrate({
      id: 'notif-1',
      orgId: 'org-1',
      recipientUserId: 'user-1',
      type: 'NEW_IN_SPACE',
      sourceEventId: 'event-1',
      itemId: 'item-1',
      spaceId: 'space-1',
      titleSnapshot: 'T',
      actorUserId: 'author-1',
      readAt: null,
      createdAt: new Date(),
    })
    mockNotificationRepo.findById.mockResolvedValueOnce(notification)

    await handler.execute(new MarkNotificationReadCommand('notif-1', 'user-1'))

    expect(notification.readAt).not.toBeNull()
    expect(mockNotificationRepo.save).toHaveBeenCalledWith(notification)
  })

  it('should skip the write entirely when the notification is already read (idempotent no-op)', async () => {
    const notification = Notification.rehydrate({
      id: 'notif-1',
      orgId: 'org-1',
      recipientUserId: 'user-1',
      type: 'NEW_IN_SPACE',
      sourceEventId: 'event-1',
      itemId: 'item-1',
      spaceId: 'space-1',
      titleSnapshot: 'T',
      actorUserId: 'author-1',
      readAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date(),
    })
    mockNotificationRepo.findById.mockResolvedValueOnce(notification)

    await handler.execute(new MarkNotificationReadCommand('notif-1', 'user-1'))

    expect(mockNotificationRepo.save).not.toHaveBeenCalled()
  })
})
