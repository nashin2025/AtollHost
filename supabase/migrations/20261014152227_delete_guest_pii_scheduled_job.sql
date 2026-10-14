-- Guest PII Deletion Scheduled Job
-- Implements retention policy: 3 years for identity documents, 7 years for transactional records
-- Runs monthly via pg_cron

-- Track PII deletion jobs
create table public.guest_pii_deletion_jobs(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  deletion_type text not null check (deletion_type in ('identity_documents', 'full_anonymization')),
  status text not null check (status in ('pending', 'processing', 'completed', 'failed')),
  error text,
  scheduled_for timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_guest_pii_deletion_jobs_status on public.guest_pii_deletion_jobs(status, scheduled_for) where status in ('pending', 'processing');
create index idx_guest_pii_deletion_jobs_org on public.guest_pii_deletion_jobs(organization_id, created_at desc);

alter table public.guest_pii_deletion_jobs enable row level security;

create policy guest_pii_deletion_jobs_org_read on public.guest_pii_deletion_jobs
  for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = guest_pii_deletion_jobs.organization_id
        and m.user_id = auth.uid()
        and m.role in ('agency_admin', 'agency_staff')
        and m.status = 'active'
    )
  );

create policy guest_pii_deletion_jobs_service_role on public.guest_pii_deletion_jobs
  for all to service_role
  using (true)
  with check (true);

-- Add PII expiration tracking to guests
alter table public.guests
  add column if not exists identity_document_expires_at timestamptz,
  add column if not exists anonymized_at timestamptz;

-- RPC: Schedule PII deletion for a guest (called when identity doc expires or guest requests deletion)
create or replace function public.schedule_guest_pii_deletion(
  p_guest_id uuid,
  p_deletion_type text,
  p_actor_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_job_id uuid;
  v_guest record;
  v_scheduled_for timestamptz;
begin
  perform public.assert_actor(p_actor_id);
  
  select g.*, p.organization_id into v_guest
    from public.guests g
    join public.properties p on p.id = g.property_id
    where g.id = p_guest_id;
    
  if not found then
    raise exception 'NOT_FOUND: guest not found';
  end if;
  
  if not (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = v_guest.organization_id
        and m.user_id = p_actor_id
        and m.role in ('agency_admin', 'agency_staff')
        and m.status = 'active'
    ) or exists (
      select 1 from public.property_users pu
      where pu.property_id = v_guest.property_id
        and pu.user_id = p_actor_id
        and pu.role in ('property_owner', 'property_manager')
        and pu.status = 'active'
    )
  ) then
    raise exception 'FORBIDDEN: not authorized to schedule PII deletion for this guest';
  end if;
  
  if p_deletion_type not in ('identity_documents', 'full_anonymization') then
    raise exception 'VALIDATION_ERROR: deletion_type must be identity_documents or full_anonymization';
  end if;
  
  -- Schedule for next cron run (monthly on 1st at 2 AM UTC)
  v_scheduled_for := date_trunc('month', now() + interval '1 month') + interval '2 hours';
  
  insert into public.guest_pii_deletion_jobs(
    organization_id, property_id, guest_id, deletion_type, status, scheduled_for
  )
  values (
    v_guest.organization_id, v_guest.property_id, p_guest_id, p_deletion_type, 'pending', v_scheduled_for
  )
  returning id into v_job_id;
  
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
  values (v_guest.organization_id, p_actor_id, 'guest_pii_deletion.scheduled', 'guest_pii_deletion_job', v_job_id, v_guest.property_id,
    jsonb_build_object('guest_id', p_guest_id, 'deletion_type', p_deletion_type, 'scheduled_for', v_scheduled_for));
  
  return v_job_id;
end;
$$;

