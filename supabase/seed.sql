insert into public.recipe_templates (
  id,
  name,
  brewer_type,
  method_type,
  description,
  default_ratio,
  default_temperature,
  default_grind_level,
  expected_flavor,
  source,
  is_public,
  created_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Three Pour',
    'v60',
    'percolation',
    'A balanced bloom followed by two staged pours.',
    16.00,
    92,
    'medium-fine',
    'Balanced sweetness and clarity',
    'official',
    true,
    '2026-08-27 00:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '4:6',
    'v60',
    'percolation',
    'Five evenly timed pours using the 4:6 structure as a conservative starting point.',
    16.00,
    92,
    'medium-coarse',
    'Bright, expressive, and balanced',
    'official',
    true,
    '2026-08-27 00:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'One Pour',
    'v60',
    'percolation',
    'A bloom followed by one steady continuous pour.',
    16.00,
    92,
    'medium',
    'Round body and approachable sweetness',
    'official',
    true,
    '2026-08-27 00:00:00+00'
  )
on conflict (id) do update
set
  name = excluded.name,
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
  id,
  recipe_template_id,
  step_order,
  step_type,
  start_time,
  duration,
  target_water,
  note
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
