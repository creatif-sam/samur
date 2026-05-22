import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET(request: Request) {
  try {
    // 1. Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const serviceSupabase = createServiceClient();

    // 2. Fetch all users
    const { data: { users }, error: usersError } = await serviceSupabase.auth.admin.listUsers();
    if (usersError || !users) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ ok: false, error: 'Failed to fetch users' });
    }

    // 3. Build date range: last 7 days
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://samur.gen116.com';
    const fromEmail = process.env.FROM_EMAIL || 'SamUr <noreply@samur.gen116.com>';

    let emailsSent = 0;

    for (const user of users) {
      if (!user.email) continue;

      // Planner: tasks and reflections for the week
      const { data: plannerDays } = await serviceSupabase
        .from('planner_days')
        .select('tasks, reflection, day')
        .eq('user_id', user.id)
        .gte('day', weekAgoStr)
        .lte('day', todayStr);

      const totalTasks = plannerDays?.reduce(
        (acc, d) => acc + (Array.isArray(d.tasks) ? d.tasks.length : 0),
        0
      ) ?? 0;
      const daysWithReflections = plannerDays?.filter(
        d => typeof d.reflection === 'string' && d.reflection.trim().length > 0
      ).length ?? 0;

      // Goals created this week
      const { count: goalsCreated } = await serviceSupabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString());

      // Goals completed this week
      const { count: goalsCompleted } = await serviceSupabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('updated_at', weekAgo.toISOString());

      // Meditations this week
      const { count: meditationsCount } = await serviceSupabase
        .from('meditations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString());

      // Unread notifications
      const { count: unreadCount } = await serviceSupabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      const displayName =
        (user.user_metadata?.full_name as string | undefined) ||
        user.email.split('@')[0];

      const html = buildWeeklySummaryEmail({
        displayName,
        totalTasks,
        daysWithReflections,
        goalsCreated: goalsCreated ?? 0,
        goalsCompleted: goalsCompleted ?? 0,
        meditationsCount: meditationsCount ?? 0,
        unreadCount: unreadCount ?? 0,
        appUrl,
        weekStart: weekAgoStr,
        weekEnd: todayStr,
      });

      await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: `Your Weekly Summary 📊 — ${weekAgoStr} to ${todayStr}`,
        html,
      });

      emailsSent++;
    }

    return NextResponse.json({ ok: true, sent: emailsSent });
  } catch (err: any) {
    console.error('Weekly summary cron error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Email template
// ─────────────────────────────────────────────────────────────────────────────

interface SummaryData {
  displayName: string;
  totalTasks: number;
  daysWithReflections: number;
  goalsCreated: number;
  goalsCompleted: number;
  meditationsCount: number;
  unreadCount: number;
  appUrl: string;
  weekStart: string;
  weekEnd: string;
}

function buildWeeklySummaryEmail(d: SummaryData): string {
  const year = new Date().getFullYear();

  const unreadBanner = d.unreadCount > 0
    ? `<tr>
        <td style="padding:0 32px 16px;">
          <div style="background:#fef3c7;border-radius:10px;padding:14px 18px;font-size:14px;color:#92400e;">
            📬 You have <strong>${d.unreadCount} unread notification${d.unreadCount !== 1 ? 's' : ''}</strong> waiting for you.
          </div>
        </td>
       </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Weekly Summary</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">SamUr 🤍</h1>
              <p style="margin:8px 0 0;color:#e0e7ff;font-size:16px;">Your Weekly Summary</p>
              <p style="margin:4px 0 0;color:#c4b5fd;font-size:13px;">${d.weekStart} — ${d.weekEnd}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 32px 16px;">
              <p style="margin:0;font-size:18px;color:#1e1b4b;font-weight:600;">Hello, ${d.displayName}! 👋</p>
              <p style="margin:8px 0 0;font-size:15px;color:#6b7280;line-height:1.6;">
                Here's a snapshot of your week. Keep up the great work!
              </p>
            </td>
          </tr>

          <!-- Stats grid -->
          <tr>
            <td style="padding:16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" style="background:#f0fdf4;border-radius:12px;padding:20px;text-align:center;vertical-align:top;">
                    <div style="font-size:36px;font-weight:800;color:#16a34a;">${d.totalTasks}</div>
                    <div style="font-size:13px;color:#4b5563;margin-top:4px;">Planner Tasks</div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background:#eff6ff;border-radius:12px;padding:20px;text-align:center;vertical-align:top;">
                    <div style="font-size:36px;font-weight:800;color:#2563eb;">${d.daysWithReflections}</div>
                    <div style="font-size:13px;color:#4b5563;margin-top:4px;">Evening Reflections</div>
                  </td>
                </tr>
                <tr><td colspan="3" style="height:12px;"></td></tr>
                <tr>
                  <td width="48%" style="background:#fdf4ff;border-radius:12px;padding:20px;text-align:center;vertical-align:top;">
                    <div style="font-size:36px;font-weight:800;color:#9333ea;">${d.meditationsCount}</div>
                    <div style="font-size:13px;color:#4b5563;margin-top:4px;">Meditations</div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background:#fff7ed;border-radius:12px;padding:20px;text-align:center;vertical-align:top;">
                    <div style="font-size:36px;font-weight:800;color:#ea580c;">${d.goalsCompleted}</div>
                    <div style="font-size:13px;color:#4b5563;margin-top:4px;">Goals Completed</div>
                  </td>
                </tr>
                <tr><td colspan="3" style="height:12px;"></td></tr>
                <tr>
                  <td colspan="3" style="background:#f0f9ff;border-radius:12px;padding:20px;text-align:center;vertical-align:top;">
                    <div style="font-size:36px;font-weight:800;color:#0284c7;">${d.goalsCreated}</div>
                    <div style="font-size:13px;color:#4b5563;margin-top:4px;">New Goals Created</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${unreadBanner}

          <!-- CTA -->
          <tr>
            <td style="padding:16px 32px 40px;text-align:center;">
              <a href="${d.appUrl}/protected"
                style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;">
                Open SamUr →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because you have a SamUr account.<br/>
                © ${year} SamUr. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
