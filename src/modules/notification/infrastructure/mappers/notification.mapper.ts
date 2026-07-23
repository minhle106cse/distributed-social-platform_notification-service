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
}
