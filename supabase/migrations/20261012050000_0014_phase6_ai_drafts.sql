-- Phase 6: AI draft and approval pipeline
--
-- Adds:
--   1. ai_drafts: server-side record of a generated AI proposal.
--      Statuses draft/approved/rejected/superseded. Approval is the ONLY path
--      that can create a role='ai' conversation_message (send_message
--      hardcodes role='human').
--   2. ai_prompt_versions: versioned system prompts for auditability.
--   3. create_ai_draft: stores a draft with a server-computed
--      version_hash and enforces a per-conversation cooldown.
--   4. approve_ai_draft: verifies the version_hash, inserts the
--      role='ai' message with approved_by/approved_at, and marks the
--      draft approved. Idempotent-ish: re-approving an approved draft
--      is rejected.
--   5. reject_ai_draft: marks the draft rejected with a reason.
--   6. edit_ai_draft: creates a new revision draft (status='draft'),
--      marks the previous draft superseded, recomputes version_hash
--      server-side.

create type public.ai_draft_status as enum ('draft', 'approved', 'rejected', 'superseded');

create table public.ai_drafts (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prompt_version text not null,
  provider text not null,
  model text not null,
  input_context jsonb not null default '{}'::jsonb,
  draft_body text not null,
  confidence numeric(5,4),
  source_references jsonb not null default '[]'::jsonb,
  status public.ai_draft_status not null default 'draft',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  revision int not null default 1,
  version_hash text not null,
  cooldown_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_drafts_confidence_check check (confidence >= 0 and confidence <= 1),
  constraint ai_drafts_revision_check check (revision > 0)
);

create index idx_ai_drafts_conversation on public.ai_drafts (conversation_id, created_at desc);
create index idx_ai_drafts_status on public.ai_drafts (conversation_id, status);

alter table public.ai_drafts enable row level security;

create policy ai_drafts_member_read on public.ai_drafts
  for select
  using (public.is_property_member(property_id));

create policy ai_drafts_service_role on public.ai_drafts
  for all to service_role
  using (true)
  with check (true);

-- Prompt versions for audit trail.
create table public.ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  system_prompt text not null,
  created_at timestamptz not null default now()
);

alter table public.ai_prompt_versions enable row level security;

create policy ai_prompt_versions_member_read on public.ai_prompt_versions
  for select
  using (true); -- prompts are public to authenticated users

create policy ai_prompt_versions_service_role on public.ai_prompt_versions
  for all to service_role
  using (true)
  with check (true);

-- Seed the base prompt version.
insert into public.ai_prompt_versions (version, system_prompt) values
('v1.0', 'You are an AI assistant for a guesthouse management system. Your role is to propose replies to guest messages using ONLY the provided knowledge facts.\n\nRules:\n1. Use ONLY the facts provided in the "Grounded Knowledge" section. Do not use any external knowledge.\n2. If a guest asks about something not covered by the facts, respond with "I don't know" or "Let me check with the team" -- do not invent information.\n3. Every factual claim in your reply MUST reference a fact_key from the provided facts. Include citations like [fact_key] in your draft.\n4. Do not promise actions (bookings, cancellations, payments, sending documents). Only provide information.\n5. Do not include legal, medical, or financial advice.\n6. Respond with ONLY a JSON object matching this schema:\n{\n  "draft_body": "string",\n  "confidence": 0.0-1.0,\n  "source_references": [{"fact_id": "uuid", "fact_key": "string|null", "title": "string", "version": int}],\n  "unknown_answers": [{"question": "string"}]\n}\n7. If you cannot answer from the facts, set draft_body to an appropriate "I don't know" response, confidence to 0.0, source_references to [], and populate unknown_answers.\n');

-- Helper: compute version_hash = sha256(draft_body || prompt_version || input_context::text || source_references::text)
create or replace function public.ai_draft_version_hash(
  p_draft_body text,
  p_prompt_version text,
  p_input_context jsonb,
  p_source_references jsonb
)
returns text
language sql immutable
as $$
  select encode(digest(
    p_draft_body || '|' || p_prompt_version || '|' || p_input_context::text || '|' || p_source_references::text,
    'sha256'
  ), 'hex');
$$;

