import { Injectable } from '@nestjs/common'
import { Prisma } from '@/generated'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'
import { dedupSkippedCounter } from '@/infrastructure/observability/notification.metrics'
import {
  Notification,
  type NotificationProps,
} from '@/modules/notification/domain/entities/notification.entity'
import type {
  INotificationRepository,
  InsertNotificationRow,
} from '@/modules/notification/domain/repositories/notification.repository'
import type {
  FindByRecipientOptions,
  INotificationQueryRepository,
} from '@/modules/notification/application/queries/notification.query-repository'
import type { NotificationDto } from '@/modules/notification/application/queries/notification.dto'

@Injectable()
export class PrismaNotificationRepository
  implements INotificationRepository, INotificationQueryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async insertMany(rows: InsertNotificationRow[]): Promise<void> {
    if (rows.length === 0) return

    const { count } = await this.prisma.client.notification.createMany({
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

    // count = rows actually inserted; the rest were deduped redeliveries.
    const skipped = rows.length - count
    if (skipped > 0) dedupSkippedCounter.inc(skipped)
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

  async findById(id: string, recipientUserId: string): Promise<Notification | null> {
    const row = await this.prisma.client.notification.findFirst({
      where: { id, recipientUserId }, // scoped to caller — prevents reading another user's notification
    })
    if (!row) return null

    return Notification.rehydrate(this.toProps(row))
  }

  async save(notification: Notification): Promise<void> {
    try {
      await this.prisma.client.notification.update({
        where: {
          id: notification.id,
          recipientUserId: notification.recipientUserId, // defense in depth, matches findById's scope
        },
        data: { readAt: notification.readAt },
      })
    } catch (err) {
      // P2025 = no row matched — the (id, recipientUserId) pair changed between
      // findById and save (concurrent delete/reassignment). Treat as not-found,
      // same as findById returning null.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return
      }
      throw err
    }
  }

  private toProps(row: {
    id: string
    orgId: string
    recipientUserId: string
    type: string
    sourceEventId: string
    itemId: string
    spaceId: string
    titleSnapshot: string
    actorUserId: string
    readAt: Date | null
    createdAt: Date
  }): NotificationProps {
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
  }
}
