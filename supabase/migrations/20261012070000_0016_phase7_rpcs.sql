-- Phase 7b: RPCs for tasks, content, reviews, journey templates
--
-- The tables were created in 0015; this migration adds the RPCs.

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