-- Create a new AI draft. Enforces cooldown and authorization.
create or replace function public.create_ai_draft(
  p_conversation_id uuid,
  p_property_id uuid,
  p_organization_id uuid,
  p_prompt_version text,
  p_provider text,
  p_model text,
  p_input_context jsonb,
  p_draft_body text,
  p_confidence numeric,
  p_source_references jsonb,
  p_actor_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_draft_id uuid;
  v_revision int;
  v_hash text;
  v_cooldown_until timestamptz;
begin
  perform public.assert_actor(p_actor_id);
  -- Authorization: property member (owner/manager/staff) of the property.
  if not public.is_property_member_actor(p_property_id, p_actor_id) then
    raise exception 'FORBIDDEN: only property members can create AI drafts';
  end if;
  -- Validate conversation belongs to property and org.
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and c.property_id = p_property_id
      and c.property_id in (select id from public.properties where organization_id = p_organization_id)
  ) then
    raise exception 'VALIDATION_ERROR: conversation does not belong to this property/organization';
  end if;
  if not public.is_property_member_actor(p_property_id, p_actor_id) then
    raise exception 'FORBIDDEN: actor is not a member of this property';
  end if;
  -- Cooldown enforcement (rate limit): check latest draft for this conversation.
  select cooldown_until into v_cooldown_until
    from public.ai_drafts
    where conversation_id = p_conversation_id
    order by created_at desc
    limit 1;
  if v_cooldown_until is not null and v_cooldown_until > now() then
    raise exception 'RATE_LIMITED: AI draft generation is in cooldown until %',
      v_cooldown_until::text;
  end if;
  -- Basic validation.
  if p_prompt_version is null or length(trim(p_prompt_version)) = 0 then
    raise exception 'VALIDATION_ERROR: prompt_version is required';
  end if;
  if p_provider is null or length(trim(p_provider)) = 0 then
    raise exception 'VALIDATION_ERROR: provider is required';
  end if;
  if p_model is null or length(trim(p_model)) = 0 then
    raise exception 'VALIDATION_ERROR: model is required';
  end if;
  if p_draft_body is null or length(trim(p_draft_body)) = 0 then
    raise exception 'VALIDATION_ERROR: draft_body is required';
  end if;
  if p_confidence is not null and (p_confidence < 0 or p_confidence > 1) then
    raise exception 'VALIDATION_ERROR: confidence must be between 0 and 1';
  end if;
  -- Compute revision (next number for this conversation).
  v_revision := coalesce(
    (select max(revision) from public.ai_drafts where conversation_id = p_conversation_id),
    0
  ) + 1;
  -- Compute version_hash server-side.
  v_hash := public.ai_draft_version_hash(
    trim(p_draft_body),
    trim(p_prompt_version),
    coalesce(p_input_context, '{}'::jsonb),
    coalesce(p_source_references, '[]'::jsonb)
  );
  -- 60 second cooldown after creation.
  v_cooldown_until := now() + interval '60 seconds';
  insert into public.ai_drafts(
    conversation_id, property_id, organization_id,
    prompt_version, provider, model,
    input_context, draft_body, confidence, source_references,
    status, revision, version_hash, cooldown_until
  )
  values (
    p_conversation_id, p_property_id, p_organization_id,
    trim(p_prompt_version), trim(p_provider), trim(p_model),
    coalesce(p_input_context, '{}'::jsonb), trim(p_draft_body), p_confidence,
    coalesce(p_source_references, '[]'::jsonb),
    'draft', v_revision, v_hash, v_cooldown_until
  )
  returning id into v_draft_id;
  -- Audit log.
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (
    p_organization_id, p_actor_id, 'ai_draft.created', 'ai_draft', v_draft_id, p_property_id,
    jsonb_build_object(
      'conversation_id', p_conversation_id,
      'prompt_version', p_prompt_version,
      'provider', p_provider,
      'model', p_model,
      'revision', v_revision,
      'version_hash', v_hash,
      'confidence', p_confidence
    )
  );
  return v_draft_id;
end;
$$;

