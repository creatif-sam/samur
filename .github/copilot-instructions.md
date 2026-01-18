# AI Coding Agent Instructions for TGH (Together Goals & Habits)

## Project Overview
TGH is a Next.js Progressive Web App (PWA) for couples to collaboratively track goals, plan daily activities, and share reading progress. Built with Supabase for authentication and data storage, using the App Router for routing.

## Architecture
- **Framework**: Next.js 15 with App Router (`app/` directory)
- **Authentication**: Supabase Auth with SSR cookie-based sessions
- **Database**: Supabase PostgreSQL with tables for goals, posts, planner_days, readings, etc.
- **UI**: shadcn/ui components on Radix UI primitives, styled with Tailwind CSS
- **State Management**: Client-side React state; data fetched directly from Supabase in components
- **PWA Features**: Service worker (`public/sw.js`), manifest (`public/manifest.json`)

Key directories:
- `app/protected/`: Authenticated routes with shared layout (`Topbar`, `BottomNav`)
- `components/`: Reusable UI components, organized by feature (e.g., `planner/`, `readapp/`)
- `lib/supabase/`: Client/server/proxy configurations for Supabase integration

## Data Flow Patterns
- Use `createClient()` from `@/lib/supabase/client` for browser-side queries
- Use `createClient()` from `@/lib/supabase/server` in Server Components/Actions
- Data stored as JSON arrays in Supabase (e.g., `tasks` in `planner_days` table)
- Real-time subscriptions not implemented; rely on manual refreshes
- Example: Load planner data with `supabase.from('planner_days').select('*').eq('day', dateKey)`

## Component Patterns
- Mark interactive components with `'use client'`
- Fetch user data with `supabase.auth.getUser()` before queries
- Use `date-fns` for date manipulations (e.g., `format`, `addDays`)
- Drag-and-drop with `react-dnd` for planner tasks
- Example: Task completion toggle updates local state and calls `saveDay()` to upsert to Supabase

## Development Workflow
- **Start dev server**: `npm run dev` (runs on localhost:3000)
- **Build**: `npm run build` (optimizes for production)
- **Lint**: `npm run lint` (ESLint with Next.js config)
- **Deploy**: Vercel with Supabase integration auto-configures env vars
- **PWA Testing**: Use browser dev tools to simulate install; check service worker in Application tab

## Conventions
- **Styling**: Tailwind utility classes; use `cn()` from `@/lib/utils` for conditional classes
- **Icons**: Lucide React icons (e.g., `<Calendar />`, `<Plus />`)
- **Forms**: Controlled inputs with `onChange` handlers that save immediately to Supabase
- **Navigation**: `BottomNav` for main sections (Goals, Planner, Posts, Profile, ReadApp)
- **Error Handling**: Minimal; rely on Supabase error responses in console
- **Types**: Shared in `lib/types.ts`; extend as needed for new features

## Key Files for Reference
- `app/layout.tsx`: Root layout with ThemeProvider and PWA setup
- `components/planner/DailyPlanner.tsx`: Example of data loading/saving pattern
- `lib/supabase/client.ts`: Browser client creation
- `package.json`: Dependencies and scripts
- `public/manifest.json`: PWA configuration

When adding features, ensure compatibility with PWA offline capabilities and maintain the collaborative aspect for couples.</content>
<parameter name="filePath">c:\Users\Lenovo\Desktop\TGH\tgh_pwa\.github\copilot-instructions.md