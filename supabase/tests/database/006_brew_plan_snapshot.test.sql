begin;

select plan(4);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  'c0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'snapshot@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.bean_profiles (id, user_id, origin_country_code, process, roast_level)
values (
  'c1000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  'ET', 'washed', 'light'
);

insert into public.coffees (id, user_id, bean_profile_id, product_name)
values (
  'c2000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000001',
  'Snapshot Coffee'
);

insert into public.dial_in_threads (
  id, user_id, coffee_id, primary_taste_goal, secondary_taste_goal
)
values (
  'c3000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001',
  'sweet', 'clean'
);

insert into public.brew_plans (
  id, user_id, coffee_id, dial_in_thread_id, recipe_template_id,
  coffee_dose, water_amount, ratio, water_temperature, grind_level,
  target_brew_time_min, target_brew_time_max, expected_flavor,
  recommendation_source, recommendation_reason
)
values (
  'c4000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001',
  'c3000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  15, 240, 16, 92, 'medium-fine', 135, 160,
  'Balanced sweetness and clarity', 'official_rule', 'Snapshot test'
);

insert into public.brew_plan_steps (
  id, brew_plan_id, step_order, step_type, start_time, duration, target_water, note
)
select
  gen_random_uuid(),
  'c4000000-0000-4000-8000-000000000001',
  step_order, step_type, start_time, duration, target_water, note
from public.recipe_steps
where recipe_template_id = '10000000-0000-4000-8000-000000000001';

select is(
  (select count(*) from public.brew_plan_steps where brew_plan_id = 'c4000000-0000-4000-8000-000000000001'),
  3::bigint,
  'all recipe steps are copied into the Brew Plan snapshot'
);

update public.recipe_steps
set target_water = 45
where recipe_template_id = '10000000-0000-4000-8000-000000000001'
  and step_order = 1;

select is(
  (select target_water from public.brew_plan_steps where brew_plan_id = 'c4000000-0000-4000-8000-000000000001' and step_order = 1),
  40.00::numeric,
  'template changes do not alter snapshotted plan steps'
);

update public.brew_plans
set water_temperature = 90, recommendation_source = 'manual'
where id = 'c4000000-0000-4000-8000-000000000001';

select is(
  (select default_temperature from public.recipe_templates where id = '10000000-0000-4000-8000-000000000001'),
  92::smallint,
  'editing a Brew Plan does not mutate its Recipe Template'
);

select is(
  (select primary_taste_goal || '+' || secondary_taste_goal from public.dial_in_threads where id = 'c3000000-0000-4000-8000-000000000001'),
  'sweet+clean'::text,
  'editing a Brew Plan does not alter its Taste Goal'
);

select * from finish();
rollback;
