begin;

select plan(7);

select set_eq(
  $$select name from public.recipe_templates where source = 'official'$$,
  $$values ('Three Pour'::text), ('4:6'::text), ('One Pour'::text)$$,
  'the active official recipe catalog is exact'
);
select is(
  (select count(*) from public.recipe_templates where lower(name) = 'immersion'),
  0::bigint,
  'Immersion is not seeded'
);
select is(
  (select count(*) from public.recipe_steps where recipe_template_id = '10000000-0000-4000-8000-000000000001'),
  3::bigint,
  'Three Pour has three reproducible steps'
);
select is(
  (select count(*) from public.recipe_steps where recipe_template_id = '10000000-0000-4000-8000-000000000002'),
  5::bigint,
  '4:6 has five reproducible steps'
);
select is(
  (select count(*) from public.recipe_steps where recipe_template_id = '10000000-0000-4000-8000-000000000003'),
  3::bigint,
  'One Pour has bloom, wait, and main-pour steps'
);
select is(
  (select count(*) from public.recipe_templates where brewer_type = 'v60' and source = 'official' and is_public),
  3::bigint,
  'all official recipes are public V60 recipes'
);
select is(
  (select count(*) from public.recipe_steps where step_type not in ('pour', 'wait')),
  0::bigint,
  'the MVP seed uses only active step types'
);

select * from finish();
rollback;
