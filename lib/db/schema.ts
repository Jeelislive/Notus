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
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const meetingStatusEnum = pgEnum('meeting_status', [
  'pending',
  'recording',
  'processing',
  'completed',
  'failed',
])

export const teamRoleEnum = pgEnum('team_role', ['admin', 'member'])

export const meetingVisibilityEnum = pgEnum('meeting_visibility', [
  'private',
  'team',
  'public',
])

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // matches auth.users.id
  email: text('email').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  consentGiven: boolean('consent_given').default(false).notNull(),
  consentAt: timestamp('consent_at', { withTimezone: true }),
  emailVerified: boolean('email_verified').default(false).notNull(),
  planType: text('plan_type').default('free').notNull(),
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
  ownerId: uuid('owner_id')
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
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    role: teamRoleEnum('role').default('member').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [uniqueIndex('team_members_team_user_idx').on(t.teamId, t.userId)]
)

export const meetings = pgTable('meetings', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
  title: text('title').notNull().default('Untitled Meeting'),
  status: meetingStatusEnum('status').default('pending').notNull(),
  visibility: meetingVisibilityEnum('visibility').default('private').notNull(),
  durationSeconds: integer('duration_seconds').default(0),
  audioStoragePath: text('audio_storage_path'),
  shareToken: text('share_token').unique(),
  templateId: uuid('template_id'),
  calendarEventId: text('calendar_event_id'),
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
    .unique()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  content: text('content').default('').notNull(),
  summary: text('summary'),
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
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  content: text('content').notNull(),
  isBuiltIn: boolean('is_built_in').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export const usageTracking = pgTable('usage_tracking', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
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

export type Profile = typeof profiles.$inferSelect
export type Team = typeof teams.$inferSelect
export type TeamMember = typeof teamMembers.$inferSelect
export type Meeting = typeof meetings.$inferSelect
export type TranscriptSegment = typeof transcriptSegments.$inferSelect
export type Note = typeof notes.$inferSelect
export type Template = typeof templates.$inferSelect
export type UsageTracking = typeof usageTracking.$inferSelect
