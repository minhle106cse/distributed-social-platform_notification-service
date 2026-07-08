import { Injectable, Inject } from '@nestjs/common'
import type { IQueryHandler } from '@distributed-social-platform/shared-kernel'
import { QueryHandler } from '@/infrastructure/cqrs/decorators/query-handler.decorator'
import {
  NOTIFICATION_QUERY_REPOSITORY,
  type INotificationQueryRepository,
} from '@/modules/notification/application/queries/notification.query-repository'
import type { NotificationDto } from '@/modules/notification/application/queries/notification.dto'
import { GetNotificationsQuery } from './get-notifications.query'

@Injectable()
@QueryHandler(GetNotificationsQuery)
export class GetNotificationsHandler implements IQueryHandler<
  GetNotificationsQuery,
  NotificationDto[]
> {
  constructor(
    @Inject(NOTIFICATION_QUERY_REPOSITORY)
    private readonly queryRepo: INotificationQueryRepository,
  ) {}

  async execute(query: GetNotificationsQuery): Promise<NotificationDto[]> {
    return this.queryRepo.findByRecipient(query.orgId, query.userId, {
      limit: query.limit,
      offset: query.offset,
      unreadOnly: query.unreadOnly,
    })
  }
}
