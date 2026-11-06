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

## How goals and visions are modelled

A **vision** is the bigger picture; a **goal** is one result you finish by a date, and goals feed the vision's progress. The New Goal and New Vision forms follow what goal-setting research supports, and add nothing that is not needed: only a title (and a due date for goals) is required.

| Principle | Evidence | In the forms |
| --- | --- | --- |
| Specific, measurable goals with a date beat "do your best" | Locke and Latham (2002) | "What do you want to achieve?", "How will you know it's done?", a required due date with quick dates |
| Near, small steps motivate more than a distant target | Bandura and Schunk (1981), a study of children | An optional first step (it goes to the planner to-dos, where it can be scheduled), and a gentle note when a date is over a year away (a rule of thumb, not a finding) |
| A reason that is truly yours sustains effort | Sheldon and Elliot (1999) | "Why does it matter to you?" |
| Deciding when to start helps, though less than first reported | Gollwitzer and Sheeran (2006); smaller after bias correction in a 2024 synthesis | The first step can be scheduled; it stays optional |
| Tracking progress helps | Harkin and others (2016), mostly health studies | Progress and milestones, the Goals overview, the weekly review |
| A vision needs a path, or it stays a wish | Boyatzis and Akrivou (2006); Oyserman; Oettingen | "Describe it as if it is already true", an optional first goal, and a "No goals yet" note on the card |
| Do not over-prescribe goals | Ordonez and others (2009) | Everything beyond the title and date is optional, and there are no limits |

SMART (Specific, Measurable, Achievable, Relevant, Time-bound) is a practitioner checklist, not an experiment; the forms use the parts the evidence supports. A goal's first step is saved as a planner to-do, not a milestone, because progress from milestones is done divided by total, so a single milestone would mark the goal finished when ticked.

Sources: [Locke and Latham 2002](https://doi.org/10.1037/0003-066X.57.9.705) · [Sheldon and Elliot 1999](https://pubmed.ncbi.nlm.nih.gov/10101878/) · [Gollwitzer and Sheeran 2006](https://stafforini.com/works/gollwitzer-2006-implementation-intentions-and/) · [2024 update, as summarised](https://goalsandprogress.com/implementation-intentions-research/) · [Harkin and others 2016](https://eprints.whiterose.ac.uk/id/eprint/91437/) · [Boyatzis and Akrivou 2006](https://emerald.com/insight/content/doi/10.1108/02621710610678454/full/html) · [Ordonez and others 2009](https://www.hks.harvard.edu/publications/goals-gone-wild-systematic-side-effects-overprescribing-goal-setting). Bandura and Schunk (1981, Journal of Personality and Social Psychology 41), Oyserman and Oettingen were read through abstracts and summaries only.

## Project layout

```
app/              routes (app/protected/* is the signed-in app, app/api/* the API)
components/       UI by feature (bible, goals, posts, prayer, …) and shared ui/
lib/              data helpers, dates, Supabase clients, notifications
public/sw.js      service worker: caching and the offline page
supabase/         pending migrations
```
