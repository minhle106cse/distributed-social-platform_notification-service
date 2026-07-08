import type { NotificationDto } from './notification.dto'

export interface FindByRecipientOptions {
  limit: number
  offset: number
  unreadOnly: boolean
}

/** Read-side repository — returns flat DTOs, deliberately bypasses the domain entity (query side of CQRS). */
export interface INotificationQueryRepository {
  findByRecipient(
    orgId: string,
    userId: string,
    options: FindByRecipientOptions,
  ): Promise<NotificationDto[]>
}

export const NOTIFICATION_QUERY_REPOSITORY = Symbol('NOTIFICATION_QUERY_REPOSITORY')
