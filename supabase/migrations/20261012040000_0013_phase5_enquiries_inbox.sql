-- Phase 5: Enquiries and inbox
--
-- Adds:
--   1. Enquiry lifecycle columns (T5.1): source, topic
--      (classification), follow_up_at, outcome, external_id,
--      unread and urgent indicators (T5.3).
--   2. Conversation automation state (T5.4): automation_paused
--      alongside the existing human_takeover flag.
--   3. message_attachments (T5.2): safe attachment metadata
--      only. No file contents are stored in the database; the
--      MIME type, size, and checksum are validated against
--      allowlists at the RPC boundary and enforced by CHECK
--      constraints as a backstop.
--   4. RLS rework on enquiries, conversations,
--      conversation_messages, and message_attachments:
--      property members read; all writes go through the
--      lifecycle RPCs under the service role. Direct
--      authenticated writes are denied.
--   5. Lifecycle RPCs with explicit actor verification:
--      upsert_enquiry (create/import, classification,
--      assignment, follow-up), update_enquiry_status (validated
--      status transitions, outcome, follow-up), start_conversation
--      (creates the conversation and the opening guest message),
--      send_message (human reply), add_message_attachment
--      (validated metadata), takeover_conversation (human
--      takeover pauses automation), handback_conversation
--      (explicit handback resumes automation), and
--      mark_enquiry_read.

-- Enquiry lifecycle and inbox indicators.
alter table public.enquiries
  add column source text,
  add column topic text,
  add column follow_up_at timestamptz,
  add column outcome text,
  add column external_id text,
  add column unread boolean not null default true,
  add column urgent boolean not null default false;

alter table public.enquiries
  add constraint enquiries_source_check
    check (source is null or source in (
      'website', 'booking', 'walk_in', 'phone', 'email', 'import', 'other'
    ));

-- One external reference per property so imports deduplicate.
create unique index uniq_enquiries_external_id
  on public.enquiries (property_id, external_id)
  where external_id is not null;

-- Automation state. human_takeover = true must block automation
-- execution for the conversation (DATA_MODEL integrity rule).
alter table public.conversations
  add column automation_paused boolean not null default false;

-- Attachment metadata. Storage holds the object; the database
-- only records where it is and what it is.
create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.conversation_messages(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  checksum text,
  scan_status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint message_attachments_mime_check check (mime_type in (
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain'
  )),
  constraint message_attachments_size_check
    check (size_bytes > 0 and size_bytes <= 26214400),
  constraint message_attachments_scan_check check (scan_status in (
    'pending', 'clean', 'blocked'
  )),
  constraint message_attachments_checksum_check
    check (checksum is null or checksum ~ '^[0-9a-f]{64}$')
);

alter table public.message_attachments enable row level security;

-- Existing indexes (0004) already cover the main access
-- patterns: idx_enquiries_property_status
-- (property_id, status, created_at desc),
-- idx_conversations_property (property_id, updated_at
-- desc), and idx_messages_conversation
-- (conversation_id, created_at). Only the updated_at
-- ordering index for enquiries and the attachment lookup
-- index are new.
create index idx_enquiries_property_updated
  on public.enquiries (property_id, updated_at desc);

create index idx_message_attachments_message
  on public.message_attachments (message_id);

-- Property members read enquiry, conversation, message, and
-- attachment rows for their assigned properties (or as
-- organization staff). All writes run through the lifecycle
-- RPCs, which execute under the service role and validate the
-- actor, ownership, and parent relationships in SQL.
drop policy if exists enquiries_access on public.enquiries;

create policy enquiries_member_read on public.enquiries
  for select
  using (public.is_property_member(property_id));

create policy enquiries_service_role on public.enquiries
  for all to service_role
  using (true)
  with check (true);

drop policy if exists conversations_access on public.conversations;

create policy conversations_member_read on public.conversations
  for select
  using (public.is_property_member(property_id));

create policy conversations_service_role on public.conversations
  for all to service_role
  using (true)
  with check (true);

drop policy if exists messages_access on public.conversation_messages;

create policy conversation_messages_member_read on public.conversation_messages
  for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and public.is_property_member(c.property_id)
    )
  );

create policy conversation_messages_service_role on public.conversation_messages
  for all to service_role
  using (true)
  with check (true);

create policy message_attachments_member_read on public.message_attachments
  for select
  using (
    exists (
      select 1 from public.conversation_messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_id
        and public.is_property_member(c.property_id)
    )
  );

