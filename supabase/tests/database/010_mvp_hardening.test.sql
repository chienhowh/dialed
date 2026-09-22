begin;

select plan(18);

select has_function(
  'public', 'start_brew_session', array['uuid', 'uuid', 'timestamp with time zone'],
  'atomic Brew Session start RPC exists'
);
select has_function(
  'public', 'update_brew_plan',
  array['uuid', 'numeric', 'numeric', 'numeric', 'smallint', 'text', 'integer', 'integer', 'jsonb'],
  'atomic Brew Plan edit RPC exists'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated',
    'hardening-owner@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '71bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated',
    'hardening-other@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.bean_profiles (id, user_id, origin_country_code, process, roast_level)
values
  ('72000000-0000-4000-8000-000000000001', '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ET', 'washed', 'light'),
  ('72000000-0000-4000-8000-000000000002', '71bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'KE', 'washed', 'medium');

insert into public.coffees (id, user_id, bean_profile_id, product_name)
values
  ('73000000-0000-4000-8000-000000000001', '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '72000000-0000-4000-8000-000000000001', 'Hardening Coffee'),
  ('73000000-0000-4000-8000-000000000002', '71bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '72000000-0000-4000-8000-000000000002', 'Other Coffee');

insert into public.dial_in_threads (id, user_id, coffee_id, primary_taste_goal)
values
  ('74000000-0000-4000-8000-000000000001', '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '73000000-0000-4000-8000-000000000001', 'sweet'),
  ('74000000-0000-4000-8000-000000000002', '71bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '73000000-0000-4000-8000-000000000002', 'bright');

insert into public.brew_plans (
  id, user_id, coffee_id, dial_in_thread_id, recipe_template_id,
  coffee_dose, water_amount, ratio, water_temperature, grind_level,
  target_brew_time_min, target_brew_time_max, expected_flavor,
  recommendation_source, recommendation_reason
)
values
  (
    '75000000-0000-4000-8000-000000000001', '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '73000000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', 15, 240, 16, 92, 'medium-fine',
    135, 160, 'Sweet and clean', 'official_rule', 'Original reason'
  ),
  (
    '75000000-0000-4000-8000-000000000002', '71bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '73000000-0000-4000-8000-000000000002', '74000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001', 15, 240, 16, 92, 'medium',
    135, 160, 'Bright and clean', 'official_rule', 'Other reason'
  );

insert into public.brew_plan_steps (
  id, brew_plan_id, step_order, step_type, start_time, duration, target_water, note
)
values
  ('76000000-0000-4000-8000-000000000001', '75000000-0000-4000-8000-000000000001', 1, 'pour', 0, null, 40, 'Bloom'),
  ('76000000-0000-4000-8000-000000000002', '75000000-0000-4000-8000-000000000001', 2, 'pour', 40, null, 120, 'Second'),
  ('76000000-0000-4000-8000-000000000003', '75000000-0000-4000-8000-000000000001', 3, 'pour', 80, null, 240, 'Final'),
  ('76000000-0000-4000-8000-000000000004', '75000000-0000-4000-8000-000000000002', 1, 'pour', 0, null, 240, 'Only');

set local role authenticated;
select set_config('request.jwt.claim.sub', '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$select public.update_brew_plan(
    '75000000-0000-4000-8000-000000000001', 15, 250, 16.67, 93::smallint,
    'fine', 140, 170,
    '[{"id":"76000000-0000-4000-8000-000000000001","startTime":0,"duration":null,"targetWater":45},{"id":"76000000-0000-4000-8000-000000000002","startTime":45,"duration":null,"targetWater":125},{"id":"76000000-0000-4000-8000-000000000003","startTime":90,"duration":null,"targetWater":250}]'::jsonb
  )$$,
  'a coherent Brew Plan edit succeeds'
);
select is(
  (select coffee_dose::text || '/' || water_amount::text || '/' || ratio::text || '/' || water_temperature::text || '/' || grind_level
   from public.brew_plans where id = '75000000-0000-4000-8000-000000000001'),
  '15.00/250.00/16.67/93/fine',
  'the plan parameters update together'
);
select is(
  (select recommendation_source from public.brew_plans where id = '75000000-0000-4000-8000-000000000001'),
  'manual',
  'a manual edit records its provenance'
);
select ok(
  position('manually edited' in (
    select recommendation_reason from public.brew_plans where id = '75000000-0000-4000-8000-000000000001'
  )) > 0,
  'a manual edit appends its explanation'
);
select is(
  (select string_agg(start_time::text || ':' || target_water::text, ',' order by step_order)
   from public.brew_plan_steps where brew_plan_id = '75000000-0000-4000-8000-000000000001'),
  '0:45.00,45:125.00,90:250.00',
  'all snapshot steps update in the same operation'
);

select throws_ok(
  $$select public.update_brew_plan(
    '75000000-0000-4000-8000-000000000001', 15, 250, 16.67, 93::smallint,
    'coarse', 140, 170,
    '[{"id":"76000000-0000-4000-8000-000000000001","startTime":0,"duration":null,"targetWater":45},{"id":"76000000-0000-4000-8000-000000000002","startTime":45,"duration":null,"targetWater":125},{"id":"76000000-0000-4000-8000-000000000003","startTime":90,"duration":null,"targetWater":245}]'::jsonb
  )$$,
  '22023', null,
  'an inconsistent final cumulative target is rejected'
);
select is(
  (select grind_level || '/' || water_amount::text from public.brew_plans where id = '75000000-0000-4000-8000-000000000001'),
  'fine/250.00',
  'a rejected edit leaves plan parameters unchanged'
);
select is(
  (select target_water from public.brew_plan_steps where id = '76000000-0000-4000-8000-000000000003'),
  250.00::numeric,
  'a rejected edit leaves plan steps unchanged'
);
select throws_ok(
  $$select public.update_brew_plan(
    '75000000-0000-4000-8000-000000000001', 15, 250, 16.67, 93::smallint,
    'fine', 140, 170,
    '[{"id":"76000000-0000-4000-8000-000000000001","startTime":0}]'::jsonb
  )$$,
  '22023', null,
  'a malformed step payload is rejected before any mutation'
);

select throws_ok(
  $$select public.update_brew_plan(
    '75000000-0000-4000-8000-000000000002', 15, 240, 16, 92::smallint,
    'forbidden', 135, 160,
    '[{"id":"76000000-0000-4000-8000-000000000004","startTime":0,"duration":null,"targetWater":240}]'::jsonb
  )$$,
  '42501', null,
  'a user cannot edit another account plan through the RPC'
);

select lives_ok(
  $$select public.start_brew_session(
    '77000000-0000-4000-8000-000000000001',
    '75000000-0000-4000-8000-000000000001',
    '2026-09-21 08:00:00+00'::timestamptz
  )$$,
  'Brew Session start succeeds against the locked plan snapshot'
);
select is(
  (select actual_coffee_dose::text || '/' || actual_water_amount::text || '/' || actual_water_temperature::text
   from public.brew_sessions where id = '77000000-0000-4000-8000-000000000001'),
  '15.00/250.00/93',
  'the Brew Session receives one coherent plan snapshot'
);
select throws_ok(
  $$select public.update_brew_plan(
    '75000000-0000-4000-8000-000000000001', 15, 250, 16.67, 93::smallint,
    'fine', 140, 170,
    '[{"id":"76000000-0000-4000-8000-000000000001","startTime":0,"duration":null,"targetWater":45},{"id":"76000000-0000-4000-8000-000000000002","startTime":45,"duration":null,"targetWater":125},{"id":"76000000-0000-4000-8000-000000000003","startTime":90,"duration":null,"targetWater":250}]'::jsonb
  )$$,
  '55000', null,
  'editing is blocked once a Brew Session has started'
);
select is(
  public.start_brew_session(
    '77000000-0000-4000-8000-000000000001',
    '75000000-0000-4000-8000-000000000001',
    '2026-09-21 08:00:00+00'::timestamptz
  ),
  '77000000-0000-4000-8000-000000000001'::uuid,
  'retrying the same start is idempotent'
);
select throws_ok(
  $$select public.start_brew_session(
    '77000000-0000-4000-8000-000000000001',
    '75000000-0000-4000-8000-000000000001',
    '2026-09-21 08:00:01+00'::timestamptz
  )$$,
  '22023', null,
  'a reused Session ID with a different identity is rejected'
);
select throws_ok(
  $$select public.start_brew_session(
    '77000000-0000-4000-8000-000000000002',
    '75000000-0000-4000-8000-000000000002',
    '2026-09-21 08:00:00+00'::timestamptz
  )$$,
  '42501', null,
  'a user cannot start another account plan through the RPC'
);

select * from finish();
rollback;
