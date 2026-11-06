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
| **Library** | Three tabs: Read (books, pages with a note on what you read, a reading calendar), Quiz (true or false self-tests) and Create (work sessions with a live timer, a week summary and a log) |
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

The **weekly summary email** goes out Sundays at 08:00 UTC (`app/api/cron/weekly-summary`, template in `lib/weekly-summary/`). It covers the seven days ending yesterday and compares them with the week before. The route returns a non-200 status if any send fails, so a broken email setup turns the GitHub Action red. Anyone can switch it off, or send themselves a preview, under Profile → Notifications.
Email needs `RESEND_API_KEY`, `FROM_EMAIL` and a sending domain verified in Resend.

## What things are called

Each screen and tab has a code folder with the same name, so you can find it from what you see in the app. The three URLs marked * are older names, kept so existing links, notifications and installed shortcuts keep working.

| In the app | URL | Code |
| --- | --- | --- |
| Home | `/protected` | `components/home` |
| Goals | `/protected/goals` | `components/goals` |
| Planner (Time and Money) | `/protected/planner` | `components/planner`, Money in `components/planner/money` |
| Spirit * | `/protected/posts` | one folder per tab: `components/meditations`, `components/prayer`, `components/posts` |
| Library * | `/protected/readapp` | `components/library` (the tabs), then one folder per tab: `components/read`, `components/quiz`, `components/create` |
| Journal * | `/protected/note` | `components/note` |
| Profile | `/protected/profile` | `components/profile` |

Logic that belongs to one tab lives in `lib/` under the same name (`lib/read/`, `lib/create.ts`, `lib/prayerTarget.ts`). Every explanation behind an ⓘ is in `lib/help.ts`.

## Project layout

```
app/              routes (app/protected/* is the signed-in app, app/api/* the API)
components/       UI by feature (bible, goals, posts, prayer, …) and shared ui/
lib/              data helpers, dates, Supabase clients, notifications
public/sw.js      service worker: caching and the offline page
supabase/         pending migrations
```
