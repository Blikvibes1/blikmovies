# Blikmovies

A cinematic movie platform built with Next.js 16, Supabase, and TMDB.

## Features
- Dark cinematic UI with hero section
- Movie browsing, search, and filtering
- Mock streaming player (react-player)
- Watchlist — add/remove movies (requires login)
- Magic-link authentication via Supabase
- Admin dashboard: stats, movies CRUD, download request approvals
- TMDB sync — pull trending + popular movies into Supabase with one click

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Auth & DB:** Supabase (magic-link auth, RLS, PostgreSQL)
- **Movie Data:** TMDB v4 API
- **UI:** Tailwind CSS v4, Lucide icons, Framer Motion, react-player
- **Language:** TypeScript

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   TMDB_API_KEY=your_tmdb_v4_read_access_token
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. Run the Supabase schema in the SQL editor:
   ```
   supabase/schema.sql
   ```

4. (Optional) Seed sample movies:
   ```
   supabase/seed.sql
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

## Admin Access

After signing up, run this in the Supabase SQL editor to grant yourself admin:
```sql
INSERT INTO profiles (id, is_admin)
VALUES ('<your-auth-user-id>', true)
ON CONFLICT (id) DO UPDATE SET is_admin = true;
```

Find your user ID under Supabase → Authentication → Users.

## Deploy

Deploy to Vercel with one click — set the same env vars in the Vercel dashboard.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Blikvibes1/blikmovies)
