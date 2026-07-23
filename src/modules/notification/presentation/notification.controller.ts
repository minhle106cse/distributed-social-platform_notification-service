import { Controller, Get, Patch, Param, Query, UseGuards, Req, Headers, HttpCode } from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { ZodValidationPipe } from 'nestjs-zod'
import { CommandBus, QueryBus } from '@distributed-social-platform/shared-kernel'
import type { JwtPayload } from '@/infrastructure/http/guards/jwt-auth.guard'
import { JwtAuthGuard } from '@/infrastructure/http/guards/jwt-auth.guard'
import { RemoteOrgMembershipGuard } from '@/infrastructure/http/guards/remote-org-membership.guard'
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

  // RemoteOrgMembershipGuard verifies X-Org-Id against core-api over gRPC before
  // this runs (notification-service has no local Membership table) — the
  // header itself is no longer trusted at face value (IDOR-class fix,
  // resilience_patterns.md). Presence + membership already validated by the
  // guard by the time this executes.
  @Get()
  @UseGuards(RemoteOrgMembershipGuard)
  async getNotifications(
    @Req() req: AuthRequest,
    @Headers('x-org-id') orgId: string,
    @Query(new ZodValidationPipe(getNotificationsSchema))
    query: ReturnType<typeof getNotificationsSchema.parse>,
  ) {
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
