import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
  Headers,
  NotFoundException,
} from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { ZodValidationPipe } from 'nestjs-zod'
import type { JwtPayload } from '@/infrastructure/http/guards/jwt-auth.guard'
import { JwtAuthGuard } from '@/infrastructure/http/guards/jwt-auth.guard'
import type { INotificationRepository } from '../application/repositories/notification.repository.interface'
import { NOTIFICATION_REPOSITORY } from '../application/repositories/notification.repository.interface'
import { getNotificationsSchema } from './schemas/get-notifications.schema'
import { Inject } from '@nestjs/common'

type AuthRequest = FastifyRequest & { user: JwtPayload }

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: INotificationRepository,
  ) {}

  @Get()
  async getNotifications(
    @Req() req: AuthRequest,
    @Headers('x-org-id') orgId: string,
    @Query(new ZodValidationPipe(getNotificationsSchema))
    query: ReturnType<typeof getNotificationsSchema.parse>,
  ) {
    if (!orgId) throw new NotFoundException('X-Org-Id header required')

    return this.notificationRepo.findByRecipient(orgId, req.user.sub, {
      limit: query.limit,
      offset: query.offset,
      unreadOnly: query.unreadOnly,
    })
  }

  @Patch(':id/read')
  async markRead(@Req() req: AuthRequest, @Param('id') id: string) {
    const notification = await this.notificationRepo.markRead(id, req.user.sub)
    if (!notification) throw new NotFoundException('Notification not found')
    return notification
  }
}
