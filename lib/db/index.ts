import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Global singleton prevents Next.js HMR from creating a new pool on every hot reload.
// Without this, dev mode blows past Supabase free tier's ~20 connection limit.
declare global {
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined
}

const connectionString = process.env.DATABASE_URL!

const client =
  globalThis.__pgClient ??
  postgres(connectionString, {
    prepare: false,  // required for pgBouncer / Supabase transaction pooler
    max: 10,         // enough for concurrent requests without exhausting Supabase free tier
    idle_timeout: 20,
    connect_timeout: 10,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgClient = client
}

export const db = drizzle(client, { schema })
