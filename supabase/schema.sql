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

create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.expenses on delete cascade not null,
  member_id uuid references public.members not null,
  amount integer not null check (amount > 0)
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid references public.tabs on delete cascade not null,
  from_member uuid references public.members not null,
  to_member uuid references public.members not null,
  amount integer not null check (amount > 0),
  created_at timestamptz default now(),
  deleted_at timestamptz
);

-- 2. Indexes
create index idx_members_tab_id on public.members(tab_id);
create index idx_members_user_id on public.members(user_id);
create index idx_expenses_tab_id on public.expenses(tab_id);
create index idx_expense_splits_expense_id on public.expense_splits(expense_id);
create index idx_expense_splits_member_id on public.expense_splits(member_id);
create index idx_settlements_tab_id on public.settlements(tab_id);

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
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

-- Tabs: members can read their tabs, anyone authenticated can create
create policy "Members can view their tabs"
  on public.tabs for select
  using (public.is_tab_member(id));

create policy "Authenticated users can create tabs"
  on public.tabs for insert
  with check (auth.uid() is not null);

-- Members: tab members can see each other, inserts go through join_tab RPC only
create policy "Tab members can view members"
  on public.members for select
  using (public.is_tab_member(tab_id));

-- Direct inserts blocked: must use join_tab RPC which validates access code
create policy "Users can join tabs via RPC"
  on public.members for insert
  with check (false);

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

-- Expense splits: tab members can view, tab members can insert, payer can delete
create policy "Tab members can view splits"
  on public.expense_splits for select
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
      and public.is_tab_member(expenses.tab_id)
    )
  );

create policy "Tab members can insert splits"
  on public.expense_splits for insert
  with check (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
      and public.is_tab_member(expenses.tab_id)
    )
  );

create policy "Payer can delete splits"
  on public.expense_splits for delete
  using (
    exists (
      select 1 from public.expenses
      join public.members on members.id = expenses.paid_by
      where expenses.id = expense_splits.expense_id
      and members.user_id = auth.uid()
    )
  );

-- Settlements: tab members can view/insert, from_member can update (soft-delete)
create policy "Tab members can view settlements"
  on public.settlements for select
  using (public.is_tab_member(tab_id));

create policy "Tab members can insert settlements"
  on public.settlements for insert
  with check (public.is_tab_member(tab_id));

create policy "From member can update settlements"
  on public.settlements for update
  using (
    exists (
      select 1 from public.members
      where members.id = settlements.from_member
      and members.user_id = auth.uid()
    )
  );

-- 5. Rate limiting table for code verification
create table if not exists public.code_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  tab_slug text not null,
  attempted_at timestamptz default now()
);
create index idx_code_attempts_user on public.code_attempts(user_id, tab_slug, attempted_at);

-- RPC Functions

-- Verify tab access code with server-side rate limiting
create or replace function public.verify_tab_code(tab_slug text, code text)
returns uuid
language plpgsql
security definer
as $$
declare
  found_tab_id uuid;
  recent_attempts integer;
begin
  -- Rate limit: max 10 attempts per slug per user in last 15 minutes
  select count(*) into recent_attempts
  from public.code_attempts
  where user_id = auth.uid()
    and code_attempts.tab_slug = verify_tab_code.tab_slug
    and attempted_at > now() - interval '15 minutes';

  if recent_attempts >= 10 then
    raise exception 'Too many attempts. Try again later.';
  end if;

  -- Log attempt
  insert into public.code_attempts (user_id, tab_slug)
  values (auth.uid(), verify_tab_code.tab_slug);

  select id into found_tab_id
  from public.tabs
  where slug = verify_tab_code.tab_slug and access_code = verify_tab_code.code;

  return found_tab_id;
end;
$$;

-- Join tab: verify code + insert member atomically (security definer to bypass RLS)
create or replace function public.join_tab(tab_slug text, code text, member_name text)
returns jsonb
language plpgsql
security definer
as $$
declare
  found_tab_id uuid;
  new_member_id uuid;
  existing_member_id uuid;
begin
  -- Verify access code
  found_tab_id := public.verify_tab_code(tab_slug, code);
  if found_tab_id is null then
    raise exception 'Invalid access code';
  end if;

  -- Check if already a member
  select id into existing_member_id
  from public.members
  where tab_id = found_tab_id and user_id = auth.uid();

  if existing_member_id is not null then
    return jsonb_build_object('tab_id', found_tab_id, 'member_id', existing_member_id);
  end if;

  -- Insert new member
  insert into public.members (tab_id, user_id, name)
  values (found_tab_id, auth.uid(), member_name)
  returning id into new_member_id;

  return jsonb_build_object('tab_id', found_tab_id, 'member_id', new_member_id);
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

