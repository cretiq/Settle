-- Migration: Security Hardening
-- Run this in Supabase SQL Editor BEFORE deploying the new code
-- (The new code depends on join_tab RPC and updated verify_tab_code)

-- 1. Rate limiting table for code verification
create table if not exists public.code_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  tab_slug text not null,
  attempted_at timestamptz default now()
);
create index if not exists idx_code_attempts_user on public.code_attempts(user_id, tab_slug, attempted_at);

-- 2. Update verify_tab_code with server-side rate limiting
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

-- 3. Add join_tab RPC: verify code + insert member atomically
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
  -- Verify access code (includes rate limiting)
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

-- 4. Lock down direct member inserts (must go through join_tab RPC)
-- Drop old permissive policy
drop policy if exists "Users can join tabs" on public.members;

-- Create restrictive policy (only RPC can insert via security definer)
create policy "Users can join tabs via RPC"
  on public.members for insert
  with check (false);

-- 5. Add paid_by ownership validation to create_expense_with_splits
create or replace function public.create_expense_with_splits(
  p_tab_id uuid,
  p_paid_by uuid,
  p_category text,
  p_amount integer,
  p_description text,
  p_splits jsonb
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

-- 6. Cleanup old code_attempts periodically (optional: run as a cron or manually)
-- delete from public.code_attempts where attempted_at < now() - interval '1 day';
