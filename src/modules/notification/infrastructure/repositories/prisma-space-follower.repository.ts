import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infrastructure/database/prisma/prisma.service";
import type {
  ISpaceFollowerRepository,
  UpsertSpaceFollowerRow,
} from "../../application/repositories/space-follower.repository.interface";

@Injectable()
export class PrismaSpaceFollowerRepository implements ISpaceFollowerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(row: UpsertSpaceFollowerRow): Promise<void> {
    await this.prisma.client.spaceFollower.upsert({
      where: { spaceId_userId: { spaceId: row.spaceId, userId: row.userId } },
      create: { orgId: row.orgId, spaceId: row.spaceId, userId: row.userId },
      update: {},
    });
  }

  async remove(spaceId: string, userId: string): Promise<void> {
    await this.prisma.client.spaceFollower.deleteMany({
      where: { spaceId, userId },
    });
  }

  async findFollowerIds(orgId: string, spaceId: string): Promise<string[]> {
    const rows = await this.prisma.client.spaceFollower.findMany({
      where: { orgId, spaceId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }
}
