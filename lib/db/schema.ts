import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ===========================
// BETTER AUTH TABLES
// ===========================

export const authUser = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const authSession = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' }),
})

export const authAccount = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const authVerification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
})

// ===========================
// APP TABLES
// ===========================

export const meetingStatusEnum = pgEnum('meeting_status', [
  'pending',
  'recording',
  'processing',
  'completed',
  'failed',
])

export const meetingTypeEnum = pgEnum('meeting_type', [
  'one_on_one',
  'team_meeting',
  'standup',
  'interview',
  'client',
  'other',
])

export const teamRoleEnum = pgEnum('team_role', ['admin', 'member'])

export const meetingVisibilityEnum = pgEnum('meeting_visibility', [
  'private',
  'team',
  'public',
])

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(), // matches authUser.id
  email: text('email').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  consentGiven: boolean('consent_given').default(false).notNull(),
  consentAt: timestamp('consent_at', { withTimezone: true }),
  emailVerified: boolean('email_verified').default(false).notNull(),
  planType: text('plan_type').default('free').notNull(),
  preferredLanguage: text('preferred_language').default('en').notNull(), // User's preferred interface language
  transcriptionLanguage: text('transcription_language').default('auto').notNull(), // User's preferred transcription language
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export const teams = pgTable('teams', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    role: teamRoleEnum('role').default('member').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [uniqueIndex('team_members_team_user_idx').on(t.teamId, t.userId)]
)

export const folders = pgTable('folders', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon').default('📁').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export const meetings = pgTable('meetings', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
  folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  title: text('title').notNull().default('Untitled Meeting'),
  status: meetingStatusEnum('status').default('pending').notNull(),
  meetingType: meetingTypeEnum('meeting_type').default('other').notNull(),
  templateName: text('template_name'),
  visibility: meetingVisibilityEnum('visibility').default('private').notNull(),
  durationSeconds: integer('duration_seconds').default(0),
  detectedLanguage: text('detected_language').default('auto'), // Auto-detected language of the meeting
  audioStoragePath: text('audio_storage_path'),
  shareToken: text('share_token').unique(),
  templateId: uuid('template_id'),
  calendarEventId: text('calendar_event_id'),
  speakerMappings: jsonb('speaker_mappings').$type<Record<string, string>>(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export const transcriptSegments = pgTable(
  'transcript_segments',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    speaker: text('speaker'),
    content: text('content').notNull(),
    startMs: integer('start_ms').notNull(),
    endMs: integer('end_ms').notNull(),
    confidence: text('confidence'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [index('transcript_segments_meeting_id_idx').on(t.meetingId)]
)

export const notes = pgTable('notes', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  meetingId: uuid('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').default('Note').notNull(),
  content: text('content').default('').notNull(),
  summary: text('summary'),
  summaryStructured: text('summary_structured'),
  actionItems: text('action_items'),
  followUpEmail: text('follow_up_email'),
  aiProcessedAt: timestamp('ai_processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export const templates = pgTable('templates', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  content: text('content').notNull(),
  isBuiltIn: boolean('is_built_in').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export const meetingTranslations = pgTable(
  'meeting_translations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    language: text('language').notNull(), // e.g. 'hi', 'ur', 'gu'
    // JSON string: [{id, content}] — translated segment content (speaker labels preserved)
    transcript: text('transcript'),
    summary: text('summary'),
    summaryStructured: text('summary_structured'),
    actionItems: text('action_items'),
    followUpEmail: text('follow_up_email'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [uniqueIndex('meeting_translations_meeting_lang_idx').on(t.meetingId, t.language)]
)

export const usageTracking = pgTable('usage_tracking', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  billingPeriodStart: timestamp('billing_period_start', {
    withTimezone: true,
  }).notNull(),
  billingPeriodEnd: timestamp('billing_period_end', {
    withTimezone: true,
  }).notNull(),
  recordingMinutesUsed: integer('recording_minutes_used').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export const integrationProviderEnum = pgEnum('integration_provider', [
  'jira',
  'slack',
  'notion',
  'linear',
  'github',
])

export const userIntegrations = pgTable(
  'user_integrations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    provider: integrationProviderEnum('provider').notNull(),
    config: jsonb('config').notNull().$type<Record<string, string>>(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [uniqueIndex('user_integrations_user_provider_idx').on(t.userId, t.provider)]
)

export type Folder = typeof folders.$inferSelect
export type AuthUser = typeof authUser.$inferSelect
export type Profile = typeof profiles.$inferSelect
export type Team = typeof teams.$inferSelect
export type TeamMember = typeof teamMembers.$inferSelect
export type Meeting = typeof meetings.$inferSelect
export type TranscriptSegment = typeof transcriptSegments.$inferSelect
export type Note = typeof notes.$inferSelect
export type Template = typeof templates.$inferSelect
export type UsageTracking = typeof usageTracking.$inferSelect
export type UserIntegration = typeof userIntegrations.$inferSelect
export type MeetingTranslation = typeof meetingTranslations.$inferSelect
export type SpeakerMappings = Record<string, string>
