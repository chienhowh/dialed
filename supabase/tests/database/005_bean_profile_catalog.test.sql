begin;

select plan(11);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  'd1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated',
  'bean-catalog@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$insert into public.bean_profiles (
      id, user_id, origin_country_code, region, process, variety, roast_level
    ) values (
      'd2000000-0000-4000-8000-000000000001',
      'd1111111-1111-4111-8111-111111111111',
      'ET', 'Free-form Region / Lot', 'washed', 'SL28 / SL34', 'light'
    )$$,
  'canonical values with flexible region and variety are accepted'
);
select is(
  (select region from public.bean_profiles where id = 'd2000000-0000-4000-8000-000000000001'),
  'Free-form Region / Lot',
  'the database does not impose a region taxonomy'
);
select is(
  (select variety from public.bean_profiles where id = 'd2000000-0000-4000-8000-000000000001'),
  'SL28 / SL34',
  'the database keeps variety flexible'
);

select throws_ok(
  $$insert into public.bean_profiles (user_id, origin_country_code, process, roast_level)
    values ('d1111111-1111-4111-8111-111111111111', 'Ethiopia', 'washed', 'light')$$,
  '23514', null,
  'a country display label cannot be stored as origin'
);
select throws_ok(
  $$insert into public.bean_profiles (user_id, origin_country_code, process, roast_level)
    values ('d1111111-1111-4111-8111-111111111111', 'ZZ', 'washed', 'light')$$,
  '23514', null,
  'an unknown alpha-2 origin code is rejected'
);
select throws_ok(
  $$insert into public.bean_profiles (user_id, origin_country_code, process, roast_level)
    values ('d1111111-1111-4111-8111-111111111111', 'et', 'washed', 'light')$$,
  '23514', null,
  'a lowercase origin code is rejected'
);
select throws_ok(
  $$insert into public.bean_profiles (user_id, origin_country_code, process, roast_level)
    values ('d1111111-1111-4111-8111-111111111111', 'KE', 'Washed', 'light')$$,
  '23514', null,
  'a process display label is rejected'
);
select throws_ok(
  $$insert into public.bean_profiles (user_id, origin_country_code, process, roast_level)
    values ('d1111111-1111-4111-8111-111111111111', 'CO', 'anaerobic', 'light')$$,
  '23514', null,
  'anaerobic is not a mutually exclusive primary process'
);
select throws_ok(
  $$insert into public.bean_profiles (user_id, origin_country_code, process, roast_level)
    values ('d1111111-1111-4111-8111-111111111111', 'PA', 'natural', 'Light')$$,
  '23514', null,
  'a roast display label is rejected'
);
select throws_ok(
  $$insert into public.bean_profiles (user_id, origin_country_code, process, roast_level)
    values ('d1111111-1111-4111-8111-111111111111', 'TW', 'honey', 'medium-light')$$,
  '23514', null,
  'a non-canonical roast spelling is rejected'
);
select lives_ok(
  $$insert into public.bean_profiles (user_id, origin_country_code, region, process, variety, roast_level)
    values ('d1111111-1111-4111-8111-111111111111', 'TW', null, 'other', null, 'medium_dark')$$,
  'nullable region and variety remain valid with canonical structured values'
);

select * from finish();
rollback;
