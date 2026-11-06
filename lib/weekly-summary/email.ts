import { parseDateKey } from '@/lib/dates'
import type { GoalLine, RangeStats, WeeklyData } from './stats'

export function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const fmtMinutes = (mins: number) => {
  const m = Math.round(mins)
  if (m < 60) return `${m}m`
  return m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`
}
const shortDate = (key: string) => parseDateKey(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const weekday = (key: string, style: 'narrow' | 'short' = 'narrow') => parseDateKey(key).toLocaleDateString('en-US', { weekday: style })
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// ── The one-line story of the week ────────────────────────────────────────────

export function headline(d: WeeklyData): { title: string; sub: string } {
  const c = d.current
  const p = d.previous
  const active = c.activeDays.size
  if (active === 0 && c.tasksDone === 0) {
    return { title: 'A quiet week', sub: 'Nothing logged, and that is okay. A fresh week starts today, and one small step is enough.' }
  }
  if (active >= d.days.length) {
    return { title: 'Seven for seven', sub: 'You showed up every single day this week. That is how mastery is built.' }
  }
  const wins = [
    { gain: c.prayerMinutes - p.prayerMinutes, min: 10, title: (g: number) => `Prayer grew by ${fmtMinutes(g)}`, sub: `${fmtMinutes(c.prayerMinutes)} in prayer, up from ${fmtMinutes(p.prayerMinutes)} the week before.` },
    { gain: c.bibleChapters - p.bibleChapters, min: 3, title: (g: number) => `${plural(g, 'more chapter')} of Scripture`, sub: `${plural(c.bibleChapters, 'chapter')} read this week, against ${p.bibleChapters} last week.` },
    { gain: c.readingPages - p.readingPages, min: 20, title: (g: number) => `${g} more pages read`, sub: `${c.readingPages} pages this week, against ${p.readingPages} last week.` },
    { gain: c.tasksDone - p.tasksDone, min: 3, title: (g: number) => `${plural(g, 'more task')} finished`, sub: `${c.tasksDone} of ${c.totalTasks} planned tasks done.` },
  ]
  const best = wins.filter(w => w.gain >= w.min).sort((a, b) => b.gain / b.min - a.gain / a.min)[0]
  if (best) return { title: best.title(best.gain), sub: best.sub }
  const prayerDays = Object.keys(c.prayerByDay).length
  if (prayerDays >= 5) return { title: `Faithful in prayer`, sub: `You prayed on ${prayerDays} of ${d.days.length} days. Steady wins.` }
  return { title: `${active} of ${d.days.length} days with something done`, sub: 'Look at the week below, and pick one thing to build on.' }
}

// ── Pieces ────────────────────────────────────────────────────────────────────

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const SERIF = "Georgia,'Times New Roman',serif"

function delta(cur: number, prev: number, format: (n: number) => string = n => String(n)) {
  const diff = cur - prev
  if (cur === 0 && prev === 0) return { text: 'no change', color: '#9ca3af' }
  if (diff === 0) return { text: 'same as last week', color: '#9ca3af' }
  return diff > 0
    ? { text: `▲ ${format(diff)} vs last week`, color: '#15803d' }
    : { text: `▼ ${format(-diff)} vs last week`, color: '#b45309' }
}

function statTile(o: { label: string; value: string; note?: string; cur: number; prev: number; format?: (n: number) => string; accent: string; bg: string }) {
  const dl = delta(o.cur, o.prev, o.format)
  return `<td width="50%" valign="top" style="padding:6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${o.bg}" style="background-color:${o.bg};border-radius:16px;">
      <tr><td style="padding:16px 16px 14px;">
        <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${o.accent};">${o.label}</div>
        <div style="font-family:${SERIF};font-size:32px;line-height:38px;font-weight:700;color:#1e1b4b;margin-top:4px;">${o.value}</div>
        ${o.note ? `<div style="font-family:${FONT};font-size:12px;color:#6b7280;margin-top:1px;">${o.note}</div>` : ''}
        <div style="font-family:${FONT};font-size:12px;font-weight:600;color:${dl.color};margin-top:6px;">${dl.text}</div>
      </td></tr>
    </table>
  </td>`
}

function activeDaysStrip(d: WeeklyData) {
  const cells = d.days.map(day => {
    const on = d.current.activeDays.has(day)
    return `<td align="center" style="padding:0 3px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="34" height="34" align="center" valign="middle" bgcolor="${on ? '#6d28d9' : '#ede9fe'}"
          style="background-color:${on ? '#6d28d9' : '#ede9fe'};border-radius:17px;font-family:${FONT};font-size:14px;font-weight:700;color:${on ? '#ffffff' : '#a78bfa'};">${on ? '✓' : '·'}</td>
      </tr></table>
      <div style="font-family:${FONT};font-size:11px;font-weight:600;color:#9ca3af;margin-top:5px;">${weekday(day)}</div>
    </td>`
  }).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`
}

