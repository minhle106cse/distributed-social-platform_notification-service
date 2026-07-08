import { ICommand, CommandOptions } from '@distributed-social-platform/shared-kernel'

export class MarkNotificationReadCommand implements ICommand {
  readonly name = MarkNotificationReadCommand.name
  readonly options: CommandOptions = { transactional: false, retryable: false }

  constructor(
    readonly notificationId: string,
    readonly recipientUserId: string,
  ) {}
}
