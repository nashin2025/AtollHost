-- Phase 7: Tasks, guest journey, reviews, content
--
-- Adds:
--   1. task_comments: threaded comments on tasks with mentions.
--   2. content_calendar: scheduled content with manual/integration publication states.
--   3. review_responses: AI draft responses for reviews (extends reviews.ai_draft).
--   4. journey_templates: reusable guest journey automation templates.
--   5. task_reminders: reminder scheduling for tasks.
--   6. Additional indexes and RLS for new tables.
--   7. RPCs for task lifecycle, review response approval, journey automation.

create table public.task_comments(
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_task_comments_task on public.task_comments(task_id, created_at);

alter table public.task_comments enable row level security;

create policy task_comments_member_read on public.task_comments
  for select
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.is_property_member(t.property_id)
    )
  );

create policy task_comments_member_write on public.task_comments
  for insert
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.is_property_member(t.property_id)
    )
    and author_id = auth.uid()
  );

-- Content calendar for marketing/ops content with honest publication state tracking
create type public.content_status as enum (
  'draft',
  'scheduled',
  'published',
  'failed',
  'cancelled'
);

create type public.content_channel as enum (
  'website',
  'email',
  'social_facebook',
  'social_instagram',
  'social_linkedin',
  'social_x',
  'google_business',
  'booking_engine',
  'other'
);

create type public.content_source as enum (
  'manual',
  'integration'
);

create table public.content_calendar(
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  body text,
  channel public.content_channel not null,
  source public.content_source not null default 'manual',
  status public.content_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  external_id text,
  external_url text,
  metadata jsonb not null default '{}',
  created_by uuid not null references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_calendar_scheduled_check check (
    (status = 'scheduled' and scheduled_for is not null) or status <> 'scheduled'
  )
);

create index idx_content_calendar_property on public.content_calendar(property_id, scheduled_for);
create index idx_content_calendar_status on public.content_calendar(status, scheduled_for);

alter table public.content_calendar enable row level security;

create policy content_calendar_member_read on public.content_calendar
  for select
  using (public.is_property_member(property_id));

create policy content_calendar_member_write on public.content_calendar
  for all
  using (public.is_property_member(property_id))
  with check (public.is_property_member(property_id));

-- Review responses: tracks AI draft responses for reviews with approval workflow
create table public.review_responses(
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  draft_body text not null,
  confidence numeric(5,4),
  source_references jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','approved','rejected','published')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  version int not null default 1,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_review_responses_review on public.review_responses(review_id, created_at desc);

alter table public.review_responses enable row level security;

create policy review_responses_member_read on public.review_responses
  for select
  using (public.is_property_member(property_id));

create policy review_responses_member_write on public.review_responses
  for all
  using (public.is_property_member(property_id))
  with check (public.is_property_member(property_id));

-- Journey templates for reusable guest journey automations
create table public.journey_templates(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null,
  config jsonb not null default '{}',
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_journey_templates_org on public.journey_templates(organization_id);

alter table public.journey_templates enable row level security;

create policy journey_templates_org_read on public.journey_templates
  for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = journey_templates.organization_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

create policy journey_templates_org_write on public.journey_templates
  for all
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = journey_templates.organization_id
        and m.user_id = auth.uid()
        and m.role in ('agency_admin','agency_staff')
        and m.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = journey_templates.organization_id
        and m.user_id = auth.uid()
        and m.role in ('agency_admin','agency_staff')
        and m.status = 'active'
    )
  );

-- Task reminders for due date notifications
create table public.task_reminders(
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  remind_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_task_reminders_task on public.task_reminders(task_id);
create index idx_task_reminders_due on public.task_reminders(remind_at) where sent_at is null;

alter table public.task_reminders enable row level security;

create policy task_reminders_member_read on public.task_reminders
  for select
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.is_property_member(t.property_id)
    )
  );

