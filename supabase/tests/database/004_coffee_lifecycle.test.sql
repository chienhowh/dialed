begin;

select plan(12);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated',
    'coffee-owner@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    'cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated',
    'coffee-other@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', 'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$insert into public.bean_profiles (
      id, user_id, origin_country_code, region, process, variety, roast_level, producer, farm
    ) values (
      'c1000000-0000-4000-8000-000000000001', 'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'ET', 'Sidama', 'washed', '74158', 'light', 'Ture Waji', 'Buku'
    )$$,
  'an authenticated user can create their bean profile'
);
select lives_ok(
  $$insert into public.coffees (
      id, user_id, bean_profile_id, roaster, product_name, roast_date, purchase_date, purchase_place, notes
    ) values (
      'c2000000-0000-4000-8000-000000000001', 'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'c1000000-0000-4000-8000-000000000001', 'Simple Kaffa', 'Hamasho',
      '2026-08-15', '2026-08-21', 'Local cafe', 'Floral'
    )$$,
  'an authenticated user can create their coffee'
);
select is(
  (select count(*) from public.coffees where status = 'active'),
  1::bigint,
  'the new coffee appears in the active list'
);
select lives_ok(
  $$update public.bean_profiles
    set region = 'Bensa'
    where id = 'c1000000-0000-4000-8000-000000000001'$$,
  'the owner can edit bean profile fields'
);
select lives_ok(
  $$update public.coffees
    set roaster = 'Updated Roaster'
    where id = 'c2000000-0000-4000-8000-000000000001'$$,
  'the owner can edit My Coffee fields'
);
select is(
  (select region from public.bean_profiles where id = 'c1000000-0000-4000-8000-000000000001'),
  'Bensa',
  'edited bean data is readable by its owner'
);

select set_config('request.jwt.claim.sub', 'cbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select is(
  (select count(*) from public.coffees where id = 'c2000000-0000-4000-8000-000000000001'),
  0::bigint,
  'another authenticated user cannot read the coffee'
);
select is_empty(
  $$update public.coffees
    set notes = 'forbidden'
    where id = 'c2000000-0000-4000-8000-000000000001'
    returning id$$,
  'another authenticated user cannot update the coffee'
);
select is_empty(
  $$delete from public.coffees
    where id = 'c2000000-0000-4000-8000-000000000001'
    returning id$$,
  'another authenticated user cannot delete the coffee'
);

select set_config('request.jwt.claim.sub', 'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select lives_ok(
  $$update public.coffees
    set status = 'archived'
    where id = 'c2000000-0000-4000-8000-000000000001'$$,
  'the owner can archive the coffee'
);
select is(
  (select count(*) from public.coffees where status = 'active'),
  0::bigint,
  'an archived coffee no longer appears in the active list'
);
select is(
  (select count(*) from public.coffees where status = 'archived'),
  1::bigint,
  'an archived coffee remains available in the archived list'
);

select * from finish();
rollback;