-- Create expense with splits atomically
create or replace function public.create_expense_with_splits(
  p_tab_id uuid,
  p_paid_by uuid,
  p_category text,
  p_amount integer,
  p_description text,
  p_splits jsonb -- array of { member_id, amount }
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_expense_id uuid;
  splits_sum integer;
begin
  -- Validate caller is tab member
  if not public.is_tab_member(p_tab_id) then
    raise exception 'Not a tab member';
  end if;

  -- Validate paid_by belongs to the calling user
  if not exists (
    select 1 from public.members
    where id = p_paid_by and user_id = auth.uid()
  ) then
    raise exception 'Can only create expenses as yourself';
  end if;

  -- Validate splits sum = amount
  select coalesce(sum((s->>'amount')::integer), 0) into splits_sum
  from jsonb_array_elements(p_splits) as s;

  if splits_sum != p_amount then
    raise exception 'Splits sum (%) does not equal expense amount (%)', splits_sum, p_amount;
  end if;

  -- Insert expense
  insert into public.expenses (tab_id, paid_by, category, amount, description)
  values (p_tab_id, p_paid_by, p_category, p_amount, p_description)
  returning id into new_expense_id;

  -- Insert splits
  insert into public.expense_splits (expense_id, member_id, amount)
  select new_expense_id, (s->>'member_id')::uuid, (s->>'amount')::integer
  from jsonb_array_elements(p_splits) as s;

  return new_expense_id;
end;
$$;

-- Update expense with splits atomically
create or replace function public.update_expense_with_splits(
  p_expense_id uuid,
  p_paid_by uuid,
  p_category text,
  p_amount integer,
  p_description text,
  p_splits jsonb -- array of { member_id, amount }
)
returns void
language plpgsql
security definer
as $$
declare
  v_tab_id uuid;
  v_payer_user_id uuid;
  splits_sum integer;
begin
  -- Get expense info and validate caller is the payer
  select e.tab_id, m.user_id into v_tab_id, v_payer_user_id
  from public.expenses e
  join public.members m on m.id = e.paid_by
  where e.id = p_expense_id;

  if v_payer_user_id != auth.uid() then
    raise exception 'Only the payer can edit this expense';
  end if;

  -- Validate splits sum = amount
  select coalesce(sum((s->>'amount')::integer), 0) into splits_sum
  from jsonb_array_elements(p_splits) as s;

  if splits_sum != p_amount then
    raise exception 'Splits sum (%) does not equal expense amount (%)', splits_sum, p_amount;
  end if;

  -- Update expense
  update public.expenses
  set paid_by = p_paid_by,
      category = p_category,
      amount = p_amount,
      description = p_description
  where id = p_expense_id;

  -- Delete old splits, insert new
  delete from public.expense_splits where expense_id = p_expense_id;

  insert into public.expense_splits (expense_id, member_id, amount)
  select p_expense_id, (s->>'member_id')::uuid, (s->>'amount')::integer
  from jsonb_array_elements(p_splits) as s;
end;
$$;

-- 6. Backfill: insert expense_splits for all existing expenses (equal split among active members)
-- Run this ONCE after creating the tables above
do $$
declare
  exp record;
  member_count integer;
  share integer;
  remainder integer;
  i integer;
  m record;
begin
  for exp in
    select e.id as expense_id, e.tab_id, e.amount
    from public.expenses e
    where e.deleted_at is null
    and not exists (select 1 from public.expense_splits es where es.expense_id = e.id)
  loop
    select count(*) into member_count
    from public.members
    where tab_id = exp.tab_id and is_active = true;

    if member_count = 0 then continue; end if;

    share := exp.amount / member_count;
    remainder := exp.amount - share * member_count;
    i := 0;

    for m in
      select id from public.members
      where tab_id = exp.tab_id and is_active = true
      order by id
    loop
      insert into public.expense_splits (expense_id, member_id, amount)
      values (exp.expense_id, m.id, share + (case when i < remainder then 1 else 0 end));
      i := i + 1;
    end loop;
  end loop;
end;
$$;

-- 7. Enable Realtime
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.expense_splits;
alter publication supabase_realtime add table public.settlements;
