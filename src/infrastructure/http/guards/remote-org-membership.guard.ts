import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { FastifyRequest } from 'fastify'
import type { OrgPermissionValue } from '@distributed-social-platform/shared-kernel'
import type { JwtPayload } from './jwt-auth.guard'
import { MembershipVerificationClient } from '@/infrastructure/grpc/membership-verification.client'
import { ORG_PERMISSION_KEY } from '@/infrastructure/http/decorators/require-org-permission.decorator'

/**
 * "Remote" distinguishes this from core-api's OrgGuard: that one checks
 * membership against a LOCAL DB table, this one has no Membership table of
 * its own — notification-service has none — so it verifies over gRPC against
 * core-api instead. It also resolves permissions (same rule OrgGuard uses
 * locally, returned in the gRPC response) so a route CAN declare
 * @RequireOrgPermission if it ever needs role-gated access — none of
 * notification-service's routes do today (notifications are personal, scoped
 * to the caller's own recipientUserId regardless of role), so no controller
 * declares one; membership-only stays the effective check here, same
 * fallback default as OrgGuard when the decorator is omitted.
 *
 * X-Org-Id used to be trusted verbatim from the header, with only the
 * repository-level filter on (orgId, recipientUserId) preventing a cross-org
 * leak. That's a fragile accident of the current query shape, not a real
 * access-control guard — this guard closes the gap explicitly
 * (resilience_patterns.md), same pattern as search-service.
 *
 * Fails CLOSED: if core-api is unreachable (breaker open / gRPC error), the
 * request is rejected with 503 rather than silently allowed through.
 */
@Injectable()
export class RemoteOrgMembershipGuard implements CanActivate {
  constructor(
    private readonly membershipClient: MembershipVerificationClient,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: JwtPayload }>()

    const userId = request.user?.sub
    if (!userId) throw new UnauthorizedException()

    const orgId = request.headers['x-org-id'] as string | undefined
    if (!orgId) throw new ForbiddenException('X-Org-Id header is required')

    let result: { isMember: boolean; permissions: string[] }
    try {
      result = await this.membershipClient.checkMembership(orgId, userId)
    } catch {
      throw new ServiceUnavailableException('Unable to verify organization membership')
    }

    if (!result.isMember) throw new ForbiddenException('You are not a member of this organization')

    const requiredPermission = this.reflector.get<OrgPermissionValue>(
      ORG_PERMISSION_KEY,
      context.getHandler(),
    )
    if (requiredPermission && !result.permissions.includes(requiredPermission)) {
      throw new ForbiddenException(`Missing permission: ${requiredPermission}`)
    }

    return true
  }
}
