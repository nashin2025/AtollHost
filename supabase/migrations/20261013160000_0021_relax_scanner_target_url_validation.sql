-- 0021: accept real-world https URLs as scanner targets.
-- The regex from 0011 rejected bare-domain input that users reasonably
-- type, uppercase hosts, and query or fragment URLs with no path, so
-- scans failed with a 400 before any work happened. Trim the input,
-- match case-insensitively, and allow ? and # without a leading path.

create or replace function public.start_scanner_run(
  p_organization_id uuid,
  p_property_id uuid,
  p_target_name text,
  p_target_url text,
  p_actor_id uuid
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_org_id uuid;
  v_rate_key text;
  v_window timestamptz;
  v_audit_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  select organization_id into v_org_id
    from public.properties
    where id = p_property_id;
  if not found then
    raise exception 'NOT_FOUND: property not found';
  end if;
  if v_org_id <> p_organization_id then
    raise exception 'VALIDATION_ERROR: property does not belong to this organization';
  end if;
  if not (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id
        and m.user_id = p_actor_id
        and m.role in ('agency_admin', 'agency_staff')
        and m.status = 'active'
    ) or exists (
      select 1 from public.property_users pu
      where pu.property_id = p_property_id
        and pu.user_id = p_actor_id
        and pu.status = 'active'
    )
  ) then
    raise exception 'FORBIDDEN: only admins or assigned property members can start a scan';
  end if;
  if p_target_name is null or length(trim(p_target_name)) = 0 then
    raise exception 'VALIDATION_ERROR: target name is required';
  end if;

  -- Trim pasted whitespace, then require https. The match is case
  -- insensitive (hosts are case insensitive) and allows a query or
  -- fragment directly after the host, with no path.
  p_target_url := trim(p_target_url);
  if p_target_url is null
    or p_target_url !~* '^https://[a-z0-9.-]+(:[0-9]+)?([/?#].*)?$' then
    raise exception 'VALIDATION_ERROR: target must be an https URL';
  end if;
  -- Per-host cooldown. Small race window is acceptable for the MVP; the
  -- fetch itself is the real throttle. The host is lowercased so the
  -- cooldown applies regardless of the case the user typed.
  v_rate_key := 'scanner:' || lower(substring(p_target_url from '^https://([^/:]+)'));
  select window_start into v_window
    from public.rate_limits
    where key = v_rate_key;
  if found and v_window > now() - interval '60 seconds' then
    raise exception 'RATE_LIMITED: this target was scanned recently. Wait before scanning again.';
  end if;
  insert into public.rate_limits(key, count, window_start)
    values (v_rate_key, 1, now())
    on conflict (key) do update
      set count = public.rate_limits.count + 1,
          window_start = now();
  insert into public.scanner_audits(
    organization_id, property_id, target_name, target_url, status, created_by
  )
  values (p_organization_id, p_property_id, trim(p_target_name), p_target_url, 'in_progress', p_actor_id)
  returning id into v_audit_id;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, property_id, metadata)
    values (p_organization_id, p_actor_id, 'scanner.started', 'scanner_audit', v_audit_id, p_property_id,
      jsonb_build_object('target_name', p_target_name, 'target_url', p_target_url));
  return v_audit_id;
end;
$$;