create policy message_attachments_service_role on public.message_attachments
  for all to service_role
  using (true)
  with check (true);

-- Actor-aware membership check. The shared
-- is_property_member helper reads auth.uid(), which is
-- null when RPCs are invoked by edge functions under
-- the service role. Lifecycle RPCs therefore check the
-- explicit actor id against property assignments and
-- organization memberships instead.
create or replace function public.is_property_member_actor(
  target_property uuid,
  actor_id uuid
)
returns boolean
language sql security definer set search_path = public
as $$
  select
    exists (
      select 1 from public.property_users p
      where p.property_id = target_property
        and p.user_id = actor_id
    ) or exists (
      select 1 from public.properties p
      join public.organization_members m
        on m.organization_id = p.organization_id
      where p.id = target_property
        and m.user_id = actor_id
    );
$$;

-- Validated status transitions. Terminal states (won, lost) can
-- only move to closed; closed enquiries can be reopened. Every
-- transition is recorded in the audit log with the from/to
-- states, so history is preserved.
create or replace function public.enquiry_transition_allowed(
  p_current public.enquiry_status,
  p_next public.enquiry_status
)
returns boolean
language sql security definer set search_path = public
as $$
  select (p_current, p_next) in (
    ('new', 'open'),
    ('new', 'closed'),
    ('open', 'waiting'),
    ('open', 'won'),
    ('open', 'lost'),
    ('open', 'closed'),
    ('waiting', 'open'),
    ('waiting', 'won'),
    ('waiting', 'lost'),
    ('waiting', 'closed'),
    ('won', 'closed'),
    ('lost', 'closed'),
    ('closed', 'open')
  );
$$;

-- Enquiry create/import. Authorization: organization admins, or
-- property_owner/property_manager assignments on the target
-- property. A null enquiry id creates a new enquiry (always
-- unread); an existing id updates classification, assignment,
-- follow-up, and urgency. Imports carry an external reference
-- that is unique per property, so re-importing the same enquiry
-- is rejected instead of duplicated.
create or replace function public.upsert_enquiry(
  p_enquiry_id uuid,
  p_organization_id uuid,
  p_property_id uuid,
  p_guest_id uuid,
  p_reservation_id uuid,
  p_channel text,
  p_source text,
  p_topic text,
  p_subject text,
  p_assigned_to uuid,
  p_follow_up_at timestamptz,
  p_urgent boolean,
  p_external_id text,
  p_actor_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_enquiry_id uuid;
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
    raise exception 'FORBIDDEN: only admins can manage enquiries';
  end if;
  if not exists (
    select 1 from public.properties p
    where p.id = p_property_id
      and p.organization_id = p_organization_id
  ) then
    raise exception 'VALIDATION_ERROR: property does not belong to this organization';
  end if;
  if p_channel is null or length(trim(p_channel)) = 0 then
    raise exception 'VALIDATION_ERROR: channel is required';
  end if;
  if p_source is not null and p_source not in (
    'website', 'booking', 'walk_in', 'phone', 'email', 'import', 'other'
  ) then
    raise exception 'VALIDATION_ERROR: source must be website, booking, walk_in, phone, email, import, or other';
  end if;
  if p_guest_id is not null and not exists (
    select 1 from public.guests g
    where g.id = p_guest_id
      and g.organization_id = p_organization_id
  ) then
    raise exception 'VALIDATION_ERROR: guest does not belong to this organization';
  end if;
  if p_reservation_id is not null and not exists (
    select 1 from public.reservations r
    where r.id = p_reservation_id
      and r.property_id = p_property_id
  ) then
    raise exception 'VALIDATION_ERROR: reservation does not belong to this property';
  end if;
  if p_assigned_to is not null and not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = p_assigned_to
      and m.status = 'active'
  ) then
    raise exception 'VALIDATION_ERROR: assignee must be an active organization member';
  end if;
  if p_follow_up_at is not null and p_follow_up_at <= now() then
    raise exception 'VALIDATION_ERROR: follow_up_at must be in the future';
  end if;
  if p_enquiry_id is null then
    begin
      insert into public.enquiries(
        property_id, guest_id, reservation_id, channel, source,
        topic, subject, assigned_to, follow_up_at, urgent,
        external_id, unread
      )
      values (
        p_property_id, p_guest_id, p_reservation_id, trim(p_channel),
        p_source, nullif(p_topic, ''), nullif(p_subject, ''),
        p_assigned_to, p_follow_up_at, coalesce(p_urgent, false),
        nullif(p_external_id, ''), true
      )
      returning id into v_enquiry_id;
    exception
      when unique_violation then
        raise exception 'CONFLICT: an enquiry with this external reference already exists for this property';
    end;
    v_action := 'enquiry.created';
  else
    if not exists (
      select 1 from public.enquiries e
      where e.id = p_enquiry_id
        and e.property_id = p_property_id
    ) then
      raise exception 'NOT_FOUND: enquiry not found on this property';
    end if;
    begin
      update public.enquiries
        set guest_id = p_guest_id,
            reservation_id = p_reservation_id,
            channel = trim(p_channel),
            source = p_source,
            topic = nullif(p_topic, ''),
            subject = nullif(p_subject, ''),
            assigned_to = p_assigned_to,
            follow_up_at = p_follow_up_at,
            urgent = coalesce(p_urgent, false),
            external_id = nullif(p_external_id, ''),
            updated_at = now()
        where id = p_enquiry_id
        returning id into v_enquiry_id;
    exception
      when unique_violation then
        raise exception 'CONFLICT: an enquiry with this external reference already exists for this property';
    end;
    v_action := 'enquiry.updated';
  end if;
  insert into public.audit_logs(
    organization_id, actor_user_id, action, entity_type, entity_id,
    property_id, metadata
  )
  values (
    p_organization_id, p_actor_id, v_action, 'enquiry',
    v_enquiry_id, p_property_id,
    jsonb_build_object(
      'channel', p_channel,
      'source', p_source,
      'topic', p_topic,
      'urgent', coalesce(p_urgent, false)
    )
  );
  return v_enquiry_id;
