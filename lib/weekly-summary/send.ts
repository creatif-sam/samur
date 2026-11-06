import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { buildWeeklySummaryEmail } from './email'
import { collectWeeklyData, type SummaryUser } from './stats'

export const SITE_URL = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://mastery.samuelgyasi.com'
export const FROM_EMAIL = () => process.env.FROM_EMAIL || 'SamUr <noreply@mastery.samuelgyasi.com>'

export type SendOutcome = { ok: true; id?: string } | { ok: false; error: string }

// Builds one person's summary and sends it. Resend reports a rejected send (unverified domain,
// bad key, invalid address) in `error` instead of throwing, so that is checked explicitly.
export async function sendWeeklySummary(resend: Resend, service: SupabaseClient, user: SummaryUser): Promise<SendOutcome> {
  if (!user.email) return { ok: false, error: 'No email address on the account' }
  try {
    const appUrl = SITE_URL()
    const data = await collectWeeklyData(service, user)
    const { subject, html, text } = buildWeeklySummaryEmail(data, appUrl)
    const { data: sent, error } = await resend.emails.send({
      from: FROM_EMAIL(),
      to: user.email,
      subject,
      html,
      text,
      headers: { 'List-Unsubscribe': `<${appUrl}/protected/profile>` },
    })
    if (error) return { ok: false, error: `${error.name}: ${error.message}` }
    return { ok: true, id: sent?.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