// Bar chart from table cells: no images, no CSS that email clients drop
function prayerBars(d: WeeklyData) {
  const mins = d.days.map(day => Math.round(d.current.prayerByDay[day] ?? 0))
  const max = Math.max(60, ...mins)
  const barColor = (m: number) => (m >= 60 ? '#22c55e' : m >= 30 ? '#f59e0b' : '#ef4444')
  const cols = d.days.map((day, i) => {
    const m = mins[i]
    const h = m === 0 ? 4 : Math.max(8, Math.round((m / max) * 84))
    return `<td align="center" valign="bottom" style="padding:0 3px;">
      <div style="font-family:${FONT};font-size:10px;font-weight:700;color:#6b7280;height:14px;line-height:14px;">${m > 0 ? m : ''}</div>
      <table role="presentation" width="26" cellpadding="0" cellspacing="0" style="margin-top:3px;"><tr>
        <td height="${h}" bgcolor="${m === 0 ? '#e5e7eb' : barColor(m)}" style="height:${h}px;background-color:${m === 0 ? '#e5e7eb' : barColor(m)};border-radius:6px;font-size:0;line-height:0;">&nbsp;</td>
      </tr></table>
      <div style="font-family:${FONT};font-size:11px;font-weight:600;color:#9ca3af;margin-top:5px;">${weekday(day)}</div>
    </td>`
  }).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cols}</tr></table>
  <div style="font-family:${FONT};font-size:11px;color:#9ca3af;margin-top:10px;text-align:center;">minutes prayed each day &nbsp;·&nbsp; <span style="color:#22c55e;">●</span> 60+ &nbsp;<span style="color:#f59e0b;">●</span> 30–59 &nbsp;<span style="color:#ef4444;">●</span> under 30</div>`
}

function card(inner: string, title?: string) {
  return `<tr><td style="padding:6px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="background-color:#ffffff;border-radius:20px;border:1px solid #ece8f7;">
      <tr><td style="padding:20px;">
        ${title ? `<div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#7c3aed;margin-bottom:14px;">${title}</div>` : ''}
        ${inner}
      </td></tr>
    </table>
  </td></tr>`
}

function goalRows(goals: GoalLine[], tone: 'normal' | 'late') {
  return goals.map(g => `<tr>
    <td style="padding:8px 0;border-top:1px solid #f1eefb;font-family:${FONT};font-size:14px;color:#1f2937;">${escapeHtml(g.title)}</td>
    <td align="right" style="padding:8px 0 8px 12px;border-top:1px solid #f1eefb;font-family:${FONT};font-size:12px;font-weight:600;white-space:nowrap;color:${tone === 'late' ? '#b91c1c' : '#6b7280'};">${tone === 'late' ? 'was due ' : ''}${shortDate(g.due)}</td>
  </tr>`).join('')
}

function alsoLines(c: RangeStats) {
  const items: string[] = []
  if (c.meditations) items.push(`📖 ${plural(c.meditations, 'meditation')} written`)
  if (c.reflections) items.push(`🌙 ${plural(c.reflections, 'evening reflection')}`)
  if (c.versesChosen) items.push(`🧠 ${plural(c.versesChosen, 'memory verse')}${c.versesMemorized ? `, ${c.versesMemorized} memorized` : ''}`)
  if (c.posts) items.push(`💬 ${plural(c.posts, 'post')} shared`)
  if (c.prayersAnswered) items.push(`🙌 ${plural(c.prayersAnswered, 'prayer')} answered. Praise God!`)
  return items
}

// ── The email ─────────────────────────────────────────────────────────────────

export function buildWeeklySummaryEmail(d: WeeklyData, appUrl: string): { subject: string; html: string; text: string } {
  const c = d.current
  const p = d.previous
  const story = headline(d)
  const range = `${shortDate(d.weekStart)} – ${shortDate(d.weekEnd)}`
  const name = escapeHtml(d.displayName)
  const prayerDays = Object.keys(c.prayerByDay).length
  const taskPct = c.totalTasks > 0 ? Math.round((c.tasksDone / c.totalTasks) * 100) : 0
  const goalPct = c.goalsDue > 0 ? Math.round((c.goalsDueDone / c.goalsDue) * 100) : 0
  const also = alsoLines(c)
  const settingsUrl = `${appUrl}/protected/profile`

  const preheader = `${story.title}. ${fmtMinutes(c.prayerMinutes)} in prayer, ${plural(c.bibleChapters, 'chapter')} read, ${c.tasksDone} tasks done.`

  const goalsBody = `
    ${c.goalsDue > 0 ? `
      <div style="font-family:${FONT};font-size:15px;color:#1f2937;"><strong>${c.goalsDueDone} of ${c.goalsDue}</strong> goals due this week are done.</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 4px;"><tr>
        <td width="${Math.max(goalPct, 1)}%" height="8" bgcolor="#6d28d9" style="height:8px;background-color:#6d28d9;border-radius:4px;font-size:0;line-height:0;">&nbsp;</td>
        <td width="${Math.max(100 - goalPct, 1)}%" height="8" bgcolor="#ede9fe" style="height:8px;background-color:#ede9fe;font-size:0;line-height:0;">&nbsp;</td>
      </tr></table>` : `<div style="font-family:${FONT};font-size:14px;color:#6b7280;">No goals were due this week.</div>`}
    ${d.overdueCount > 0 ? `
      <div style="font-family:${FONT};font-size:13px;font-weight:700;color:#b91c1c;margin-top:16px;">⚠ ${plural(d.overdueCount, 'goal')} overdue</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${goalRows(d.overdueGoals, 'late')}</table>` : ''}
    ${d.nextWeekGoalCount > 0 ? `
      <div style="font-family:${FONT};font-size:13px;font-weight:700;color:#4c1d95;margin-top:16px;">Coming up this week (${d.nextWeekGoalCount})</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${goalRows(d.nextWeekGoals, 'normal')}</table>
      ${d.nextWeekGoalCount > d.nextWeekGoals.length ? `<div style="font-family:${FONT};font-size:12px;color:#9ca3af;margin-top:6px;">and ${d.nextWeekGoalCount - d.nextWeekGoals.length} more</div>` : ''}` : ''}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Your week, ${range}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1fb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f1fb;font-size:1px;line-height:1px;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f1fb" style="background-color:#f4f1fb;">
