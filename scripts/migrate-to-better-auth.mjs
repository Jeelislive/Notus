import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, { ssl: 'require' })

async function run() {
  console.log('Running Better Auth migration...')

  // Drop old Supabase auth triggers
  await sql`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`
  await sql`DROP FUNCTION IF EXISTS public.handle_new_user()`

  // Drop app tables (no user data yet, safe to recreate)
  await sql`DROP TABLE IF EXISTS usage_tracking CASCADE`
  await sql`DROP TABLE IF EXISTS templates CASCADE`
  await sql`DROP TABLE IF EXISTS notes CASCADE`
  await sql`DROP TABLE IF EXISTS transcript_segments CASCADE`
  await sql`DROP TABLE IF EXISTS meetings CASCADE`
  await sql`DROP TABLE IF EXISTS team_members CASCADE`
  await sql`DROP TABLE IF EXISTS teams CASCADE`
  await sql`DROP TABLE IF EXISTS profiles CASCADE`

  // Drop Better Auth tables if re-running
  await sql`DROP TABLE IF EXISTS verification CASCADE`
  await sql`DROP TABLE IF EXISTS account CASCADE`
  await sql`DROP TABLE IF EXISTS session CASCADE`
  await sql`DROP TABLE IF EXISTS "user" CASCADE`

  // Better Auth: user
  await sql`
    CREATE TABLE "user" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      "emailVerified" BOOLEAN NOT NULL DEFAULT false,
      image TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    )
  `

  // Better Auth: session
  await sql`
    CREATE TABLE session (
      id TEXT PRIMARY KEY,
      "expiresAt" TIMESTAMP NOT NULL,
      token TEXT NOT NULL UNIQUE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
    )
  `

  // Better Auth: account
  await sql`
    CREATE TABLE account (
      id TEXT PRIMARY KEY,
      "accountId" TEXT NOT NULL,
      "providerId" TEXT NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      "accessToken" TEXT,
      "refreshToken" TEXT,
      "idToken" TEXT,
      "accessTokenExpiresAt" TIMESTAMP,
      "refreshTokenExpiresAt" TIMESTAMP,
      scope TEXT,
      password TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    )
  `

  // Better Auth: verification
  await sql`
    CREATE TABLE verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      "expiresAt" TIMESTAMP NOT NULL,
      "createdAt" TIMESTAMP,
      "updatedAt" TIMESTAMP
    )
  `

  // App: profiles (TEXT id now)
  await sql`
    CREATE TABLE profiles (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      full_name TEXT,
      avatar_url TEXT,
      consent_given BOOLEAN NOT NULL DEFAULT false,
      consent_at TIMESTAMPTZ,
      email_verified BOOLEAN NOT NULL DEFAULT false,
      plan_type TEXT NOT NULL DEFAULT 'free',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE team_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role team_role NOT NULL DEFAULT 'member',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(team_id, user_id)
    )
  `

  await sql`
    CREATE TABLE meetings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
      title TEXT NOT NULL DEFAULT 'Untitled Meeting',
      status meeting_status NOT NULL DEFAULT 'pending',
      visibility meeting_visibility NOT NULL DEFAULT 'private',
      duration_seconds INTEGER DEFAULT 0,
      audio_storage_path TEXT,
      share_token TEXT UNIQUE,
      template_id UUID,
      calendar_event_id TEXT,
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE transcript_segments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
      speaker TEXT,
      content TEXT NOT NULL,
      start_ms INTEGER NOT NULL,
      end_ms INTEGER NOT NULL,
      confidence TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`CREATE INDEX transcript_segments_meeting_id_idx ON transcript_segments(meeting_id)`

  await sql`
    CREATE TABLE notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meeting_id UUID NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      content TEXT NOT NULL DEFAULT '',
      summary TEXT,
      action_items TEXT,
      follow_up_email TEXT,
      ai_processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
      team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      is_built_in BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE usage_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      billing_period_start TIMESTAMPTZ NOT NULL,
      billing_period_end TIMESTAMPTZ NOT NULL,
      recording_minutes_used INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  console.log('✓ Migration complete')
  await sql.end()
}

run().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
