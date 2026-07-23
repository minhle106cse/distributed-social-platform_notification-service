import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class MarkNotificationReadCommand implements ICommand {
  readonly name = MarkNotificationReadCommand.name
  readonly options: CommandOptions = {
    transactional: false,
    // set-semantics: markAsRead() is a no-op if already read (does not re-bump readAt).
  }

  constructor(
    readonly notificationId: string,
    readonly recipientUserId: string,
  ) {}
}
