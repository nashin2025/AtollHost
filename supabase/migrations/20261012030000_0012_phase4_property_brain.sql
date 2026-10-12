-- Phase 4: Property Brain (versioned knowledge facts)
--
-- Adds:
--   1. knowledge_status lifecycle: draft, pending_review, approved,
--      rejected, expired (T4.1).
--   2. Versioning columns on knowledge_items: fact_key, version,
--      superseded_by, status, expires_at, reviewed_by, reviewed_at.
--      Legacy columns (verified, active, verified_by, verified_at) are
--      untouched; legacy rows have null fact_key and version 1, so the
--      unique constraint treats them as distinct from versioned facts.
--   3. RLS rework: members of the owning property read knowledge
--      items; all writes go through the versioning RPC under the
--      service role. Direct authenticated inserts are denied.
--   4. upsert_knowledge_fact: server-mediated fact create/version
--      with authorization against the explicit actor id.
--   5. review_knowledge_fact: lifecycle transitions with reviewer
--      recording and audit events.
--   6. retrieve_knowledge_facts: the guest-facing AI context. Returns
--      only current approved facts: not superseded, approved, and not
--      time-expired.

create type public.knowledge_status as enum (
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'expired'
);

alter table public.knowledge_items
  add column fact_key text,
  add column version int not null default 1,
  add column superseded_by uuid references public.knowledge_items(id) on delete set null,
  add column status public.knowledge_status not null default 'draft',
  add column expires_at timestamptz,
  add column reviewed_by uuid references auth.users(id) on delete set null,
  add column reviewed_at timestamptz;

-- One version per (property, fact_key, version). Null fact_key rows
-- (legacy data and facts created without a client-supplied key) are
-- distinct under PostgreSQL's null handling, so legacy rows do not
-- collide.
alter table public.knowledge_items
  add constraint uniq_knowledge_fact_version
  unique (property_id, fact_key, version);

create index idx_knowledge_items_status on public.knowledge_items(property_id, status);
create index idx_knowledge_items_fact_key on public.knowledge_items(property_id, fact_key);

-- Knowledge items are read by property members and written only
-- through the versioning RPC, which runs under the service role.
drop policy if exists knowledge_access on public.knowledge_items;

create policy knowledge_items_member_read on public.knowledge_items
  for select
  using (public.is_property_member(property_id));

create policy knowledge_items_service_role on public.knowledge_items
  for all to service_role
  using (true)
  with check (true);

-- Fact create/version. Authorization: organization admins, or
-- property_owner/property_manager assignments on the target
-- property. A null or empty fact key starts a new fact at version
-- 1; a key with a current (non-superseded) row creates the next
-- version and supersedes the previous row. Every new version starts
-- as draft, so an edit removes the fact from retrieval until the
-- new draft is approved.
create or replace function public.upsert_knowledge_fact(
  p_fact_key text,
  p_organization_id uuid,
  p_property_id uuid,
  p_category_id uuid,
  p_title text,
  p_content text,
  p_source text,
  p_expires_at timestamptz,
  p_actor_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_item_id uuid;
  v_fact_key text;
  v_version int;
  v_previous_id uuid;
  v_action text;
begin
  perform public.assert_actor(p_actor_id);
  if not (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id
        and m.user_id = p_actor_id
        and m.role = 'agency_admin'
        and m.status = 'active'
    ) or exists (
      select 1 from public.property_users pu
      where pu.property_id = p_property_id
        and pu.user_id = p_actor_id
        and pu.role in ('property_owner', 'property_manager')
        and pu.status = 'active'
    )
  ) then
    raise exception 'FORBIDDEN: only admins can manage knowledge facts';
  end if;
  if not exists (
    select 1 from public.properties p
    where p.id = p_property_id
      and p.organization_id = p_organization_id
  ) then
    raise exception 'VALIDATION_ERROR: property does not belong to this organization';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'VALIDATION_ERROR: title is required';
  end if;
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'VALIDATION_ERROR: content is required';
  end if;
  if p_source is not null and p_source not in ('manual', 'scanner', 'import') then
    raise exception 'VALIDATION_ERROR: source must be manual, scanner, or import';
  end if;
  if p_category_id is not null
    and not exists (
      select 1 from public.knowledge_categories c
      where c.id = p_category_id
        and c.property_id = p_property_id
    ) then
    raise exception 'VALIDATION_ERROR: category does not belong to this property';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'VALIDATION_ERROR: expires_at must be in the future';
  end if;
  if p_fact_key is null or length(trim(p_fact_key)) = 0 then
    v_fact_key := gen_random_uuid()::text;
    v_version := 1;
  else
    v_fact_key := trim(p_fact_key);
    select id into v_previous_id
      from public.knowledge_items
      where property_id = p_property_id
        and fact_key = v_fact_key
        and superseded_by is null;
    if found then
      v_version := (
        select coalesce(max(version), 0) + 1
          from public.knowledge_items
          where property_id = p_property_id
            and fact_key = v_fact_key
      );
    else
      v_version := 1;
    end if;
  end if;
  insert into public.knowledge_items(
    property_id, category_id, title, content, source,
    fact_key, version, status, expires_at
  )
  values (
    p_property_id, p_category_id, trim(p_title), trim(p_content),
    p_source, v_fact_key, v_version, 'draft', p_expires_at
  )
  returning id into v_item_id;
  if v_previous_id is not null then
    update public.knowledge_items
      set superseded_by = v_item_id
      where id = v_previous_id;
    v_action := 'knowledge.versioned';
  else
    v_action := 'knowledge.created';
  end if;
  insert into public.audit_logs(
    organization_id, actor_user_id, action, entity_type, entity_id,
    property_id, metadata
  )
  values (
    p_organization_id, p_actor_id, v_action, 'knowledge_item',
    v_item_id, p_property_id,
    jsonb_build_object(
      'fact_key', v_fact_key,
      'version', v_version,
      'title', p_title
    )
  );
  return v_item_id;
