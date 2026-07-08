export interface UpsertSpaceFollowerRow {
  orgId: string
  spaceId: string
  userId: string
}

/**
 * Repository for the `space_followers` local projection — a flat join
 * (spaceId↔userId) maintained purely from FOLLOW integration events. It has no
 * domain behaviour/invariant of its own, so there is no SpaceFollower entity.
 * upsert/remove are the write side (FollowCreated/FollowRemoved handlers);
 * findFollowerIds is an internal read used by the fan-out (ItemPublished
 * handler), NOT an HTTP query-side read — hence it lives with the write model in
 * domain/repositories, alongside notification.repository.ts.
 */
export interface ISpaceFollowerRepository {
  upsert(row: UpsertSpaceFollowerRow): Promise<void>
  remove(spaceId: string, userId: string): Promise<void>
  findFollowerIds(orgId: string, spaceId: string): Promise<string[]>
}

export const SPACE_FOLLOWER_REPOSITORY = Symbol('SPACE_FOLLOWER_REPOSITORY')
