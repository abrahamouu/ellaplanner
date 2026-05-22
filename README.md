<<<<<<< HEAD
# ellaalt
=======
# Ella's Planner

A soft, nursing-inspired school planner built with Next.js and wired for Supabase auth + storage.

## What is included

- Google login flow using Supabase Auth
- Monthly calendar with year jumping across all 12 months
- Color-coded courses with instructor + description support
- Activity creation for exam, homework, lab, study, and other
- Activity status tracking for in progress, done, and not done
- Collapsible urgent reminders section with points
- Course-specific notes and links with link descriptions
- Separate non-school activity rail
- Supabase SQL migration starter in `supabase/migrations`
- Empty `.env.example` so you can add your own project credentials

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Fill in your Supabase project values in `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

3. In Supabase Auth, enable Google and add your app URL as an allowed redirect.

4. Apply the SQL migration in `supabase/migrations/202605210001_initial_schema.sql`.

5. Start the app:

   ```bash
   npm run dev
   ```

## Notes

- Until Supabase keys are added, the app opens in preview mode with sample planner data so the UI is still usable.
- The data model is intentionally straightforward so you can extend the migration yourself if you want profiles, attachments, or richer scheduling later.
>>>>>>> 09998f1 (first commit)
