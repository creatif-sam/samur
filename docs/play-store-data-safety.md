# Play Console — Data Safety mapping

Source of truth for the "Data safety" form in Google Play Console. Keep this in sync
with `app/privacy/page.tsx` whenever a feature starts collecting/sharing new data —
update both together.

Last reviewed: 2026-08-22

## Data collected

| Data category | Type | Collected | Shared | Optional? | Purpose | Where in code |
|---|---|---|---|---|---|---|
| Personal info | Email address | Yes | No | Required | Account management | Supabase Auth |
| Personal info | Name | Yes | No | Optional | App functionality | `app/protected/profile` |
| Photos and videos | Photos | Yes | No | Optional | App functionality | profile photo, vision board, business card (Supabase Storage) |
| Photos and videos | Videos | Yes | No | Optional | App functionality | discipline videos (`DisciplineVideosForm.tsx`) |
| Financial info | User payment/budget info | Yes | No | Optional | App functionality | Money planner — manual entries only, not linked to real accounts/cards |
| App activity | App interactions | Yes | No | Required | App functionality, Personalization | goals, tasks, planner, meditation/prayer logs, quiz, journal (`lib/supabase`) |
| App activity | Other user-generated content | Yes | No | Optional | App functionality | posts, comments shared to community/partner |
| Device or other IDs | Device/push identifiers | Yes | **Yes** (Expo) | Optional | App functionality | `push_subscriptions` table, `lib/push-notifications.ts` — Expo push token sent to Expo's push relay to deliver Android notifications; web push endpoint/keys sent to the browser's push service (standard Web Push) |
| Messages | In-app notification content | Yes | No | Required (system) | App functionality | `notifications` table |

## Not collected

- No analytics/telemetry SDK in the codebase (no gtag, Sentry, Mixpanel, PostHog, etc.) — do not
  check "Analytics" purpose unless one is added later.
- No advertising ID, no ad SDKs.
- No location data.
- No contacts, calendar, or SMS access.
- No real financial account linking (no Plaid/bank/card processor) — money planner is manual entry only.

## Security practices checklist

- [x] Data encrypted in transit (HTTPS/TLS via Vercel + Supabase)
- [x] Users can request data deletion:
  - In-app: `/protected/delete-data` (partial), `/protected/delete-account` (full account + data)
  - Email fallback: tech@samuelgyasi.com
  - Public policy URL: `https://mastery.samuelgyasi.com/privacy`
- [ ] Independent security review — not yet done (leave unchecked unless one is performed)

## When to revisit this file

- Adding any analytics/crash-reporting SDK
- Adding real payment/bank integration to the money planner
- Adding a new third-party service that receives user data (email provider, SMS, ads, etc.)
- Changing what push notification providers are used
