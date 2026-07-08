import { ApplicationError } from '@distributed-social-platform/shared-kernel'

export class NotificationNotFoundError extends ApplicationError {
  readonly statusCode = 404
  readonly code = 'NOTIFICATION_NOT_FOUND'

  constructor() {
    super('Notification not found')
  }
}