create policy task_reminders_service_role on public.task_reminders
  for all to service_role
  using (true)
  with check (true);

-- Add missing columns to tasks for comments count and reminder tracking
alter table public.tasks
  add column if not exists comments_count int not null default 0,
  add column if not exists last_activity_at timestamptz;

-- Add missing columns to reviews for response tracking
alter table public.reviews
  add column if not exists response_id uuid references public.review_responses(id) on delete set null,
  add column if not exists response_status text;

-- RPC: Create task with authorization and audit
create or replace function public.create_task(
  p_property_id uuid,
  p_assigned_to uuid,
  p_title text,
  p_description text,
  p_status text,
  p_priority text,
  p_due_at timestamptz,
  p_source text,
  p_actor_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_task_id uuid;
  v_org_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  if not public.is_property_member_actor(p_property_id, p_actor_id) then
    raise exception 'FORBIDDEN: only property members can create tasks';
  end if;
  if p_status is null or p_status = '' then p_status := 'todo'; end if;
  if p_priority is null or p_priority = '' then p_priority := 'normal'; end if;
  if p_status not in ('todo','in_progress','blocked','done','cancelled') then
    raise exception 'VALIDATION_ERROR: invalid status';
  end if;
  if p_priority not in ('low','normal','high','urgent') then
    raise exception 'VALIDATION_ERROR: invalid priority';
  end if;
  select organization_id into v_org_id from public.properties where id = p_property_id;
  insert into public.tasks(property_id, assigned_to, title, description, status, priority, due_at, source)
  values (p_property_id, p_assigned_to, trim(p_title), p_description, p_status, p_priority, p_due_at, p_source)
  returning id into v_task_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (v_org_id, p_actor_id, 'task.created', 'task', v_task_id, p_property_id,
    jsonb_build_object('title', p_title, 'status', p_status, 'priority', p_priority));
  return v_task_id;
end;
$$;

-- RPC: Update task with authorization and audit
create or replace function public.update_task(
  p_task_id uuid,
  p_property_id uuid,
  p_assigned_to uuid,
  p_title text,
  p_description text,
  p_status text,
  p_priority text,
  p_due_at timestamptz,
  p_actor_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_task record;
  v_org_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  if not public.is_property_member_actor(p_property_id, p_actor_id) then
    raise exception 'FORBIDDEN: only property members can update tasks';
  end if;
  select * into v_task from public.tasks where id = p_task_id and property_id = p_property_id;
  if not found then
    raise exception 'NOT_FOUND: task not found';
  end if;
  if p_status is not null and p_status not in ('todo','in_progress','blocked','done','cancelled') then
    raise exception 'VALIDATION_ERROR: invalid status';
  end if;
  if p_priority is not null and p_priority not in ('low','normal','high','urgent') then
    raise exception 'VALIDATION_ERROR: invalid priority';
  end if;
  update public.tasks
  set assigned_to = coalesce(p_assigned_to, assigned_to),
      title = coalesce(nullif(p_title, ''), title),
      description = p_description,
      status = coalesce(p_status, status),
      priority = coalesce(p_priority, priority),
      due_at = p_due_at,
      last_activity_at = now(),
      updated_at = now()
  where id = p_task_id;
  select organization_id into v_org_id from public.properties where id = p_property_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (v_org_id, p_actor_id, 'task.updated', 'task', p_task_id, p_property_id,
    jsonb_build_object('status', p_status, 'priority', p_priority));
end;
$$;

-- RPC: Create content calendar entry
create or replace function public.create_content(
  p_property_id uuid,
  p_organization_id uuid,
  p_title text,
  p_body text,
  p_channel public.content_channel,
  p_source public.content_source,
  p_status public.content_status,
  p_scheduled_for timestamptz,
  p_external_id text,
  p_external_url text,
  p_metadata jsonb,
  p_created_by uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_content_id uuid;
  v_org_id uuid;
begin
  perform public.assert_actor(p_created_by);
  if not public.is_property_member_actor(p_property_id, p_created_by) then
    raise exception 'FORBIDDEN: only property members can create content';
  end if;
  if not exists (select 1 from public.properties where id = p_property_id and organization_id = p_organization_id) then
    raise exception 'VALIDATION_ERROR: property does not belong to this organization';
  end if;
  insert into public.content_calendar(property_id, organization_id, title, body, channel, source, status, scheduled_for, external_id, external_url, metadata, created_by)
  values (p_property_id, p_organization_id, trim(p_title), p_body, p_channel, p_source, p_status, p_scheduled_for, p_external_id, p_external_url, coalesce(p_metadata, '{}'::jsonb), p_created_by)
  returning id into v_content_id;
  select organization_id into v_org_id from public.properties where id = p_property_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (v_org_id, p_created_by, 'content.created', 'content_calendar', v_content_id, p_property_id,
    jsonb_build_object('title', p_title, 'channel', p_channel, 'status', p_status));
  return v_content_id;
end;
$$;

-- RPC: Create review response (AI draft for review)
create or replace function public.create_review_response(
  p_review_id uuid,
  p_property_id uuid,
  p_organization_id uuid,
  p_draft_body text,
  p_confidence numeric,
  p_source_references jsonb,
  p_created_by uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_response_id uuid;
  v_org_id uuid;
  v_review record;
begin
  perform public.assert_actor(p_created_by);
  if not public.is_property_member_actor(p_property_id, p_created_by) then
    raise exception 'FORBIDDEN: only property members can create review responses';
  end if;
  select r.id, r.property_id, p.organization_id into v_review
    from public.reviews r
    join public.properties p on p.id = r.property_id
    where r.id = p_review_id;
  if not found then
    raise exception 'NOT_FOUND: review not found';
  end if;
  if v_review.property_id <> p_property_id or v_review.organization_id <> p_organization_id then
    raise exception 'VALIDATION_ERROR: review does not belong to this property/organization';
  end if;
  if p_confidence is not null and (p_confidence < 0 or p_confidence > 1) then
    raise exception 'VALIDATION_ERROR: confidence must be between 0 and 1';
  end if;
  insert into public.review_responses(review_id, property_id, organization_id, draft_body, confidence, source_references, created_by)
  values (p_review_id, p_property_id, p_organization_id, trim(p_draft_body), p_confidence, coalesce(p_source_references, '[]'::jsonb), p_created_by)
  returning id into v_response_id;
  update public.reviews set response_id = v_response_id, response_status = 'draft', updated_at = now() where id = p_review_id;
  select organization_id into v_org_id from public.properties where id = p_property_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (v_org_id, p_created_by, 'review_response.created', 'review_response', v_response_id, p_property_id,
    jsonb_build_object('review_id', p_review_id, 'confidence', p_confidence));
  return v_response_id;
end;
$$;

-- RPC: Create journey template
create or replace function public.create_journey_template(
  p_organization_id uuid,
  p_name text,
  p_description text,
  p_trigger_type text,
  p_config jsonb,
  p_created_by uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_template_id uuid;
begin
  perform public.assert_actor(p_created_by);
  if not (
    exists (select 1 from public.organization_members m
      where m.organization_id = p_organization_id and m.user_id = p_created_by
        and m.role in ('agency_admin','agency_staff') and m.status = 'active')
  ) then
    raise exception 'FORBIDDEN: only agency admins or staff can create journey templates';
  end if;
  insert into public.journey_templates(organization_id, name, description, trigger_type, config, created_by)
  values (p_organization_id, trim(p_name), p_description, trim(p_trigger_type), coalesce(p_config, '{}'::jsonb), p_created_by)
  returning id into v_template_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, p_created_by, 'journey_template.created', 'journey_template', v_template_id,
    jsonb_build_object('name', p_name, 'trigger_type', p_trigger_type));
  return v_template_id;
end;
$$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';