create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  instructor text,
  color text not null default '#ff8ca4',
  description text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  kind text not null check (kind in ('exam', 'hw', 'lab', 'study', 'other')),
  status text not null default 'in_progress' check (status in ('in_progress', 'done', 'not_done')),
  scheduled_for date not null,
  time_label text,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  kind text not null check (kind in ('exam', 'hw', 'lab', 'study', 'other')),
  due_date date not null,
  points integer not null default 0 check (points >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.course_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  label text not null,
  url text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.non_school_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text,
  scheduled_for date not null,
  time_label text,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists courses_user_id_idx on public.courses (user_id);
create index if not exists activities_user_id_idx on public.activities (user_id);
create index if not exists activities_scheduled_for_idx on public.activities (scheduled_for);
create index if not exists reminders_user_id_idx on public.reminders (user_id);
create index if not exists reminders_due_date_idx on public.reminders (due_date);
create index if not exists course_links_user_id_idx on public.course_links (user_id);
create index if not exists non_school_items_user_id_idx on public.non_school_items (user_id);
create index if not exists non_school_items_scheduled_for_idx on public.non_school_items (scheduled_for);

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();

drop trigger if exists set_activities_updated_at on public.activities;
create trigger set_activities_updated_at
before update on public.activities
for each row
execute function public.set_updated_at();

alter table public.courses enable row level security;
alter table public.activities enable row level security;
alter table public.reminders enable row level security;
alter table public.course_links enable row level security;
alter table public.non_school_items enable row level security;

create policy "Users can view own courses"
on public.courses
for select
using (auth.uid() = user_id);

create policy "Users can insert own courses"
on public.courses
for insert
with check (auth.uid() = user_id);

create policy "Users can update own courses"
on public.courses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own courses"
on public.courses
for delete
using (auth.uid() = user_id);

create policy "Users can view own activities"
on public.activities
for select
using (auth.uid() = user_id);

create policy "Users can insert own activities"
on public.activities
for insert
with check (auth.uid() = user_id);

create policy "Users can update own activities"
on public.activities
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own activities"
on public.activities
for delete
using (auth.uid() = user_id);

create policy "Users can view own reminders"
on public.reminders
for select
using (auth.uid() = user_id);

create policy "Users can insert own reminders"
on public.reminders
for insert
with check (auth.uid() = user_id);

create policy "Users can update own reminders"
on public.reminders
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own reminders"
on public.reminders
for delete
using (auth.uid() = user_id);

create policy "Users can view own course links"
on public.course_links
for select
using (auth.uid() = user_id);

create policy "Users can insert own course links"
on public.course_links
for insert
with check (auth.uid() = user_id);

create policy "Users can update own course links"
on public.course_links
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own course links"
on public.course_links
for delete
using (auth.uid() = user_id);

create policy "Users can view own non school items"
on public.non_school_items
for select
using (auth.uid() = user_id);

create policy "Users can insert own non school items"
on public.non_school_items
for insert
with check (auth.uid() = user_id);

create policy "Users can update own non school items"
on public.non_school_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own non school items"
on public.non_school_items
for delete
using (auth.uid() = user_id);
