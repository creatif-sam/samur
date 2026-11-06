# Mastery

A faith and productivity app for two accountability partners. It is a Next.js PWA backed by Supabase, installable on phones and usable offline.

## What's inside

| Area | What it does |
| --- | --- |
| **Home** | Today at a glance, year and month themes, daily verse |
| **Feed** | Meditations with streaks, prayer timer with a calendar and a monthly minutes graph, and posts shared with your partner (prayer requests, gratitude, insights, wins, answered prayers) |
| **Goals** | Goals and visions with pace tracking against target dates, plus a yearly vision view |
| **Planner** | Day planning, tasks and weekly review |
| **Bible** | Reader with several translations, compare view, verse notes, highlights, keyword search and reading plans |
| **Reading** | Book logging that requires a note on what was read, reading calendar and quizzes |
| **Notes** | Rich-text notebooks with search, pins, sharing and photos |
| **Profile** | Partner connection, themes for the year (which can start early) and the month, currency, notifications |

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # ESLint over the source
```

Create `.env.local` with:

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only jobs and notifications (never expose it to the browser) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web push notifications |
| `CRON_SECRET` | Authorises the scheduled reminder jobs |
| `RESEND_API_KEY`, `FROM_EMAIL` | Email |
| `ADMIN_EMAILS` | Comma-separated admin accounts |
| `NEXT_PUBLIC_SITE_URL` | Links in notifications and emails |

## Database changes

SQL migrations go in `supabase/migrations/`. Run each one in the Supabase SQL editor, then delete the file. The app keeps working before a migration is applied, and features that need the new columns say so.

## Scheduled reminders

`.github/workflows/cron-jobs.yml` calls the routes under `app/api/cron/` on a schedule, sending `Authorization: Bearer $CRON_SECRET`. Set `CRON_SECRET` as a repository secret.

## Project layout

```
app/              routes (app/protected/* is the signed-in app, app/api/* the API)
components/       UI by feature (bible, goals, posts, prayer, …) and shared ui/
lib/              data helpers, dates, Supabase clients, notifications
public/sw.js      service worker: caching and the offline page
supabase/         pending migrations
```
