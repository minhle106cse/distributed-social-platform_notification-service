import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import type {
  FindByRecipientOptions,
  INotificationRepository,
  InsertNotificationRow,
  NotificationDto,
} from '../../application/repositories/notification.repository.interface'

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async insertMany(rows: InsertNotificationRow[]): Promise<void> {
    if (rows.length === 0) return

    await this.prisma.client.notification.createMany({
      data: rows.map((r) => ({
        orgId: r.orgId,
        recipientUserId: r.recipientUserId,
        type: r.type,
        sourceEventId: r.sourceEventId,
        itemId: r.itemId,
        spaceId: r.spaceId,
        titleSnapshot: r.titleSnapshot,
        actorUserId: r.actorUserId,
      })),
      skipDuplicates: true, // idempotent: @@unique([recipientUserId, sourceEventId])
    })
  }

  async findByRecipient(
    orgId: string,
    userId: string,
    options: FindByRecipientOptions,
  ): Promise<NotificationDto[]> {
    const rows = await this.prisma.client.notification.findMany({
      where: {
        orgId,
        recipientUserId: userId,
        ...(options.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit,
      skip: options.offset,
    })

    return rows.map((r) => ({
      id: r.id,
      orgId: r.orgId,
      recipientUserId: r.recipientUserId,
      type: r.type,
      sourceEventId: r.sourceEventId,
      itemId: r.itemId,
      spaceId: r.spaceId,
      titleSnapshot: r.titleSnapshot,
      actorUserId: r.actorUserId,
      readAt: r.readAt,
      createdAt: r.createdAt,
    }))
  }

  async markRead(id: string, recipientUserId: string): Promise<NotificationDto | null> {
    try {
      const row = await this.prisma.client.notification.update({
        where: {
          id,
          recipientUserId, // prevents marking another user's notification read
        },
        data: { readAt: new Date() },
      })

      return {
        id: row.id,
        orgId: row.orgId,
        recipientUserId: row.recipientUserId,
        type: row.type,
        sourceEventId: row.sourceEventId,
        itemId: row.itemId,
        spaceId: row.spaceId,
        titleSnapshot: row.titleSnapshot,
        actorUserId: row.actorUserId,
        readAt: row.readAt,
        createdAt: row.createdAt,
      }
    } catch {
      // P2025 = record not found or where clause unmatched
      return null
    }
  }
}
