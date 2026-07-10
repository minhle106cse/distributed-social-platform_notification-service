import type { INotificationQueryRepository } from '@/modules/notification/application/queries/notification.query-repository'
import { GetNotificationsHandler } from './get-notifications.handler'
import { GetNotificationsQuery } from './get-notifications.query'

describe('GetNotificationsHandler', () => {
  let handler: GetNotificationsHandler
  let mockQueryRepo: jest.Mocked<INotificationQueryRepository>

  beforeEach(() => {
    mockQueryRepo = {
      findByRecipient: jest.fn(),
    } as unknown as jest.Mocked<INotificationQueryRepository>

    handler = new GetNotificationsHandler(mockQueryRepo)
  })

  it('should forward org/user and pagination/unreadOnly filter to the query repository', async () => {
    mockQueryRepo.findByRecipient.mockResolvedValueOnce([{ id: 'notif-1' } as never])

    const result = await handler.execute(new GetNotificationsQuery('org-1', 'user-1', 25, 0, true))

    expect(mockQueryRepo.findByRecipient).toHaveBeenCalledWith('org-1', 'user-1', {
      limit: 25,
      offset: 0,
      unreadOnly: true,
    })
    expect(result).toEqual([{ id: 'notif-1' }])
  })
})
