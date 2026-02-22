-- Settle: Database Schema
-- Run this in Supabase SQL Editor

-- 1. Tables

create table public.tabs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  access_code text not null,
  name text,
  created_at timestamptz default now(),
  created_by uuid references auth.users
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid references public.tabs on delete cascade not null,
  user_id uuid references auth.users not null,
  name text not null,
  joined_at timestamptz default now(),
  is_active boolean default true,
  unique(tab_id, user_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid references public.tabs on delete cascade not null,
  paid_by uuid references public.members not null,
  category text not null,
  amount integer not null check (amount > 0),
  description text,
  split_mode text default 'equal',
  created_at timestamptz default now(),
  deleted_at timestamptz
);

-- 2. Indexes
create index idx_members_tab_id on public.members(tab_id);
create index idx_members_user_id on public.members(user_id);
create index idx_expenses_tab_id on public.expenses(tab_id);

-- 3. Helper function for RLS (security definer bypasses RLS, avoiding recursion)
create or replace function public.is_tab_member(check_tab_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.members
    where tab_id = check_tab_id
    and user_id = auth.uid()
  );
$$;

-- 4. RLS
alter table public.tabs enable row level security;
alter table public.members enable row level security;
alter table public.expenses enable row level security;

-- Tabs: members can read their tabs, anyone authenticated can create
create policy "Members can view their tabs"
  on public.tabs for select
  using (public.is_tab_member(id));

create policy "Authenticated users can create tabs"
  on public.tabs for insert
  with check (auth.uid() is not null);

-- Members: tab members can see each other, can insert self
create policy "Tab members can view members"
  on public.members for select
  using (public.is_tab_member(tab_id));

create policy "Users can join tabs"
  on public.members for insert
  with check (user_id = auth.uid());

-- Expenses: tab members can read/insert, payer can soft-delete
create policy "Tab members can view expenses"
  on public.expenses for select
  using (public.is_tab_member(tab_id));

create policy "Tab members can add expenses"
  on public.expenses for insert
  with check (public.is_tab_member(tab_id));

create policy "Payer can update own expenses"
  on public.expenses for update
  using (
    exists (
      select 1 from public.members
      where members.id = expenses.paid_by
      and members.user_id = auth.uid()
    )
  );

-- 5. RPC Functions

-- Verify tab access code (security definer to bypass RLS)
create or replace function public.verify_tab_code(tab_slug text, code text)
returns uuid
language plpgsql
security definer
as $$
declare
  found_tab_id uuid;
begin
  select id into found_tab_id
  from public.tabs
  where slug = tab_slug and access_code = code;

  return found_tab_id; -- returns null if not found
end;
$$;

-- Create tab (security definer to insert and return)
create or replace function public.create_tab(tab_slug text, tab_code text, tab_name text default null)
returns uuid
language plpgsql
security definer
as $$
declare
  new_tab_id uuid;
begin
  insert into public.tabs (slug, access_code, name, created_by)
  values (tab_slug, tab_code, tab_name, auth.uid())
  returning id into new_tab_id;

  return new_tab_id;
end;
$$;

-- 6. Enable Realtime
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.members;
