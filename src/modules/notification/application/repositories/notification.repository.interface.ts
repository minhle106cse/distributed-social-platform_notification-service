export interface InsertNotificationRow {
  orgId: string
  recipientUserId: string
  type: string
  sourceEventId: string
  itemId: string
  spaceId: string
  titleSnapshot: string
  actorUserId: string
}

export interface NotificationDto {
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

export interface FindByRecipientOptions {
  limit: number
  offset: number
  unreadOnly: boolean
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY')

export interface INotificationRepository {
  insertMany(rows: InsertNotificationRow[]): Promise<void>
  findByRecipient(
    orgId: string,
    userId: string,
    options: FindByRecipientOptions,
  ): Promise<NotificationDto[]>
  markRead(id: string, recipientUserId: string): Promise<NotificationDto | null>
}