-- Approve an AI draft: binds to exact version via version_hash.
-- Inserts a role='ai' message (the ONLY path to create ai messages).
create or replace function public.approve_ai_draft(
  p_draft_id uuid,
  p_actor_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_draft record;
  v_message_id uuid;
  v_org_id uuid;
  v_recomputed_hash text;
begin
  perform public.assert_actor(p_actor_id);
  select * into v_draft from public.ai_drafts where id = p_draft_id;
  if not found then
    raise exception 'NOT_FOUND: AI draft not found';
  end if;
  -- Authorization: property member of the draft's property.
  if not public.is_property_member_actor(v_draft.property_id, p_actor_id) then
    raise exception 'FORBIDDEN: only property members can approve AI drafts';
  end if;
  if v_draft.status <> 'draft' then
    raise exception 'CONFLICT: only drafts can be approved';
  end if;
  -- Recompute hash from current stored fields and verify it matches.
  v_recomputed_hash := public.ai_draft_version_hash(
    v_draft.draft_body,
    v_draft.prompt_version,
    v_draft.input_context,
    v_draft.source_references
  );
  if v_recomputed_hash <> v_draft.version_hash then
    raise exception 'CONFLICT: draft content has been modified; approval rejected';
  end if;
  -- Insert the guest-facing AI message. This is the ONLY path that
  -- creates a role='ai' message; send_message hardcodes role='human'.
  insert into public.conversation_messages(
    conversation_id, role, body, confidence, requires_approval, approved_by, approved_at
  )
  values (v_draft.conversation_id, 'ai', v_draft.draft_body, v_draft.confidence, false, p_actor_id, now())
  returning id into v_message_id;
  -- Mark draft approved.
  update public.ai_drafts
    set status = 'approved', approved_by = p_actor_id, approved_at = now(), updated_at = now()
    where id = p_draft_id;
  -- Audit log.
  select organization_id into v_org_id from public.properties where id = v_draft.property_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (
    v_org_id, p_actor_id, 'ai_draft.approved', 'ai_draft', p_draft_id, v_draft.property_id,
    jsonb_build_object(
      'conversation_id', v_draft.conversation_id,
      'message_id', v_message_id,
      'version_hash', v_draft.version_hash,
      'revision', v_draft.revision
    )
  );
  return v_message_id;
end;
$$;

-- Reject an AI draft.
create or replace function public.reject_ai_draft(
  p_draft_id uuid,
  p_actor_id uuid,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_draft record;
  v_org_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  select * into v_draft from public.ai_drafts where id = p_draft_id;
  if not found then
    raise exception 'NOT_FOUND: AI draft not found';
  end if;
  if not public.is_property_member_actor(v_draft.property_id, p_actor_id) then
    raise exception 'FORBIDDEN: only property members can reject AI drafts';
  end if;
  if v_draft.status <> 'draft' then
    raise exception 'CONFLICT: only drafts can be rejected';
  end if;
  update public.ai_drafts
    set status = 'rejected', rejected_by = p_actor_id, rejected_at = now(), updated_at = now()
    where id = p_draft_id;
  select organization_id into v_org_id from public.properties where id = v_draft.property_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (
    v_org_id, p_actor_id, 'ai_draft.rejected', 'ai_draft', p_draft_id, v_draft.property_id,
    jsonb_build_object('conversation_id', v_draft.conversation_id, 'reason', p_reason)
  );
end;
$$;

-- Edit an AI draft: creates a new revision, supersedes the old one.
-- Recomputes version_hash server-side.
create or replace function public.edit_ai_draft(
  p_draft_id uuid,
  p_actor_id uuid,
  p_draft_body text,
  p_confidence numeric,
  p_source_references jsonb
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_draft record;
  v_new_draft_id uuid;
  v_new_revision int;
  v_new_hash text;
  v_cooldown_until timestamptz;
  v_org_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  select * into v_draft from public.ai_drafts where id = p_draft_id;
  if not found then
    raise exception 'NOT_FOUND: AI draft not found';
  end if;
  if not public.is_property_member_actor(v_draft.property_id, p_actor_id) then
    raise exception 'FORBIDDEN: only property members can edit AI drafts';
  end if;
  if v_draft.status <> 'draft' then
    raise exception 'CONFLICT: only drafts can be edited';
  end if;
  if p_draft_body is null or length(trim(p_draft_body)) = 0 then
    raise exception 'VALIDATION_ERROR: draft_body is required';
  end if;
  if p_confidence is not null and (p_confidence < 0 or p_confidence > 1) then
    raise exception 'VALIDATION_ERROR: confidence must be between 0 and 1';
  end if;
  -- Supersede the old draft.
  update public.ai_drafts
    set status = 'superseded', updated_at = now()
    where id = p_draft_id;
  -- Compute new revision and hash.
  v_new_revision := v_draft.revision + 1;
  v_new_hash := public.ai_draft_version_hash(
    trim(p_draft_body),
    v_draft.prompt_version,
    v_draft.input_context,
    coalesce(p_source_references, '[]'::jsonb)
  );
  v_cooldown_until := now() + interval '60 seconds';
  insert into public.ai_drafts(
    conversation_id, property_id, organization_id,
    prompt_version, provider, model,
    input_context, draft_body, confidence, source_references,
    status, revision, version_hash, cooldown_until
  )
  values (
    v_draft.conversation_id, v_draft.property_id, v_draft.organization_id,
    v_draft.prompt_version, v_draft.provider, v_draft.model,
    v_draft.input_context, trim(p_draft_body), p_confidence,
    coalesce(p_source_references, '[]'::jsonb),
    'draft', v_new_revision, v_new_hash, v_cooldown_until
  )
  returning id into v_new_draft_id;
  select organization_id into v_org_id from public.properties where id = v_draft.property_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (
    v_org_id, p_actor_id, 'ai_draft.edited', 'ai_draft', v_new_draft_id, v_draft.property_id,
    jsonb_build_object(
      'conversation_id', v_draft.conversation_id,
      'previous_draft_id', p_draft_id,
      'revision', v_new_revision,
      'version_hash', v_new_hash
    )
  );
  return v_new_draft_id;
end;
$$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';