end;
$$;

-- Lifecycle transitions. Organization admins, or
-- property_owner/property_manager assignments on the owning
-- property, may review. Every transition records the reviewer.
create or replace function public.review_knowledge_fact(
  p_fact_id uuid,
  p_status public.knowledge_status,
  p_actor_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_item record;
begin
  perform public.assert_actor(p_actor_id);
  if p_status not in ('pending_review', 'approved', 'rejected', 'expired') then
    raise exception 'VALIDATION_ERROR: status must be pending_review, approved, rejected, or expired';
  end if;
  select i.property_id, p.organization_id into v_item
    from public.knowledge_items i
    join public.properties p on p.id = i.property_id
    where i.id = p_fact_id;
  if not found then
    raise exception 'NOT_FOUND: knowledge fact not found';
  end if;
  if not (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = v_item.organization_id
        and m.user_id = p_actor_id
        and m.role = 'agency_admin'
        and m.status = 'active'
    ) or exists (
      select 1 from public.property_users pu
      where pu.property_id = v_item.property_id
        and pu.user_id = p_actor_id
        and pu.role in ('property_owner', 'property_manager')
        and pu.status = 'active'
    )
  ) then
    raise exception 'FORBIDDEN: only admins can review knowledge facts';
  end if;
  update public.knowledge_items
    set status = p_status,
        reviewed_by = p_actor_id,
        reviewed_at = now()
    where id = p_fact_id;
  insert into public.audit_logs(
    organization_id, actor_user_id, action, entity_type, entity_id,
    property_id, metadata
  )
  values (
    v_item.organization_id, p_actor_id, 'knowledge.reviewed',
    'knowledge_item', p_fact_id, v_item.property_id,
    jsonb_build_object('status', p_status::text)
  );
end;
$$;

-- Guest-facing AI context. Returns the current approved fact for
-- each key: not superseded, approved, and not time-expired. Called
-- by the edge layer and by property members directly; the SECURITY
-- DEFINER check is mandatory because it bypasses RLS.
create or replace function public.retrieve_knowledge_facts(p_property_id uuid)
returns table (
  id uuid,
  fact_key text,
  version int,
  title text,
  content text,
  source text,
  category_id uuid,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if not (auth.role() = 'service_role' or public.is_property_member(p_property_id)) then
    raise exception 'FORBIDDEN: only property members can retrieve knowledge facts';
  end if;
  return query
    select
      i.id, i.fact_key, i.version, i.title, i.content, i.source,
      i.category_id, i.expires_at, i.created_at
    from public.knowledge_items i
    where i.property_id = p_property_id
      and i.superseded_by is null
      and i.status = 'approved'
      and (i.expires_at is null or i.expires_at > now())
    order by i.created_at desc;
end;
$$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
