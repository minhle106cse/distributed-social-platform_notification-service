import { IQuery } from '@distributed-social-platform/shared-kernel'

export class GetNotificationsQuery implements IQuery {
  readonly name = GetNotificationsQuery.name

  constructor(
    readonly orgId: string,
    readonly userId: string,
    readonly limit: number,
    readonly offset: number,
    readonly unreadOnly: boolean,
  ) {}
}
