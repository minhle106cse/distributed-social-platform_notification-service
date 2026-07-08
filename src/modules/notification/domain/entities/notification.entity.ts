export interface NotificationProps {
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
}

export class Notification {
  private _id: string
  private _orgId: string
  private _recipientUserId: string
  private _type: string
  private _sourceEventId: string
  private _itemId: string
  private _spaceId: string
  private _titleSnapshot: string
  private _actorUserId: string
  private _readAt: Date | null
  private _createdAt: Date

  private constructor(props: NotificationProps) {
    this._id = props.id
    this._orgId = props.orgId
    this._recipientUserId = props.recipientUserId
    this._type = props.type
    this._sourceEventId = props.sourceEventId
    this._itemId = props.itemId
    this._spaceId = props.spaceId
    this._titleSnapshot = props.titleSnapshot
    this._actorUserId = props.actorUserId
    this._readAt = props.readAt ? new Date(props.readAt.getTime()) : null
    this._createdAt = new Date(props.createdAt.getTime())
  }

  /** Rows are always born via the fan-out bulk insert (item-published handler) — rehydrate is the only entry point here. */
  static rehydrate(props: NotificationProps): Notification {
    return new Notification(props)
  }

  /**
   * Idempotent transition: a redelivered MarkNotificationReadCommand (retry,
   * double-click) must not bump `readAt` on an already-read notification.
   * Returns whether this call actually changed state, so the handler can skip
   * the write entirely when it didn't.
   */
  markAsRead(): boolean {
    if (this._readAt) return false
    this._readAt = new Date()
    return true
  }

  get id(): string {
    return this._id
  }
  get orgId(): string {
    return this._orgId
  }
  get recipientUserId(): string {
    return this._recipientUserId
  }
  get type(): string {
    return this._type
  }
  get sourceEventId(): string {
    return this._sourceEventId
  }
  get itemId(): string {
    return this._itemId
  }
  get spaceId(): string {
    return this._spaceId
  }
  get titleSnapshot(): string {
    return this._titleSnapshot
  }
  get actorUserId(): string {
    return this._actorUserId
  }
  get readAt(): Date | null {
    return this._readAt ? new Date(this._readAt.getTime()) : null
  }
  get createdAt(): Date {
    return new Date(this._createdAt.getTime())
  }
}
