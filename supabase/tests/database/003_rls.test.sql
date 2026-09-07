begin;

select plan(19);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'owner-a@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'owner-b@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.bean_profiles (id, user_id, origin_country_code, process, roast_level)
values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ET', 'washed', 'light'),
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'KE', 'washed', 'light');

insert into public.coffees (id, user_id, bean_profile_id, product_name)
values
  ('a2000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1000000-0000-4000-8000-000000000001', 'Coffee A'),
  ('b2000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b1000000-0000-4000-8000-000000000001', 'Coffee B');

insert into public.dial_in_threads (id, user_id, coffee_id, primary_taste_goal)
values
  ('a3000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a2000000-0000-4000-8000-000000000001', 'sweet'),
  ('b3000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b2000000-0000-4000-8000-000000000001', 'bright');

insert into public.brew_plans (
  id, user_id, coffee_id, dial_in_thread_id, recipe_template_id,
  coffee_dose, water_amount, ratio, water_temperature, grind_level,
  target_brew_time_min, target_brew_time_max, expected_flavor,
  recommendation_source, recommendation_reason
)
values
  (
    'a4000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'a2000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', 15, 240, 16, 92, 'medium-fine',
    135, 160, 'Sweet and clean', 'official_rule', 'Test plan A'
  ),
  (
    'b4000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'b2000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', 15, 240, 16, 92, 'medium-fine',
    135, 160, 'Bright and clean', 'official_rule', 'Test plan B'
  );

insert into public.brew_plan_steps (id, brew_plan_id, step_order, step_type, start_time, target_water)
values
  ('a5000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 1, 'pour', 0, 40),
  ('b5000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', 1, 'pour', 0, 40);

insert into public.brew_sessions (id, user_id, brew_plan_id, started_at, status)
values
  ('a6000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a4000000-0000-4000-8000-000000000001', now(), 'completed'),
  ('b6000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b4000000-0000-4000-8000-000000000001', now(), 'completed');

insert into public.brew_session_steps (id, brew_session_id, brew_plan_step_id, actual_start_time)
values
  ('a7000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 0),
  ('b7000000-0000-4000-8000-000000000001', 'b6000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-000000000001', 0);

insert into public.taste_feedback (id, user_id, brew_session_id, overall_rating, pretty_good)
values
  ('a8000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a6000000-0000-4000-8000-000000000001', 4, true),
  ('b8000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b6000000-0000-4000-8000-000000000001', 3, true);

insert into public.adjustment_decisions (
  id, user_id, taste_feedback_id, inferred_directions,
  selected_direction, interpretation_version, status
)
values
  (
    'a9000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'a8000000-0000-4000-8000-000000000001', array['hold'],
    'hold', 'feedback-v1', 'held'
  ),
  (
    'b9000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'b8000000-0000-4000-8000-000000000001', array['hold'],
    'hold', 'feedback-v1', 'held'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((select count(*) from public.profiles), 1::bigint, 'a user sees only their profile');
select is((select count(*) from public.bean_profiles), 1::bigint, 'a user sees only their bean profiles');
select is((select count(*) from public.coffees), 1::bigint, 'a user sees only their coffees');
select is((select count(*) from public.dial_in_threads), 1::bigint, 'a user sees only their dial-in threads');
select is((select count(*) from public.brew_plans), 1::bigint, 'a user sees only their brew plans');
select is((select count(*) from public.brew_plan_steps), 1::bigint, 'a user sees only their plan steps');
select is((select count(*) from public.brew_sessions), 1::bigint, 'a user sees only their brew sessions');
select is((select count(*) from public.brew_session_steps), 1::bigint, 'a user sees only their session steps');
select is((select count(*) from public.taste_feedback), 1::bigint, 'a user sees only their feedback');
select is((select count(*) from public.adjustment_decisions), 1::bigint, 'a user sees only their adjustment decisions');
select is((select count(*) from public.recipe_templates), 3::bigint, 'authenticated users can read official recipes');

select throws_ok(
  $$insert into public.bean_profiles (user_id, origin_country_code, process, roast_level)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'CO', 'washed', 'light')$$,
  '42501',
  null,
  'a user cannot insert a bean profile for another user'
);
select is_empty(
  $$update public.coffees set notes = 'forbidden' where id = 'b2000000-0000-4000-8000-000000000001' returning id$$,
  'a user cannot update another user coffee'
);
select is_empty(
  $$update public.dial_in_threads set status = 'abandoned' where id = 'b3000000-0000-4000-8000-000000000001' returning id$$,
  'a user cannot update another user dial-in thread'
);
select is_empty(
  $$update public.brew_plans set grind_level = 'forbidden' where id = 'b4000000-0000-4000-8000-000000000001' returning id$$,
  'a user cannot update another user brew plan'
);
select throws_ok(
  $$insert into public.brew_plan_steps (brew_plan_id, step_order, step_type, start_time, target_water)
    values ('b4000000-0000-4000-8000-000000000001', 2, 'pour', 40, 120)$$,
  '42501',
  null,
  'a user cannot mutate another user child rows'
);
select throws_ok(
  $$insert into public.brew_session_steps (brew_session_id, brew_plan_step_id, actual_start_time)
    values ('a6000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-000000000001', 40)$$,
  '42501',
  null,
  'a user cannot attach another user plan step to their session'
);
select lives_ok(
  $$insert into public.bean_profiles (user_id, origin_country_code, process, roast_level)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'CO', 'washed', 'light')$$,
  'a user can insert their own bean profile'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select count(*) from public.coffees$$,
  '42501',
  null,
  'anonymous users cannot read private coffees'
);

select * from finish();
rollback;
