import { Notification } from '@/modules/notification/domain/entities/notification.entity'

interface PrismaNotificationRow {
  id: string
  orgId: string
  recipientUserId: string
  type: string
  sourceEventId: string
  itemId: string
  spaceId: string
  titleSnapshot: string
  actorUserId: string
  readAt: Date | null
  createdAt: Date
}

export class NotificationMapper {
  static toDomain(row: PrismaNotificationRow): Notification {
    return Notification.rehydrate({
      id: row.id,
      orgId: row.orgId,
      recipientUserId: row.recipientUserId,
      type: row.type,
      sourceEventId: row.sourceEventId,
      itemId: row.itemId,
      spaceId: row.spaceId,
      titleSnapshot: row.titleSnapshot,
      actorUserId: row.actorUserId,
      readAt: row.readAt,
      createdAt: row.createdAt,
    })
  }

  // Full persistence shape, for consistency with every other mapper in the codebase.
  // `save()`'s repository update narrows this to just `readAt` (the only mutable
  // field — markAsRead() is the entity's one transition) instead of writing every
  // column back; that's the same "scoped transition payload" pattern already used
  // by KnowledgeItem's publish/verify/softDelete updates, not a mapper bypass.
  static toPersistence(notification: Notification): PrismaNotificationRow {
    return {
      id: notification.id,
      orgId: notification.orgId,
      recipientUserId: notification.recipientUserId,
      type: notification.type,
      sourceEventId: notification.sourceEventId,
      itemId: notification.itemId,
      spaceId: notification.spaceId,
      titleSnapshot: notification.titleSnapshot,
      actorUserId: notification.actorUserId,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    }
  }
}
