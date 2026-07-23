import { Prisma } from '@/generated'
import { PrismaNotificationRepository } from './prisma-notification.repository'
import type { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { Notification } from '@/modules/notification/domain/entities/notification.entity'

function buildNotification(overrides: { readAt?: Date | null } = {}) {
  return Notification.rehydrate({
    id: 'notif-1',
    orgId: 'org-1',
    recipientUserId: 'user-1',
    type: 'ITEM_PUBLISHED',
    sourceEventId: 'evt-1',
    itemId: 'item-1',
    spaceId: 'space-1',
    titleSnapshot: 'Doc',
    actorUserId: 'actor-1',
    readAt: overrides.readAt ?? new Date(),
    createdAt: new Date(),
  })
}

describe('PrismaNotificationRepository', () => {
  describe('save', () => {
    it('nên update readAt khi (id, recipientUserId) vẫn khớp', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({})
      const mockPrisma = { client: { notification: { update: mockUpdate } } } as unknown as PrismaService
      const repo = new PrismaNotificationRepository(mockPrisma)
      const notification = buildNotification()

      await repo.save(notification)

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'notif-1', recipientUserId: 'user-1' },
        data: { readAt: notification.readAt },
      })
    })

    it('nên nuốt lỗi P2025 (race: id/recipientUserId đã đổi giữa findById và save) và trả về bình thường, không throw', async () => {
      const p2025 = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: 'test',
      })
      const mockUpdate = jest.fn().mockRejectedValue(p2025)
      const mockPrisma = { client: { notification: { update: mockUpdate } } } as unknown as PrismaService
      const repo = new PrismaNotificationRepository(mockPrisma)

      // Không được throw — race concurrent-delete/reassignment coi như not-found,
      // giống hệt hành vi findById() trả null, KHÔNG phải lỗi cần báo cho caller.
      await expect(repo.save(buildNotification())).resolves.toBeUndefined()
    })

    it('nên rethrow nguyên trạng lỗi Prisma khác không phải P2025', async () => {
      const otherError = new Prisma.PrismaClientKnownRequestError('Some other error', {
        code: 'P2002',
        clientVersion: 'test',
      })
      const mockUpdate = jest.fn().mockRejectedValue(otherError)
      const mockPrisma = { client: { notification: { update: mockUpdate } } } as unknown as PrismaService
      const repo = new PrismaNotificationRepository(mockPrisma)

      await expect(repo.save(buildNotification())).rejects.toBe(otherError)
    })

    it('nên rethrow lỗi không phải PrismaClientKnownRequestError (ví dụ lỗi kết nối)', async () => {
      const connectionError = new Error('connection reset')
      const mockUpdate = jest.fn().mockRejectedValue(connectionError)
      const mockPrisma = { client: { notification: { update: mockUpdate } } } as unknown as PrismaService
      const repo = new PrismaNotificationRepository(mockPrisma)

      await expect(repo.save(buildNotification())).rejects.toBe(connectionError)
    })
  })
})