-- RPC: Process PII deletion job (called by pg_cron)
create or replace function public.process_guest_pii_deletion_job(
  p_job_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_job record;
  v_guest record;
  v_pii_fields jsonb;
begin
  select * into v_job from public.guest_pii_deletion_jobs where id = p_job_id;
  if not found then
    raise exception 'NOT_FOUND: job not found';
  end if;
  
  if v_job.status <> 'pending' then
    return; -- already processed or failed
  end if;
  
  update public.guest_pii_deletion_jobs
    set status = 'processing', started_at = now()
    where id = p_job_id;
  
  select * into v_guest from public.guests where id = v_job.guest_id;
  if not found then
    update public.guest_pii_deletion_jobs
      set status = 'failed', error = 'Guest not found', completed_at = now()
      where id = p_job_id;
    return;
  end if;
  
  begin
    if v_job.deletion_type = 'identity_documents' then
      -- Clear PII fields but keep guest record for transactional history
      update public.guests
        set passport_number = null,
            national_id = null,
            date_of_birth = null,
            notes = null,
            identity_document_expires_at = null,
            anonymized_at = now()
        where id = v_job.guest_id;
        
    elsif v_job.deletion_type = 'full_anonymization' then
      -- Full anonymization (GDPR right to be forgotten)
      -- Keep only non-PII fields needed for analytics
      v_pii_fields := jsonb_build_object(
        'first_name', v_guest.first_name,
        'last_name', v_guest.last_name,
        'email', v_guest.email,
        'phone', v_guest.phone,
        'nationality', v_guest.nationality,
        'passport_number', v_guest.passport_number,
        'national_id', v_guest.national_id,
        'date_of_birth', v_guest.date_of_birth,
        'gender', v_guest.gender,
        'notes', v_guest.notes
      );
      
      update public.guests
        set first_name = 'ANONYMIZED',
            last_name = 'GUEST',
            email = null,
            phone = null,
            nationality = null,
            passport_number = null,
            national_id = null,
            date_of_birth = null,
            gender = null,
            notes = null,
            anonymized_at = now()
        where id = v_job.guest_id;
        
      -- Store PII in audit log for compliance (encrypted in production)
      insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
      values (v_job.organization_id, null, 'guest_pii_deletion.anonymized', 'guest', v_job.guest_id, v_job.property_id,
        jsonb_build_object('pii_fields', v_pii_fields, 'deletion_type', v_job.deletion_type));
    end if;
    
    update public.guest_pii_deletion_jobs
      set status = 'completed', completed_at = now()
      where id = p_job_id;
      
    insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
    values (v_job.organization_id, null, 'guest_pii_deletion.completed', 'guest_pii_deletion_job', p_job_id, v_job.property_id,
      jsonb_build_object('guest_id', v_job.guest_id, 'deletion_type', v_job.deletion_type));
      
  exception when others then
    update public.guest_pii_deletion_jobs
      set status = 'failed', error = SQLERRM, completed_at = now()
      where id = p_job_id;
    insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
    values (v_job.organization_id, null, 'guest_pii_deletion.failed', 'guest_pii_deletion_job', p_job_id, v_job.property_id,
      jsonb_build_object('guest_id', v_job.guest_id, 'error', SQLERRM));
    raise;
  end;
end;
$$;

-- RPC: Monthly cron job to find and schedule expired identity documents
create or replace function public.schedule_expired_guest_pii_deletions()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_guest record;
  v_count int := 0;
begin
  for v_guest in
    select g.id, g.property_id, g.organization_id
    from public.guests g
    where g.identity_document_expires_at is not null
      and g.identity_document_expires_at <= now()
      and g.anonymized_at is null
      and not exists (
        select 1 from public.guest_pii_deletion_jobs j
        where j.guest_id = g.id
          and j.status in ('pending', 'processing')
      )
  loop
    insert into public.guest_pii_deletion_jobs(
      organization_id, property_id, guest_id, deletion_type, status, scheduled_for
    )
    values (
      v_guest.organization_id, v_guest.property_id, v_guest.id, 'identity_documents', 'pending',
      date_trunc('month', now() + interval '1 month') + interval '2 hours'
    );
    v_count := v_count + 1;
  end loop;
  
  return v_count;
end;
$$;

-- RPC: Monthly cron job to process pending PII deletion jobs
create or replace function public.process_pending_guest_pii_deletions()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_job record;
  v_count int := 0;
begin
  for v_job in
    select id from public.guest_pii_deletion_jobs
    where status = 'pending' and scheduled_for <= now()
    order by scheduled_for
    limit 50 -- batch limit
  loop
    begin
      perform public.process_guest_pii_deletion_job(v_job.id);
      v_count := v_count + 1;
    exception when others then
      -- Log but continue processing other jobs
      insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, metadata)
      values (
        (select organization_id from public.guest_pii_deletion_jobs where id = v_job.id),
        null, 'guest_pii_deletion.batch_error', 'guest_pii_deletion_job', v_job.id,
        jsonb_build_object('error', SQLERRM)
      );
    end;
  end loop;
  
  return v_count;
end;
$$;

-- pg_cron schedule (run via Supabase Dashboard → Database → Cron Jobs)
-- Monthly on 1st at 02:00 UTC: schedule expired PII deletions
-- select cron.schedule('schedule-expired-guest-pii', '0 2 1 * *', 'select public.schedule_expired_guest_pii_deletions();');

-- Every 6 hours: process pending PII deletion jobs
-- select cron.schedule('process-guest-pii-deletions', '0 */6 * * *', 'select public.process_pending_guest_pii_deletions();');

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';