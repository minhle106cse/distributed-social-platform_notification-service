import { Notification } from './notification.entity'

function buildNotification(readAt: Date | null = null) {
  return Notification.rehydrate({
    id: 'notif-1',
    orgId: 'org-1',
    recipientUserId: 'user-1',
    type: 'NEW_IN_SPACE',
    sourceEventId: 'event-1',
    itemId: 'item-1',
    spaceId: 'space-1',
    titleSnapshot: 'Onboarding Guide',
    actorUserId: 'author-1',
    readAt,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  })
}

describe('Notification Entity', () => {
  it('markAsRead should set readAt and report that state changed, for an unread notification', () => {
    const notification = buildNotification(null)

    const changed = notification.markAsRead()

    expect(changed).toBe(true)
    expect(notification.readAt).not.toBeNull()
  })

  it('markAsRead should be a no-op and report NO change on an already-read notification (redelivery / double-click safe)', () => {
    const originalReadAt = new Date('2026-01-02T00:00:00.000Z')
    const notification = buildNotification(originalReadAt)

    const changed = notification.markAsRead()

    expect(changed).toBe(false)
    expect(notification.readAt).toEqual(originalReadAt)
  })

  it('rehydrate should restore an existing notification as-is', () => {
    const notification = buildNotification(null)

    expect(notification.id).toBe('notif-1')
    expect(notification.recipientUserId).toBe('user-1')
    expect(notification.readAt).toBeNull()
  })
})
