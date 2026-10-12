-- Corrective: recreate create_invitation with core gen_random_uuid() token
-- generation. pgcrypto's gen_random_bytes is unavailable on the hosted
-- project (extension creation is restricted), so use the CSPRNG-backed
-- core function available since PostgreSQL 13.
create or replace function public.create_invitation(p_organization_id uuid, p_email text, p_role public.app_role, p_actor_id uuid)
  returns table (invitation_id uuid, token text)
  language plpgsql security definer set search_path = public
as $$
declare
  v_token text;
  v_org_id uuid;
begin
  perform public.assert_actor(p_actor_id);
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = p_actor_id
      and m.role = 'agency_admin'
      and m.status = 'active'
  ) then
    raise exception 'FORBIDDEN: only organization admins can invite members';
  end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'VALIDATION_ERROR: a valid recipient email is required';
  end if;
  if exists (
    select 1 from public.organization_invitations i
    where i.organization_id = p_organization_id
      and lower(i.email) = lower(p_email)
      and i.accepted_at is null
      and i.revoked_at is null
  ) then
    raise exception 'CONFLICT: a pending invitation already exists for this email';
  end if;
  if exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id in (select id from auth.users where lower(email) = lower(p_email))
      and m.status = 'active'
  ) then
    raise exception 'CONFLICT: this user is already an active member';
  end if;
  v_token := replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');
  insert into public.organization_invitations(organization_id, email, role, token, invited_by, expires_at)
    values (p_organization_id, lower(p_email), p_role, v_token, p_actor_id, now() + interval '72 hours')
    returning id into invitation_id;
  token := v_token;
  insert into public.audit_logs(organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    values (p_organization_id, p_actor_id, 'invitation.created', 'organization_invitation', invitation_id,
      jsonb_build_object('email', lower(p_email), 'role', p_role::text));
  return next;
end;
$$;
