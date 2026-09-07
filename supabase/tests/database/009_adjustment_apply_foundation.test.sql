begin;

select plan(29);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated',
    'apply-owner@example.com', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '9bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated',
    'apply-other@example.com', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.bean_profiles (id, user_id, origin_country_code, process, roast_level)
values
  ('91000000-0000-4000-8000-000000000001', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ET', 'washed', 'light'),
  ('91000000-0000-4000-8000-000000000002', '9bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'KE', 'washed', 'medium');

insert into public.coffees (id, user_id, bean_profile_id, product_name)
values
  ('92000000-0000-4000-8000-000000000001', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '91000000-0000-4000-8000-000000000001', 'Apply Coffee'),
  ('92000000-0000-4000-8000-000000000002', '9bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '91000000-0000-4000-8000-000000000002', 'Other Coffee');

insert into public.dial_in_threads (id, user_id, coffee_id, primary_taste_goal)
values
  ('93000000-0000-4000-8000-000000000001', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '92000000-0000-4000-8000-000000000001', 'sweet'),
  ('93000000-0000-4000-8000-000000000002', '9bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '92000000-0000-4000-8000-000000000002', 'bright');

insert into public.brew_plans (
  id, user_id, coffee_id, dial_in_thread_id, recipe_template_id,
  coffee_dose, water_amount, ratio, water_temperature, grind_level,
  target_brew_time_min, target_brew_time_max, expected_flavor,
  recommendation_source, recommendation_reason
)
values
  (
    '94000000-0000-4000-8000-000000000001', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '92000000-0000-4000-8000-000000000001', '93000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', 15, 240, 16, 92, 'medium',
    135, 160, 'Sweet and clean', 'official_rule', 'Source plan'
  ),
  (
    '94000000-0000-4000-8000-000000000002', '9bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '92000000-0000-4000-8000-000000000002', '93000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001', 15, 240, 16, 92, 'medium',
    135, 160, 'Bright and clean', 'official_rule', 'Other plan'
  );

insert into public.brew_plan_steps (
  id, brew_plan_id, step_order, step_type, start_time, duration, target_water, note
)
values
  ('95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001', 1, 'pour', 0, 10, 60, 'First'),
  ('95000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000001', 2, 'wait', 10, 20, null, 'Wait'),
  ('95000000-0000-4000-8000-000000000003', '94000000-0000-4000-8000-000000000001', 3, 'pour', 30, null, 120, 'Second'),
  ('95000000-0000-4000-8000-000000000004', '94000000-0000-4000-8000-000000000001', 4, 'pour', 60, null, 180, 'Third'),
  ('95000000-0000-4000-8000-000000000005', '94000000-0000-4000-8000-000000000001', 5, 'pour', 90, null, 240, 'Final');

insert into public.brew_sessions (id, user_id, brew_plan_id, started_at, status)
values
  ('96000000-0000-4000-8000-000000000001', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '94000000-0000-4000-8000-000000000001', now(), 'completed'),
  ('96000000-0000-4000-8000-000000000002', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '94000000-0000-4000-8000-000000000001', now(), 'completed'),
  ('96000000-0000-4000-8000-000000000003', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '94000000-0000-4000-8000-000000000001', now(), 'completed'),
  ('96000000-0000-4000-8000-000000000004', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '94000000-0000-4000-8000-000000000001', now(), 'completed'),
  ('96000000-0000-4000-8000-000000000005', '9bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '94000000-0000-4000-8000-000000000002', now(), 'completed');

insert into public.taste_feedback (
  id, user_id, brew_session_id, too_sour, too_weak, astringent, pretty_good
)
values
  ('98000000-0000-4000-8000-000000000001', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '96000000-0000-4000-8000-000000000001', false, true, false, false),
  ('98000000-0000-4000-8000-000000000002', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '96000000-0000-4000-8000-000000000002', false, false, false, true),
  ('98000000-0000-4000-8000-000000000003', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '96000000-0000-4000-8000-000000000003', false, false, true, false),
  ('98000000-0000-4000-8000-000000000004', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '96000000-0000-4000-8000-000000000004', true, false, false, false),
  ('98000000-0000-4000-8000-000000000005', '9bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '96000000-0000-4000-8000-000000000005', true, false, false, false);

insert into public.adjustment_decisions (
  id, user_id, taste_feedback_id, inferred_directions, selected_direction,
  interpretation_version, recommended_candidate, selected_candidate,
  candidate_knowledge_version, status
)
values
  (
    '99000000-0000-4000-8000-000000000001', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '98000000-0000-4000-8000-000000000001', array['increase_strength'], 'increase_strength',
    'feedback-interpretation-v1',
    '{"parameter":"water","changeDirection":"lower","evidenceClassification":"product_heuristic","reason":"Use less water."}',
    '{"parameter":"water","changeDirection":"lower","evidenceClassification":"product_heuristic","reason":"Use less water."}',
    'candidate-catalog-v1', 'pending'
  ),
  (
    '99000000-0000-4000-8000-000000000002', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '98000000-0000-4000-8000-000000000002', array['hold'], 'hold',
    'feedback-interpretation-v1', null, null, null, 'held'
  ),
  (
    '99000000-0000-4000-8000-000000000003', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '98000000-0000-4000-8000-000000000003', array['reduce_astringency'], 'reduce_astringency',
    'feedback-interpretation-v1', null, null, 'candidate-catalog-v1', 'unsupported'
  ),
  (
    '99000000-0000-4000-8000-000000000004', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '98000000-0000-4000-8000-000000000004', array['increase_extraction'], 'increase_extraction',
    'feedback-interpretation-v1',
    '{"parameter":"grind","changeDirection":"finer","evidenceClassification":"product_heuristic","reason":"Grind finer."}',
    '{"parameter":"grind","changeDirection":"finer","evidenceClassification":"product_heuristic","reason":"Grind finer."}',
    'candidate-catalog-v1', 'pending'
  ),
  (
    '99000000-0000-4000-8000-000000000005', '9bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '98000000-0000-4000-8000-000000000005', array['increase_extraction'], 'increase_extraction',
    'feedback-interpretation-v1',
    '{"parameter":"grind","changeDirection":"finer","evidenceClassification":"product_heuristic","reason":"Grind finer."}',
    '{"parameter":"grind","changeDirection":"finer","evidenceClassification":"product_heuristic","reason":"Grind finer."}',
    'candidate-catalog-v1', 'pending'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$select public.apply_adjustment_decision(
      '99000000-0000-4000-8000-000000000001',
      'adjustment-magnitude-v1',
      'medium', 92::smallint, 225::numeric, 15::numeric,
      '{
        "95000000-0000-4000-8000-000000000001": 56.3,
        "95000000-0000-4000-8000-000000000003": 112.5,
        "95000000-0000-4000-8000-000000000004": 168.8,
        "95000000-0000-4000-8000-000000000005": 225
      }'::jsonb
    )$$,
  'a valid pending Decision is applied atomically'
);

select is(
  (select status from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000001'),
  'applied',
  'the Decision becomes applied'
);
select isnt(
  (select applied_brew_plan_id from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000001'),
  null::uuid,
  'the applied Decision points to a generated Brew Plan'
);
select is(
  (select user_id from public.brew_plans where id = (
    select applied_brew_plan_id from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000001'
  )),
  '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'the generated Plan belongs to the same user'
);
select is(
  (select coffee_id from public.brew_plans where id = (
    select applied_brew_plan_id from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000001'
  )),
  '92000000-0000-4000-8000-000000000001'::uuid,
  'the generated Plan belongs to the same Coffee'
);
select is(
  (select dial_in_thread_id from public.brew_plans where id = (
    select applied_brew_plan_id from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000001'
  )),
  '93000000-0000-4000-8000-000000000001'::uuid,
  'the generated Plan stays in the same Dial-in Thread'
);

select is(
  (select parent_plan_id from public.brew_plans where id = (
    select applied_brew_plan_id from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000001'
  )),
  '94000000-0000-4000-8000-000000000001'::uuid,
  'parent_plan_id points to the source Plan'
);
select is(
  (select based_on_session_id from public.brew_plans where id = (
    select applied_brew_plan_id from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000001'
  )),
  '96000000-0000-4000-8000-000000000001'::uuid,
  'based_on_session_id points to the completed source Session'
);
select is(
  (select recommendation_source from public.brew_plans where id = (
    select applied_brew_plan_id from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000001'
  )),
  'previous_brew_adjustment',
  'the generated Plan has explicit Previous Brew Adjustment provenance'
);
select is(
  (select coffee_dose::text || '/' || water_amount::text || '/' || ratio::text
   from public.brew_plans where id = (
     select applied_brew_plan_id from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000001'
   )),
  '15.00/225.00/15.00',
  'the water adjustment preserves dose and persists derived water and ratio'
);
select is(
  (select count(*) from public.brew_plan_steps where brew_plan_id = (
    select applied_brew_plan_id from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000001'
  )),
  5::bigint,
  'all source Plan steps are cloned'
);
select is(
  (select string_agg(coalesce(target_water::text, 'wait'), ',' order by step_order)
   from public.brew_plan_steps where brew_plan_id = (
     select applied_brew_plan_id from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000001'
   )),
  '56.30,wait,112.50,168.80,225.00',
  'the RPC persists proportional cumulative targets and exact final water'
);
select is(
  (select count(*) from public.brew_plan_steps generated
   join public.brew_plan_steps source on generated.id = source.id
   where generated.brew_plan_id = (
     select applied_brew_plan_id from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000001'
   ) and source.brew_plan_id = '94000000-0000-4000-8000-000000000001'),
  0::bigint,
  'cloned steps receive new IDs'
);

select is(
  public.apply_adjustment_decision(
    '99000000-0000-4000-8000-000000000001',
    'adjustment-magnitude-v1',
    'ignored-on-retry', 1::smallint, 1::numeric, 1::numeric, '{}'::jsonb
  ),
  (select applied_brew_plan_id from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000001'),
  'a retry returns the existing generated Plan'
);
select is(
  (select count(*) from public.brew_plans),
  2::bigint,
  'a retry creates no duplicate owner Plan under RLS'
);

select throws_ok(
  $$select public.apply_adjustment_decision(
      '99000000-0000-4000-8000-000000000002',
      'adjustment-magnitude-v1', 'medium', 92::smallint, 240::numeric, 16::numeric, '{}'::jsonb
    )$$,
  '22023', 'Adjustment Decision is not pending',
  'a held Decision cannot be applied'
);
select throws_ok(
  $$select public.apply_adjustment_decision(
      '99000000-0000-4000-8000-000000000003',
      'adjustment-magnitude-v1', 'medium', 92::smallint, 240::numeric, 16::numeric, '{}'::jsonb
    )$$,
  '22023', 'Adjustment Decision is not pending',
  'an unsupported Decision cannot be applied'
);

select throws_ok(
  $$select public.apply_adjustment_decision(
      '99000000-0000-4000-8000-000000000004',
      'adjustment-magnitude-v1', 'medium-fine', 93::smallint, 240::numeric, 16::numeric, '{}'::jsonb
    )$$,
  '22023', 'grind adjustment payload changes unrelated fields',
  'a payload cannot mutate an unrelated source field'
);
select is(
  (select status from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000004'),
  'pending',
  'a failed apply leaves the Decision pending'
);
select is(
  (select applied_brew_plan_id from public.adjustment_decisions where id = '99000000-0000-4000-8000-000000000004'),
  null::uuid,
  'a failed apply leaves applied_brew_plan_id null'
);
select is(
  (select count(*) from public.brew_plans),
  2::bigint,
  'a failed apply creates no partial Plan'
);

select throws_ok(
  $$update public.adjustment_decisions
    set status = 'applied', applied_brew_plan_id = '94000000-0000-4000-8000-000000000001'
    where id = '99000000-0000-4000-8000-000000000004'$$,
  '42501', null,
  'an authenticated client cannot bypass the atomic RPC with a direct update'
);
select throws_ok(
  $$delete from public.adjustment_decisions
    where id = '99000000-0000-4000-8000-000000000004'$$,
  '42501', null,
  'an authenticated client cannot delete the historical Decision'
);

set local role postgres;

select throws_ok(
  $$update public.adjustment_decisions
    set status = 'applied'
    where id = '99000000-0000-4000-8000-000000000004'$$,
  '23514', null,
  'applied status cannot exist without applied_brew_plan_id'
);
select throws_ok(
  $$update public.adjustment_decisions
    set applied_brew_plan_id = '94000000-0000-4000-8000-000000000001'
    where id = '99000000-0000-4000-8000-000000000004'$$,
  '23514', null,
  'non-applied status cannot contain applied_brew_plan_id'
);
select throws_ok(
  $$update public.adjustment_decisions
    set status = 'applied', applied_brew_plan_id = '94000000-0000-4000-8000-000000000002'
    where id = '99000000-0000-4000-8000-000000000004'$$,
  '23503', null,
  'the ownership-safe FK rejects a cross-user applied Plan'
);
select throws_ok(
  $$update public.adjustment_decisions
    set status = 'applied', applied_brew_plan_id = (
      select applied_brew_plan_id
      from public.adjustment_decisions
      where id = '99000000-0000-4000-8000-000000000001'
    )
    where id = '99000000-0000-4000-8000-000000000004'$$,
  '23505', null,
  'one generated Plan cannot be claimed by two Decisions'
);

select ok(
  lower(pg_get_functiondef(
    'public.apply_adjustment_decision(uuid,text,text,smallint,numeric,numeric,jsonb)'::regprocedure
  )) like '%for update%',
  'the RPC locks the Decision to serialize concurrent requests'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '9bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select throws_ok(
  $$select public.apply_adjustment_decision(
      '99000000-0000-4000-8000-000000000004',
      'adjustment-magnitude-v1', 'medium-fine', 92::smallint, 240::numeric, 16::numeric, '{}'::jsonb
    )$$,
  '42501', 'Adjustment Decision is unavailable',
  'a non-owner cannot apply another user Decision'
);

select * from finish();
rollback;
