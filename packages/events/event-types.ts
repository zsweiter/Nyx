export enum ConnectionEventType {
	USER_CONNECTED = 'user_connected',
	USER_DISCONNECTED = 'user_disconnected',
	USER_ONLINE = 'user_online',
	USER_OFFLINE = 'user_offline',
	USER_TYPING_START = 'user_typing_start',
	USER_TYPING_STOP = 'user_typing_stop',
	HEARTBEAT = 'heartbeat',
	CONNECTION_LOST = 'connection_lost',
	RECONNECTED = 'reconnected',
}

export enum MessageEventType {
	MESSAGE_SEND = 'message:send',
	MESSAGE_SENT = 'message:sent',
	MESSAGE_INCOMING = 'message:incoming',
	MESSAGE_DELIVERED = 'message:delivered',
	MESSAGE_READ = 'message:read',
	MESSAGE_CHANGED_STATUS = 'message:changed_status',
	MESSAGE_FAILED = 'message:failed',
	MESSAGE_DELETED = 'message:deleted',
	MESSAGE_EDITED = 'message:edited',
	MESSAGE_FORWARDED = 'message:forwarded',
	MESSAGE_REPLIED = 'message:replied',
}

export enum ChatEventType {
	CHAT_CREATED = 'chat_created',
	CHAT_UPDATED = 'chat_updated',
	CHAT_DELETED = 'chat_deleted',
	CHAT_ARCHIVED = 'chat_archived',
	CHAT_UNARCHIVED = 'chat_unarchived',
	CHAT_MUTED = 'chat_muted',
	CHAT_UNMUTED = 'chat_unmuted',
	CHAT_PINNED = 'chat_pinned',
	CHAT_UNPINNED = 'chat_unpinned',
}

export enum GroupEventType {
	GROUP_CREATED = 'group_created',
	GROUP_UPDATED = 'group_updated',
	GROUP_DELETED = 'group_deleted',
	GROUP_JOINED = 'group_joined',
	GROUP_LEFT = 'group_left',
	GROUP_USER_ADDED = 'group_user_added',
	GROUP_USER_REMOVED = 'group_user_removed',
	GROUP_ADMIN_ADDED = 'group_admin_added',
	GROUP_ADMIN_REMOVED = 'group_admin_removed',
	GROUP_SUBJECT_CHANGED = 'group_subject_changed',
	GROUP_PHOTO_CHANGED = 'group_photo_changed',
}

export enum MediaEventType {
	MEDIA_UPLOAD_STARTED = 'media_upload_started',
	MEDIA_UPLOAD_COMPLETED = 'media_upload_completed',
	MEDIA_UPLOAD_FAILED = 'media_upload_failed',
	MEDIA_DOWNLOAD_STARTED = 'media_download_started',
	MEDIA_DOWNLOAD_COMPLETED = 'media_download_completed',
	MEDIA_DELETED = 'media_deleted',
	VOICE_MESSAGE_RECORDED = 'voice_message_recorded',
	VOICE_MESSAGE_PLAYED = 'voice_message_played',
}

export enum NotificationEventType {
	NOTIFICATION_SENT = 'notification_sent',
	NOTIFICATION_RECEIVED = 'notification_received',
	NOTIFICATION_READ = 'notification_read',
	NOTIFICATION_CLEARED = 'notification_cleared',
}

export enum UserEventType {
	USER_CREATED = 'user_created',
	USER_UPDATED = 'user_updated',
	USER_BLOCKED = 'user_blocked',
	USER_UNBLOCKED = 'user_unblocked',
	USER_REPORTED = 'user_reported',
	USER_PROFILE_PHOTO_UPDATED = 'user_profile_photo_updated',
	USER_STATUS_UPDATED = 'user_status_updated',
}

export enum SecurityEventType {
	SESSION_STARTED = 'session_started',
	SESSION_ENDED = 'session_ended',
	SESSION_EXPIRED = 'session_expired',
	DEVICE_LINKED = 'device_linked',
	DEVICE_UNLINKED = 'device_unlinked',
	TWO_FACTOR_ENABLED = 'two_factor_enabled',
	TWO_FACTOR_DISABLED = 'two_factor_disabled',
}

export enum ErrorEventType {
	ERROR_OCCURRED = 'error_occurred',
	RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
	SERVICE_UNAVAILABLE = 'service_unavailable',
	PERMISSION_DENIED = 'permission_denied',
	VALIDATION_FAILED = 'validation_failed',
}
