import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getMeetingById, getNoteByMeetingId } from '@/lib/db/queries'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@notus.app'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meetingId } = await request.json()
  if (!meetingId) return NextResponse.json({ error: 'Missing meetingId' }, { status: 400 })

  const meeting = await getMeetingById(meetingId, session.user.id)
  if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const note = await getNoteByMeetingId(meetingId)
  const userEmail = session.user.email

  const notesHtml = note?.content || '<p style="color:#888">No notes recorded.</p>'

  const summaryText = note?.summary ?? null
  const actionItemsRaw = note?.actionItems ?? null
  let actionItemsList: string[] = []
  if (actionItemsRaw) {
    try { actionItemsList = JSON.parse(actionItemsRaw) } catch { actionItemsList = [] }
  }

  const meetingDate = new Date(meeting.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; color: #111;">
      <div style="padding: 32px 0 16px;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.08em;">Meeting Notes · Notus</p>
        <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #111;">${meeting.title}</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #888;">${meetingDate}</p>
      </div>

      ${summaryText ? `
      <div style="background: #f5f5f5; border-radius: 12px; padding: 20px 24px; margin: 16px 0;">
        <p style="margin: 0 0 10px; font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.08em;">Summary</p>
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #222;">${summaryText}</p>
      </div>` : ''}

      ${actionItemsList.length > 0 ? `
      <div style="margin: 20px 0;">
        <p style="margin: 0 0 10px; font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.08em;">Action Items</p>
        <ul style="margin: 0; padding-left: 20px;">
          ${actionItemsList.map((item) => `<li style="font-size: 14px; line-height: 1.7; color: #222; margin-bottom: 4px;">${item}</li>`).join('')}
        </ul>
      </div>` : ''}

      <div style="margin: 20px 0;">
        <p style="margin: 0 0 10px; font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.08em;">Notes</p>
        <div style="font-size: 14px; line-height: 1.8; color: #333;">${notesHtml}</div>
      </div>

      <div style="border-top: 1px solid #eee; padding-top: 16px; margin-top: 32px;">
        <p style="margin: 0; font-size: 12px; color: #aaa;">Sent from <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}" style="color: #0075de; text-decoration: none;">Notus</a></p>
      </div>
    </div>
  `

  try {
    await resend.emails.send({
      from: FROM,
      to: userEmail,
      subject: `Notes: ${meeting.title}`,
      html,
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[email/notes]', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