end;
$$;

-- Enquiry status transitions, outcome, and follow-up. p_status is
-- null to keep the current status. Follow-up and outcome are
-- updated in the same call. Invalid transitions are rejected so
-- the pipeline history stays truthful.
create or replace function public.update_enquiry_status(
  p_enquiry_id uuid,
  p_status public.enquiry_status,
  p_outcome text,
  p_follow_up_at timestamptz,
  p_actor_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_record record;
  v_previous public.enquiry_status;
begin
  perform public.assert_actor(p_actor_id);
  select e.property_id, p.organization_id, e.status
    into v_record
    from public.enquiries e
    join public.properties p on p.id = e.property_id
    where e.id = p_enquiry_id;
  if not found then
    raise exception 'NOT_FOUND: enquiry not found';
  end if;
  if not (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = v_record.organization_id
        and m.user_id = p_actor_id
        and m.role = 'agency_admin'
        and m.status = 'active'
    ) or exists (
      select 1 from public.property_users pu
      where pu.property_id = v_record.property_id
        and pu.user_id = p_actor_id
        and pu.role in ('property_owner', 'property_manager')
        and pu.status = 'active'
    )
  ) then
    raise exception 'FORBIDDEN: only admins can update enquiry status';
  end if;
  v_previous := v_record.status;
  if p_status is not null then
    if not public.enquiry_transition_allowed(v_previous, p_status) then
      raise exception 'VALIDATION_ERROR: invalid status transition from % to %', v_previous, p_status;
    end if;
  end if;
  if p_follow_up_at is not null and p_follow_up_at <= now() then
    raise exception 'VALIDATION_ERROR: follow_up_at must be in the future';
  end if;
  update public.enquiries
    set status = coalesce(p_status, status),
        outcome = coalesce(p_outcome, outcome),
        follow_up_at = coalesce(p_follow_up_at, follow_up_at),
        updated_at = now()
    where id = p_enquiry_id;
  insert into public.audit_logs(
    organization_id, actor_user_id, action, entity_type, entity_id,
    property_id, metadata
  )
  values (
    v_record.organization_id, p_actor_id, 'enquiry.status_changed',
    'enquiry', p_enquiry_id, v_record.property_id,
    jsonb_build_object(
      'from', v_previous::text,
      'to', coalesce(p_status, v_previous)::text,
      'outcome', p_outcome
    )
  );
end;
$$;

