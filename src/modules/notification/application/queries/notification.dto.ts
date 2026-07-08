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
