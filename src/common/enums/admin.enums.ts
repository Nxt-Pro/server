export enum UserRole {
  PLAYER = 'player',
  SCOUT = 'scout',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum ReportType {
  USER = 'user',
  EVENT = 'event',
  MESSAGE = 'message',
  CONTENT = 'content',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum ReportSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ScoutVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum AuditLogAction {
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_BANNED = 'user_banned',
  USER_SUSPENDED = 'user_suspended',
  USER_VERIFIED = 'user_verified',
  USER_STATUS_CHANGED = 'user_status_changed',
  EVENT_CREATED = 'event_created',
  EVENT_UPDATED = 'event_updated',
  EVENT_DELETED = 'event_deleted',
  EVENT_APPROVED = 'event_approved',
  EVENT_REJECTED = 'event_rejected',
  EVENT_STATUS_CHANGED = 'event_status_changed',
  REGISTRATION_APPROVED = 'registration_approved',
  REGISTRATION_REJECTED = 'registration_rejected',
  REGISTRATION_CANCELLED = 'registration_cancelled',
  REPORT_CREATED = 'report_created',
  REPORT_RESOLVED = 'report_resolved',
  REPORT_DISMISSED = 'report_dismissed',
  ADMIN_ACTION = 'admin_action',
  SYSTEM_EVENT = 'system_event',
}

export enum AnalyticsPeriod {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  ONE_YEAR = '1y',
}

export enum AnalyticsGranularity {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
