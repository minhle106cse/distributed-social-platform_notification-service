export interface UpsertSpaceFollowerRow {
  orgId: string
  spaceId: string
  userId: string
}

export const SPACE_FOLLOWER_REPOSITORY = Symbol('SPACE_FOLLOWER_REPOSITORY')

export interface ISpaceFollowerRepository {
  upsert(row: UpsertSpaceFollowerRow): Promise<void>
  remove(spaceId: string, userId: string): Promise<void>
  findFollowerIds(orgId: string, spaceId: string): Promise<string[]>
}
