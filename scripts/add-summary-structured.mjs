import postgres from 'postgres'

const sql = postgres('postgresql://postgres.pousfygeptvpfreivyvr:VomA5YSlTkjzJM6j@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres', { max: 1 })
await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS summary_structured text`
console.log('Column summary_structured added successfully')
await sql.end()