-- Conversation create with the opening guest message.
-- Authorization: organization admins, or property_owner/
-- property_manager of the property. Used by the import path and
-- by operators starting a conversation from an enquiry.
create or replace function public.start_conversation(
  p_organization_id uuid,
  p_property_id uuid,
  p_enquiry_id uuid,
  p_channel text,
  p_guest_body text,
  p_external_thread_id text,
  p_actor_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_conversation_id uuid;
  v_message_id uuid;
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
    raise exception 'FORBIDDEN: only admins can start conversations';
  end if;
  if not exists (
    select 1 from public.properties p
    where p.id = p_property_id
      and p.organization_id = p_organization_id
  ) then
    raise exception 'VALIDATION_ERROR: property does not belong to this organization';
  end if;
  if p_enquiry_id is not null and not exists (
    select 1 from public.enquiries e
    where e.id = p_enquiry_id
      and e.property_id = p_property_id
  ) then
    raise exception 'VALIDATION_ERROR: enquiry does not belong to this property';
  end if;
  if p_channel is null or length(trim(p_channel)) = 0 then
    raise exception 'VALIDATION_ERROR: channel is required';
  end if;
  insert into public.conversations(
    property_id, enquiry_id, channel, external_thread_id
  )
  values (
    p_property_id, p_enquiry_id, trim(p_channel),
    nullif(p_external_thread_id, '')
  )
  returning id into v_conversation_id;
  if p_guest_body is not null and length(trim(p_guest_body)) > 0 then
    insert into public.conversation_messages(conversation_id, role, body)
    values (v_conversation_id, 'guest', trim(p_guest_body))
    returning id into v_message_id;
  end if;
  insert into public.audit_logs(
    organization_id, actor_user_id, action, entity_type, entity_id,
    property_id, metadata
  )
  values (
    p_organization_id, p_actor_id, 'conversation.created',
    'conversation', v_conversation_id, p_property_id,
    jsonb_build_object('channel', p_channel)
  );
  return v_conversation_id;
end;
$$;

-- Human reply on a conversation timeline. Authorization: any
-- property member (assigned property users and organization
-- staff). The role is fixed to 'human'; 'ai' messages are
-- reserved for the Phase 6 approval pipeline.
create or replace function public.send_message(
  p_conversation_id uuid,
  p_body text,
  p_external_message_id text,
  p_actor_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_property_id uuid;
  v_organization_id uuid;
  v_message_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  select c.property_id, p.organization_id
    into v_property_id, v_organization_id
    from public.conversations c
    join public.properties p on p.id = c.property_id
    where c.id = p_conversation_id;
  if not found then
    raise exception 'NOT_FOUND: conversation not found';
  end if;
  if not public.is_property_member_actor(v_property_id, p_actor_id) then
    raise exception 'FORBIDDEN: only property members can send messages';
  end if;
  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'VALIDATION_ERROR: message body is required';
  end if;
  insert into public.conversation_messages(
    conversation_id, role, body, external_message_id
  )
  values (
    p_conversation_id, 'human', trim(p_body),
    nullif(p_external_message_id, '')
  )
  returning id into v_message_id;
  update public.conversations
    set updated_at = now()
    where id = p_conversation_id;
  insert into public.audit_logs(
    organization_id, actor_user_id, action, entity_type, entity_id,
    property_id, metadata
  )
  values (
    v_organization_id, p_actor_id, 'message.sent',
    'conversation_message', v_message_id, v_property_id,
    jsonb_build_object('conversation_id', p_conversation_id)
  );
  return v_message_id;
end;
$$;

-- Attachment metadata. Only validated metadata is recorded: the
-- storage object reference, an allowlisted MIME type, a bounded
-- size, and an optional SHA-256 checksum. Attachments start as
-- pending scan. Authorization: any property member.
create or replace function public.add_message_attachment(
  p_message_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_checksum text,
  p_actor_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_property_id uuid;
  v_attachment_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  select c.property_id into v_property_id
    from public.conversation_messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = p_message_id;
  if not found then
    raise exception 'NOT_FOUND: message not found';
  end if;
  if not public.is_property_member_actor(v_property_id, p_actor_id) then
    raise exception 'FORBIDDEN: only property members can add attachments';
  end if;
  if p_storage_path is null or length(trim(p_storage_path)) = 0 then
    raise exception 'VALIDATION_ERROR: storage path is required';
  end if;
  if p_mime_type not in (
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain'
  ) then
    raise exception 'VALIDATION_ERROR: mime type is not allowed';
  end if;
  if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 26214400 then
    raise exception 'VALIDATION_ERROR: size must be between 1 byte and 25 MiB';
  end if;
  if p_checksum is not null and p_checksum !~ '^[0-9a-f]{64}$' then
    raise exception 'VALIDATION_ERROR: checksum must be a SHA-256 hex digest';
  end if;
  insert into public.message_attachments(
    message_id, storage_path, mime_type, size_bytes, checksum,
    scan_status
  )
  values (
    p_message_id, trim(p_storage_path), p_mime_type, p_size_bytes,
    p_checksum, 'pending'
  )
  returning id into v_attachment_id;
  insert into public.audit_logs(
    organization_id, actor_user_id, action, entity_type, entity_id,
    property_id, metadata
  )
  values (
    (select p.organization_id from public.properties p where p.id = v_property_id),
    p_actor_id, 'attachment.added',
    'message_attachment', v_attachment_id, v_property_id,
    jsonb_build_object(
      'message_id', p_message_id,
      'mime_type', p_mime_type,
      'size_bytes', p_size_bytes
    )
  );
  return v_attachment_id;
end;
$$;

-- Human takeover. Sets human_takeover and pauses automation for
-- the conversation. Automation must not execute while a human is
-- in control. Authorization: any property member.
create or replace function public.takeover_conversation(
  p_conversation_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_record record;
  v_message_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  select c.property_id, p.organization_id, c.human_takeover
    into v_record
    from public.conversations c
    join public.properties p on p.id = c.property_id
    where c.id = p_conversation_id;
  if not found then
    raise exception 'NOT_FOUND: conversation not found';
  end if;
  if not public.is_property_member_actor(v_record.property_id, p_actor_id) then
    raise exception 'FORBIDDEN: only property members can take over conversations';
  end if;
  if v_record.human_takeover then
    raise exception 'CONFLICT: conversation is already under human control';
  end if;
  update public.conversations
    set human_takeover = true,
        automation_paused = true,
        updated_at = now()
    where id = p_conversation_id;
  insert into public.conversation_messages(conversation_id, role, body)
    values (
      p_conversation_id, 'system',
      'Human takeover: automation paused'
    )
    returning id into v_message_id;
  insert into public.audit_logs(
    organization_id, actor_user_id, action, entity_type, entity_id,
    property_id, metadata
  )
  values (
    v_record.organization_id, p_actor_id, 'conversation.takeover',
    'conversation', p_conversation_id, v_record.property_id,
    jsonb_build_object('automation_paused', true)
  );
end;
$$;

-- Explicit handback. Only allowed when the conversation is under
-- human control; automation resumes only on an explicit handback.
-- Authorization: any property member.
create or replace function public.handback_conversation(
  p_conversation_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_record record;
  v_message_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  select c.property_id, p.organization_id, c.human_takeover
    into v_record
    from public.conversations c
    join public.properties p on p.id = c.property_id
    where c.id = p_conversation_id;
  if not found then
    raise exception 'NOT_FOUND: conversation not found';
  end if;
  if not public.is_property_member_actor(v_record.property_id, p_actor_id) then
    raise exception 'FORBIDDEN: only property members can hand back conversations';
  end if;
  if not v_record.human_takeover then
    raise exception 'CONFLICT: conversation is not under human control';
  end if;
  update public.conversations
    set human_takeover = false,
        automation_paused = false,
        updated_at = now()
    where id = p_conversation_id;
  insert into public.conversation_messages(conversation_id, role, body)
    values (
      p_conversation_id, 'system',
      'Handback: automation resumed'
    )
    returning id into v_message_id;
  insert into public.audit_logs(
    organization_id, actor_user_id, action, entity_type, entity_id,
    property_id, metadata
  )
  values (
    v_record.organization_id, p_actor_id, 'conversation.handback',
    'conversation', p_conversation_id, v_record.property_id,
    jsonb_build_object('automation_paused', false)
  );
end;
$$;

-- Mark an enquiry as read. Authorization: any property member.
create or replace function public.mark_enquiry_read(
  p_enquiry_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_property_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  select property_id into v_property_id
    from public.enquiries
    where id = p_enquiry_id;
  if not found then
    raise exception 'NOT_FOUND: enquiry not found';
  end if;
  if not public.is_property_member_actor(v_property_id, p_actor_id) then
    raise exception 'FORBIDDEN: only property members can read enquiries';
  end if;
  update public.enquiries
    set unread = false,
        updated_at = now()
    where id = p_enquiry_id;
end;
$$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
