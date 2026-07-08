import { Injectable, Inject } from '@nestjs/common'
import type { ICommandHandler } from '@distributed-social-platform/shared-kernel'
import { CommandHandler } from '@/infrastructure/cqrs/decorators/command-handler.decorator'
import {
  NOTIFICATION_REPOSITORY,
  type INotificationRepository,
} from '@/modules/notification/domain/repositories/notification.repository'
import { NotificationNotFoundError } from '@/common/errors/notification.error'
import { MarkNotificationReadCommand } from './mark-notification-read.command'

@Injectable()
@CommandHandler(MarkNotificationReadCommand)
export class MarkNotificationReadHandler implements ICommandHandler<
  MarkNotificationReadCommand,
  void
> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(command: MarkNotificationReadCommand): Promise<void> {
    const notification = await this.notificationRepo.findById(
      command.notificationId,
      command.recipientUserId,
    )
    if (!notification) throw new NotificationNotFoundError()

    const changed = notification.markAsRead()
    if (changed) await this.notificationRepo.save(notification)
  }
}
