-- Required MVP reference data is deployed with migrations so production does not depend on seed.sql.
insert into public.recipe_templates (
  id, name, brewer_type, method_type, description, default_ratio,
  default_temperature, default_grind_level, expected_flavor, source, is_public, created_at
)
values
  ('10000000-0000-4000-8000-000000000001', 'Three Pour', 'v60', 'percolation', 'A balanced bloom followed by two staged pours.', 16.00, 92, 'medium-fine', 'Balanced sweetness and clarity', 'official', true, '2026-08-27 00:00:00+00'),
  ('10000000-0000-4000-8000-000000000002', '4:6', 'v60', 'percolation', 'Five evenly timed pours using the 4:6 structure as a conservative starting point.', 16.00, 92, 'medium-coarse', 'Bright, expressive, and balanced', 'official', true, '2026-08-27 00:00:00+00'),
  ('10000000-0000-4000-8000-000000000003', 'One Pour', 'v60', 'percolation', 'A bloom followed by one steady continuous pour.', 16.00, 92, 'medium', 'Round body and approachable sweetness', 'official', true, '2026-08-27 00:00:00+00')
on conflict (id) do update
set name = excluded.name,
    brewer_type = excluded.brewer_type,
    method_type = excluded.method_type,
    description = excluded.description,
    default_ratio = excluded.default_ratio,
    default_temperature = excluded.default_temperature,
    default_grind_level = excluded.default_grind_level,
    expected_flavor = excluded.expected_flavor,
    source = excluded.source,
    is_public = excluded.is_public,
    created_at = excluded.created_at;

delete from public.recipe_steps
where recipe_template_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003'
);

insert into public.recipe_steps (
  id, recipe_template_id, step_order, step_type, start_time, duration, target_water, note
)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1, 'pour', 0, null, 40, 'Bloom'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 2, 'pour', 40, null, 120, 'Second pour'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 3, 'pour', 80, null, 240, 'Final pour'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 1, 'pour', 0, null, 48, 'First 40% pour'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 2, 'pour', 45, null, 96, 'Second 40% pour'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', 3, 'pour', 90, null, 144, 'First 60% pour'),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002', 4, 'pour', 135, null, 192, 'Second 60% pour'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000002', 5, 'pour', 180, null, 240, 'Final pour'),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000003', 1, 'pour', 0, 10, 40, 'Bloom'),
  ('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000003', 2, 'wait', 10, 30, null, 'Wait for bloom'),
  ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000003', 3, 'pour', 40, 60, 240, 'Single continuous pour');

