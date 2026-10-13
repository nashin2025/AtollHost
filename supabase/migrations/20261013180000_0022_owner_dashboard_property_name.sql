-- 0022: include the property name in the owner dashboard payload.
-- The owner portal UI needs to name each property the owner can select;
-- owners cannot read the properties table (member-only policy), so the
-- dashboard RPC is the only place the name can come from.

create or replace function public.get_owner_dashboard(
  p_owner_id uuid,
  p_property_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_access record;
  v_result jsonb;
begin
  select * into v_access from public.owner_property_access
  where owner_id = p_owner_id and property_id = p_property_id and revoked_at is null;
  if not found then
    raise exception 'FORBIDDEN: owner does not have access to this property';
  end if;

  select jsonb_build_object(
    'property_name', p.name,
    'revenue', jsonb_build_object(
      'total', coalesce(sum(r.total_amount) filter (where r.total_amount is not null), 0),
      'last_30d', coalesce(sum(r.total_amount) filter (where r.total_amount is not null and r.check_in >= now() - interval '30 days'), 0),
      'currency', 'MVR'
    ),
    'occupancy', jsonb_build_object(
      'total_rooms', count(distinct rm.id),
      'occupied_last_30d', count(distinct r.id) filter (where r.check_in <= now() and r.check_out >= now() - interval '30 days')
    ),
    'enquiries', jsonb_build_object(
      'total', count(distinct e.id),
      'open', count(distinct e.id) filter (where e.status in ('new','open','waiting')),
      'won', count(distinct e.id) filter (where e.status = 'won'),
      'conversion_rate', case when count(distinct e.id) > 0
        then round(count(distinct e.id) filter (where e.status = 'won')::numeric / count(distinct e.id) * 100, 2)
        else 0 end
    ),
    'reviews', jsonb_build_object(
      'total', count(distinct rv.id),
      'published', count(distinct rv.id) filter (where rv.status = 'published'),
      'avg_rating', round(avg(rv.rating) filter (where rv.rating is not null)::numeric, 2)
    ),
    'tasks', jsonb_build_object(
      'total', count(distinct t.id),
      'completed', count(distinct t.id) filter (where t.status = 'done'),
      'overdue', count(distinct t.id) filter (where t.status in ('todo','in_progress') and t.due_at < now())
    ),
    'knowledge', jsonb_build_object(
      'total_facts', count(distinct k.id),
      'approved', count(distinct k.id) filter (where k.status = 'approved')
    )
  ) into v_result
  from public.properties p
  left join public.rooms rm on rm.property_id = p.id
  left join public.reservations r on r.property_id = p.id
  left join public.enquiries e on e.property_id = p.id
  left join public.reviews rv on rv.property_id = p.id
  left join public.tasks t on t.property_id = p.id
  left join public.knowledge_items k on k.property_id = p.id
  where p.id = p_property_id;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;
