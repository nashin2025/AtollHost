-- Fix task_status enum to match Kanban board (add backlog, in_review; remove blocked)
-- Fix app_config RLS policies to use correct organization roles

-- 1. Update task_status enum
-- Cannot directly modify enum values in PostgreSQL, so we:
--   a. Add new values
--   b. Update existing 'blocked' tasks to 'in_progress'
--   c. Create new enum and migrate (PostgreSQL doesn't support removing enum values)

-- Add missing enum values
alter type public.task_status add value if not exists 'backlog';
alter type public.task_status add value if not exists 'in_review';

-- Update any existing 'blocked' tasks to 'in_progress' (since Kanban doesn't use 'blocked')
update public.tasks set status = 'in_progress' where status = 'blocked';

-- 2. Fix app_config RLS policies - use correct organization roles
-- The policies incorrectly reference 'owner', 'admin' but org roles are 'agency_admin', 'agency_staff'

drop policy if exists "org members can read app_config" on public.app_config;
drop policy if exists "org admins can update app_config" on public.app_config;
drop policy if exists "org admins can insert app_config" on public.app_config;

-- Org members can read AI config (any active org member)
create policy "org members can read app_config"
  on public.app_config for select
  using (
    org_id in (
      select organization_id
      from public.organization_members
      where user_id = auth.uid()
      and status = 'active'
    )
  );

-- Org admins/staff can update AI config
create policy "org admins can update app_config"
  on public.app_config for update
  using (
    org_id in (
      select organization_id
      from public.organization_members
      where user_id = auth.uid()
      and role in ('agency_admin', 'agency_staff')
      and status = 'active'
    )
  );

-- Org admins/staff can insert AI config (first time setup)
create policy "org admins can insert app_config"
  on public.app_config for insert
  with check (
    org_id in (
      select organization_id
      from public.organization_members
      where user_id = auth.uid()
      and role in ('agency_admin', 'agency_staff')
      and status = 'active'
    )
  );

-- 3. Add missing updated_at trigger for app_config (if not exists)
drop trigger if exists app_config_updated_at on public.app_config;
create trigger app_config_updated_at
  before update on public.app_config
  for each row
  execute function public.set_updated_at();

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';