create function public.start_brew_session(
  p_session_id uuid,
  p_brew_plan_id uuid,
  p_started_at timestamptz
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.brew_plans%rowtype;
  v_existing public.brew_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication is required';
  end if;

  select * into v_plan
  from public.brew_plans
  where id = p_brew_plan_id and user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Brew Plan is unavailable';
  end if;

  select * into v_existing
  from public.brew_sessions
  where id = p_session_id and user_id = v_user_id;

  if found then
    if v_existing.brew_plan_id <> p_brew_plan_id
      or v_existing.started_at is distinct from p_started_at then
      raise exception using errcode = '22023', message = 'Brew Session identity does not match this execution';
    end if;
    return v_existing.id;
  end if;

  insert into public.brew_sessions (
    id, user_id, brew_plan_id, started_at, actual_coffee_dose,
    actual_water_amount, actual_water_temperature, status
  ) values (
    p_session_id, v_user_id, v_plan.id, p_started_at, v_plan.coffee_dose,
    v_plan.water_amount, v_plan.water_temperature, 'brewing'
  );
  return p_session_id;
end;
$$;

create function public.update_brew_plan(
  p_brew_plan_id uuid,
  p_coffee_dose numeric,
  p_water_amount numeric,
  p_ratio numeric,
  p_water_temperature smallint,
  p_grind_level text,
  p_target_brew_time_min integer,
  p_target_brew_time_max integer,
  p_steps jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.brew_plans%rowtype;
  v_saved_step_count integer;
  v_payload_step_count integer;
  v_final_pour numeric;
  v_edit_note constant text := 'This Brew Plan was manually edited after recommendation.';
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication is required';
  end if;

  select * into v_plan
  from public.brew_plans
  where id = p_brew_plan_id and user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Brew Plan is unavailable';
  end if;

  if exists (select 1 from public.brew_sessions where brew_plan_id = v_plan.id) then
    raise exception using errcode = '55000', message = 'A Brew Plan cannot be edited after a Brew Session has started';
  end if;

  if p_coffee_dose is null
    or p_water_amount is null
    or p_ratio is null
    or p_water_temperature is null
    or p_grind_level is null
    or p_target_brew_time_min is null
    or p_target_brew_time_max is null
    or p_coffee_dose not between 1 and 100
    or p_water_amount not between 1 and 2000
    or p_ratio not between 1 and 100
    or p_water_temperature not between 1 and 100
    or char_length(trim(p_grind_level)) not between 1 and 80
    or p_target_brew_time_min not between 0 and 3600
    or p_target_brew_time_max not between p_target_brew_time_min and 3600
    or abs(p_water_amount - round(p_coffee_dose * p_ratio, 2)) > 0.1 then
    raise exception using errcode = '22023', message = 'Brew Plan parameters are structurally inconsistent';
  end if;

  if p_steps is null or jsonb_typeof(p_steps) <> 'array' then
    raise exception using errcode = '22023', message = 'Brew Plan steps must be an array';
  end if;

  select count(*) into v_saved_step_count from public.brew_plan_steps where brew_plan_id = v_plan.id;
  select count(*) into v_payload_step_count from jsonb_array_elements(p_steps);
  if v_saved_step_count = 0 or v_payload_step_count <> v_saved_step_count then
    raise exception using errcode = '22023', message = 'Brew Plan steps do not match the saved snapshot';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_steps) payload(value)
    where jsonb_typeof(value) <> 'object'
      or not (value ?& array['id', 'startTime', 'duration', 'targetWater'])
      or jsonb_typeof(value -> 'id') <> 'string'
      or jsonb_typeof(value -> 'startTime') <> 'number'
      or (value -> 'duration' <> 'null'::jsonb and jsonb_typeof(value -> 'duration') <> 'number')
      or (value -> 'targetWater' <> 'null'::jsonb and jsonb_typeof(value -> 'targetWater') <> 'number')
  ) then
    raise exception using errcode = '22023', message = 'Brew Plan step payload is malformed';
  end if;

  if exists (
    with payload as (
      select (value ->> 'id')::uuid as id,
        (value ->> 'startTime')::numeric as start_time,
        case when value -> 'duration' = 'null'::jsonb then null else (value ->> 'duration')::numeric end as duration,
        case when value -> 'targetWater' = 'null'::jsonb then null else (value ->> 'targetWater')::numeric end as target_water
      from jsonb_array_elements(p_steps)
    )
    select 1 from payload
    left join public.brew_plan_steps saved on saved.id = payload.id and saved.brew_plan_id = v_plan.id
    where saved.id is null
      or payload.start_time <> trunc(payload.start_time)
      or payload.start_time not between 0 and 3600
      or (payload.duration is not null and (payload.duration <> trunc(payload.duration) or payload.duration not between 0 and 3600))
      or (saved.step_type = 'pour' and (payload.target_water is null or payload.target_water not between 0.1 and 2000))
      or (saved.step_type = 'wait' and payload.target_water is not null)
      or saved.step_type not in ('pour', 'wait')
  ) or (select count(distinct value ->> 'id') from jsonb_array_elements(p_steps)) <> v_payload_step_count then
    raise exception using errcode = '22023', message = 'Brew Plan steps are structurally invalid';
  end if;

  if exists (
    with payload as (
      select saved.step_order,
        (value ->> 'startTime')::integer as start_time,
        case when value -> 'duration' = 'null'::jsonb then null else (value ->> 'duration')::integer end as duration
      from jsonb_array_elements(p_steps) payload(value)
      join public.brew_plan_steps saved on saved.id = (value ->> 'id')::uuid and saved.brew_plan_id = v_plan.id
    ), ordered as (
      select *, lag(start_time) over (order by step_order) as previous_start,
        lag(start_time + coalesce(duration, 0)) over (order by step_order) as previous_end
      from payload
    )
    select 1 from ordered
    where (step_order = 1 and start_time <> 0)
      or (previous_start is not null and start_time <= previous_start)
      or (previous_end is not null and start_time < previous_end)
      or (step_order = v_saved_step_count and p_target_brew_time_max < start_time)
  ) then
    raise exception using errcode = '22023', message = 'Brew Plan step timing is inconsistent';
  end if;

  if exists (
    with pours as (
      select saved.step_order, (value ->> 'targetWater')::numeric as target_water
      from jsonb_array_elements(p_steps) payload(value)
      join public.brew_plan_steps saved on saved.id = (value ->> 'id')::uuid and saved.brew_plan_id = v_plan.id
      where saved.step_type = 'pour'
    ), ordered as (
      select *, lag(target_water) over (order by step_order) as previous_target from pours
    )
    select 1 from ordered where previous_target is not null and target_water + 0.1 < previous_target
  ) then
    raise exception using errcode = '22023', message = 'Cumulative Pour targets cannot move backward';
  end if;

  select (value ->> 'targetWater')::numeric into v_final_pour
  from jsonb_array_elements(p_steps) payload(value)
  join public.brew_plan_steps saved on saved.id = (value ->> 'id')::uuid and saved.brew_plan_id = v_plan.id
  where saved.step_type = 'pour'
  order by saved.step_order desc limit 1;
  if v_final_pour is null or abs(v_final_pour - p_water_amount) > 0.1 then
    raise exception using errcode = '22023', message = 'Final cumulative Pour target must equal total water';
  end if;

  update public.brew_plan_steps saved
  set start_time = payload.start_time, duration = payload.duration, target_water = payload.target_water
  from (
    select (value ->> 'id')::uuid as id,
      (value ->> 'startTime')::integer as start_time,
      case when value -> 'duration' = 'null'::jsonb then null else (value ->> 'duration')::integer end as duration,
      case when value -> 'targetWater' = 'null'::jsonb then null else (value ->> 'targetWater')::numeric end as target_water
    from jsonb_array_elements(p_steps)
  ) payload
  where saved.id = payload.id and saved.brew_plan_id = v_plan.id;

  update public.brew_plans
  set coffee_dose = p_coffee_dose, water_amount = p_water_amount, ratio = p_ratio,
    water_temperature = p_water_temperature, grind_level = trim(p_grind_level),
    target_brew_time_min = p_target_brew_time_min, target_brew_time_max = p_target_brew_time_max,
    recommendation_source = 'manual',
    recommendation_reason = case when position(v_edit_note in recommendation_reason) > 0
      then recommendation_reason else recommendation_reason || E'\n\n' || v_edit_note end
  where id = v_plan.id and user_id = v_user_id;
  return v_plan.id;
end;
$$;

revoke all on function public.start_brew_session(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.start_brew_session(uuid, uuid, timestamptz) to authenticated, service_role;
revoke all on function public.update_brew_plan(uuid, numeric, numeric, numeric, smallint, text, integer, integer, jsonb) from public, anon;
grant execute on function public.update_brew_plan(uuid, numeric, numeric, numeric, smallint, text, integer, integer, jsonb) to authenticated, service_role;
