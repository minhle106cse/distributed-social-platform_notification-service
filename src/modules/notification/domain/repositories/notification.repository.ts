import type { Notification } from '../entities/notification.entity'

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

/**
 * Write-side repository. `insertMany` is the fan-out bulk write used by the
 * ItemPublishedHandler (Kafka consumer, not exposed via CommandBus — dedup via
 * @@unique([recipientUserId, sourceEventId]), see eventing_patterns.md §4.3).
 * `findById`/`save` are the entity-based path used by application commands
 * (e.g. MarkNotificationReadCommand) so state transitions go through
 * Notification's own invariants instead of a raw Prisma update.
 */
export interface INotificationRepository {
  insertMany(rows: InsertNotificationRow[]): Promise<void>
  findById(id: string, recipientUserId: string): Promise<Notification | null>
  save(notification: Notification): Promise<void>
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY')
