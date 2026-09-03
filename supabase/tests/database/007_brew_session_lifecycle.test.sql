begin;

select plan(8);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  'd0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'brew-session@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.bean_profiles (id, user_id, origin_country_code, process, roast_level)
values (
  'd1000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'ET', 'washed', 'light'
);

insert into public.coffees (id, user_id, bean_profile_id, product_name)
values (
  'd2000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000001',
  'Guided Brew Coffee'
);

insert into public.dial_in_threads (id, user_id, coffee_id, primary_taste_goal)
values (
  'd3000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000001',
  'sweet'
);

insert into public.brew_plans (
  id, user_id, coffee_id, dial_in_thread_id, recipe_template_id,
  coffee_dose, water_amount, ratio, water_temperature, grind_level,
  target_brew_time_min, target_brew_time_max, expected_flavor,
  recommendation_source, recommendation_reason
)
values (
  'd4000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  15, 240, 16, 92, 'medium-fine', 135, 160,
  'Sweet and clean', 'official_rule', 'Brew Session test'
);

insert into public.brew_plan_steps (
  id, brew_plan_id, step_order, step_type, start_time, duration, target_water, note
)
values
  ('d5000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 1, 'pour', 0, null, 40, 'Bloom'),
  ('d5000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000001', 2, 'wait', 10, 30, null, 'Wait'),
  ('d5000000-0000-4000-8000-000000000003', 'd4000000-0000-4000-8000-000000000001', 3, 'pour', 40, null, 240, 'Final pour');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd0000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$insert into public.brew_sessions (
      id, user_id, brew_plan_id, started_at,
      actual_coffee_dose, actual_water_amount, actual_water_temperature
    ) values (
      'd6000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000001',
      'd4000000-0000-4000-8000-000000000001',
      '2026-09-02T01:00:00Z', 15, 240, 92
    ) on conflict (id) do nothing$$,
  'a stable client UUID creates a Brew Session idempotently'
);

select lives_ok(
  $$insert into public.brew_sessions (
      id, user_id, brew_plan_id, started_at,
      actual_coffee_dose, actual_water_amount, actual_water_temperature
    ) values (
      'd6000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000001',
      'd4000000-0000-4000-8000-000000000001',
      '2026-09-02T01:00:00Z', 15, 240, 92
    ) on conflict (id) do nothing$$,
  'retrying creation with the same UUID does not fail'
);

select is(
  (select count(*) from public.brew_sessions where id = 'd6000000-0000-4000-8000-000000000001'),
  1::bigint,
  'creation retry leaves exactly one Brew Session'
);

select is(
  (select brew_plan_id from public.brew_sessions where id = 'd6000000-0000-4000-8000-000000000001'),
  'd4000000-0000-4000-8000-000000000001'::uuid,
  'the Brew Session retains its Brew Plan relationship'
);

insert into public.brew_session_steps (
  brew_session_id, brew_plan_step_id, actual_start_time, actual_end_time, actual_water
)
values
  ('d6000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000001', 0, 11, 40),
  ('d6000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000002', 11, 42, null),
  ('d6000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000003', 42, 151, 240)
on conflict (brew_session_id, brew_plan_step_id) do update set
  actual_start_time = excluded.actual_start_time,
  actual_end_time = excluded.actual_end_time,
  actual_water = excluded.actual_water;

insert into public.brew_session_steps (
  brew_session_id, brew_plan_step_id, actual_start_time, actual_end_time, actual_water
)
values
  ('d6000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000001', 0, 11, 40),
  ('d6000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000002', 11, 42, null),
  ('d6000000-0000-4000-8000-000000000001', 'd5000000-0000-4000-8000-000000000003', 42, 151, 240)
on conflict (brew_session_id, brew_plan_step_id) do update set
  actual_start_time = excluded.actual_start_time,
  actual_end_time = excluded.actual_end_time,
  actual_water = excluded.actual_water;

select is(
  (select count(*) from public.brew_session_steps where brew_session_id = 'd6000000-0000-4000-8000-000000000001'),
  3::bigint,
  'step sync retry retains one row per planned step'
);

update public.brew_sessions
set status = 'completed', finished_at = '2026-09-02T01:02:31Z', actual_brew_time = 151
where id = 'd6000000-0000-4000-8000-000000000001' and status = 'brewing';

update public.brew_sessions
set status = 'completed', finished_at = '2026-09-02T01:03:00Z', actual_brew_time = 180
where id = 'd6000000-0000-4000-8000-000000000001' and status = 'brewing';

select is(
  (select status || ':' || actual_brew_time from public.brew_sessions where id = 'd6000000-0000-4000-8000-000000000001'),
  'completed:151'::text,
  'duplicate completion does not rewrite terminal execution data'
);

select is(
  (select count(*) from public.taste_feedback where brew_session_id = 'd6000000-0000-4000-8000-000000000001'),
  0::bigint,
  'Milestone 5 creates no Taste Feedback'
);

select is(
  (select count(*) from public.adjustment_suggestions where based_on_session_id = 'd6000000-0000-4000-8000-000000000001'),
  0::bigint,
  'Milestone 5 creates no Adjustment Suggestion'
);

select * from finish();
rollback;
