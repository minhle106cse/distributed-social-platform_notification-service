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
  HttpCode,
} from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { ZodValidationPipe } from 'nestjs-zod'
import { CommandBus, QueryBus } from '@distributed-social-platform/shared-kernel'
import type { JwtPayload } from '@/infrastructure/http/guards/jwt-auth.guard'
import { JwtAuthGuard } from '@/infrastructure/http/guards/jwt-auth.guard'
import { MarkNotificationReadCommand } from '../application/commands/mark-notification-read/mark-notification-read.command'
import { GetNotificationsQuery } from '../application/queries/get-notifications/get-notifications.query'
import { getNotificationsSchema } from './schemas/get-notifications.schema'

type AuthRequest = FastifyRequest & { user: JwtPayload }

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async getNotifications(
    @Req() req: AuthRequest,
    @Headers('x-org-id') orgId: string,
    @Query(new ZodValidationPipe(getNotificationsSchema))
    query: ReturnType<typeof getNotificationsSchema.parse>,
  ) {
    if (!orgId) throw new NotFoundException('X-Org-Id header required')

    return this.queryBus.execute(
      new GetNotificationsQuery(orgId, req.user.sub, query.limit, query.offset, query.unreadOnly),
    )
  }

  @Patch(':id/read')
  @HttpCode(204)
  async markRead(@Req() req: AuthRequest, @Param('id') id: string): Promise<void> {
    await this.commandBus.execute(new MarkNotificationReadCommand(id, req.user.sub))
  }
}