<tr><td align="center" style="padding:24px 8px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">

  <!-- Header -->
  <tr><td bgcolor="#4c1d95" style="background-color:#4c1d95;background-image:linear-gradient(135deg,#2e1065 0%,#6d28d9 100%);border-radius:24px 24px 0 0;padding:28px 28px 26px;">
    <div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:3px;color:#fcd34d;">MASTERY · WEEKLY</div>
    <div style="font-family:${FONT};font-size:13px;color:#c4b5fd;margin-top:6px;">${range}</div>
    <div style="font-family:${FONT};font-size:15px;color:#ede9fe;margin-top:22px;">Hi ${name},</div>
    <div style="font-family:${SERIF};font-size:30px;line-height:36px;font-weight:700;color:#ffffff;margin-top:6px;">${escapeHtml(story.title)}</div>
    <div style="font-family:${FONT};font-size:14px;line-height:21px;color:#ddd6fe;margin-top:8px;">${escapeHtml(story.sub)}</div>
  </td></tr>
  <tr><td height="14" style="font-size:0;line-height:0;">&nbsp;</td></tr>

  ${card(`${activeDaysStrip(d)}
    <div style="font-family:${FONT};font-size:13px;color:#6b7280;text-align:center;margin-top:14px;"><strong style="color:#4c1d95;">${c.activeDays.size} of ${d.days.length}</strong> days with something done${p.activeDays.size ? ` &nbsp;·&nbsp; last week ${p.activeDays.size}` : ''}</div>`, 'Days you showed up')}

  <!-- Numbers -->
  <tr><td style="padding:0 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${statTile({ label: '🙏 Prayer', value: fmtMinutes(c.prayerMinutes), note: `${plural(prayerDays, 'day')} prayed`, cur: c.prayerMinutes, prev: p.prayerMinutes, format: fmtMinutes, accent: '#7c3aed', bg: '#f5f3ff' })}
        ${statTile({ label: '✝ Scripture', value: String(c.bibleChapters), note: c.bibleChapters === 1 ? 'chapter read' : 'chapters read', cur: c.bibleChapters, prev: p.bibleChapters, accent: '#b45309', bg: '#fffbeb' })}
      </tr>
      <tr>
        ${statTile({ label: '📚 Reading', value: String(c.readingPages), note: c.readingPages === 1 ? 'page read' : 'pages read', cur: c.readingPages, prev: p.readingPages, accent: '#0369a1', bg: '#f0f9ff' })}
        ${statTile({ label: '✅ Tasks', value: `${c.tasksDone}/${c.totalTasks}`, note: c.totalTasks > 0 ? `${taskPct}% done` : 'none planned', cur: c.tasksDone, prev: p.tasksDone, accent: '#15803d', bg: '#f0fdf4' })}
      </tr>
    </table>
  </td></tr>
  <tr><td height="6" style="font-size:0;line-height:0;">&nbsp;</td></tr>

  ${card(prayerBars(d), 'Prayer, day by day')}

  ${also.length ? card(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${also.map(line => `<tr><td style="padding:5px 0;font-family:${FONT};font-size:14px;color:#1f2937;">${line}</td></tr>`).join('')}</table>`, 'Also this week') : ''}

  ${card(goalsBody, 'Goals')}

  ${d.unreadCount > 0 ? `<tr><td style="padding:6px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fef3c7" style="background-color:#fef3c7;border-radius:14px;"><tr>
      <td style="padding:14px 18px;font-family:${FONT};font-size:14px;color:#92400e;">📬 You have <strong>${plural(d.unreadCount, 'unread notification')}</strong> waiting.</td>
    </tr></table></td></tr>` : ''}

  <!-- CTA -->
  <tr><td align="center" style="padding:22px 24px 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td align="center" bgcolor="#6d28d9" style="background-color:#6d28d9;border-radius:14px;">
        <a href="${appUrl}/protected" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Open Mastery &rarr;</a>
      </td>
    </tr></table>
  </td></tr>

  <!-- Footer -->
  <tr><td align="center" style="padding:20px 24px 8px;font-family:${FONT};font-size:12px;line-height:19px;color:#9ca3af;">
    Sent every Sunday because the weekly summary is on for your account.<br>
    <a href="${settingsUrl}" style="color:#7c3aed;text-decoration:underline;">Switch it off in Profile &rarr; Notifications</a>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  const lines = [
    `Mastery · your week, ${range}`,
    '',
    `Hi ${d.displayName},`,
    story.title + '. ' + story.sub,
    '',
    `Days with something done: ${c.activeDays.size} of ${d.days.length}`,
    `Prayer: ${fmtMinutes(c.prayerMinutes)} on ${plural(prayerDays, 'day')} (last week ${fmtMinutes(p.prayerMinutes)})`,
    `Scripture: ${plural(c.bibleChapters, 'chapter')} (last week ${p.bibleChapters})`,
    `Reading: ${plural(c.readingPages, 'page')} (last week ${p.readingPages})`,
    `Tasks: ${c.tasksDone} of ${c.totalTasks} done (last week ${p.tasksDone})`,
    ...also.map(l => l.replace(/^\S+\s/, '')),
    '',
    c.goalsDue > 0 ? `Goals due this week: ${c.goalsDueDone} of ${c.goalsDue} done` : 'No goals were due this week',
    ...(d.overdueCount ? [`Overdue: ${d.overdueGoals.map(g => g.title).join(', ')}${d.overdueCount > 3 ? ` and ${d.overdueCount - 3} more` : ''}`] : []),
    ...(d.nextWeekGoalCount ? [`Coming up: ${d.nextWeekGoals.map(g => `${g.title} (${shortDate(g.due)})`).join(', ')}`] : []),
    '',
    `Open Mastery: ${appUrl}/protected`,
    `Switch this email off: ${settingsUrl}`,
  ]

  return { subject: `Your week: ${story.title} · ${range}`, html, text: lines.join('\n') }
}
