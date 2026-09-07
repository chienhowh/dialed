begin;

select plan(27);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated',
    'feedback-owner@example.com', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    'ebbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated',
    'feedback-other@example.com', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.bean_profiles (id, user_id, origin_country_code, process, roast_level)
values
  ('e1000000-0000-4000-8000-000000000001', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ET', 'washed', 'light'),
  ('f1000000-0000-4000-8000-000000000001', 'ebbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'KE', 'washed', 'light');

insert into public.coffees (id, user_id, bean_profile_id, product_name)
values
  ('e2000000-0000-4000-8000-000000000001', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'e1000000-0000-4000-8000-000000000001', 'Feedback Coffee'),
  ('f2000000-0000-4000-8000-000000000001', 'ebbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'f1000000-0000-4000-8000-000000000001', 'Other Coffee');

insert into public.dial_in_threads (id, user_id, coffee_id, primary_taste_goal)
values
  ('e3000000-0000-4000-8000-000000000001', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'e2000000-0000-4000-8000-000000000001', 'sweet'),
  ('f3000000-0000-4000-8000-000000000001', 'ebbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'f2000000-0000-4000-8000-000000000001', 'bright');

insert into public.brew_plans (
  id, user_id, coffee_id, dial_in_thread_id, recipe_template_id,
  coffee_dose, water_amount, ratio, water_temperature, grind_level,
  target_brew_time_min, target_brew_time_max, expected_flavor,
  recommendation_source, recommendation_reason
)
values
  (
    'e4000000-0000-4000-8000-000000000001', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'e2000000-0000-4000-8000-000000000001', 'e3000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', 15, 240, 16, 92, 'medium-fine',
    135, 160, 'Sweet and clean', 'official_rule', 'Feedback test plan'
  ),
  (
    'f4000000-0000-4000-8000-000000000001', 'ebbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'f2000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', 15, 240, 16, 92, 'medium-fine',
    135, 160, 'Bright and clean', 'official_rule', 'Other test plan'
  );

insert into public.brew_sessions (id, user_id, brew_plan_id, started_at, status)
values
  ('e6000000-0000-4000-8000-000000000001', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'e4000000-0000-4000-8000-000000000001', now(), 'completed'),
  ('e6000000-0000-4000-8000-000000000002', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'e4000000-0000-4000-8000-000000000001', now(), 'completed'),
  ('e6000000-0000-4000-8000-000000000003', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'e4000000-0000-4000-8000-000000000001', now(), 'completed'),
  ('e6000000-0000-4000-8000-000000000004', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'e4000000-0000-4000-8000-000000000001', now(), 'completed'),
  ('e6000000-0000-4000-8000-000000000005', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'e4000000-0000-4000-8000-000000000001', now(), 'completed'),
  ('e6000000-0000-4000-8000-000000000006', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'e4000000-0000-4000-8000-000000000001', now(), 'completed'),
  ('e6000000-0000-4000-8000-000000000007', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'e4000000-0000-4000-8000-000000000001', now(), 'brewing'),
  ('f6000000-0000-4000-8000-000000000001', 'ebbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'f4000000-0000-4000-8000-000000000001', now(), 'completed');

insert into public.taste_feedback (
  id, user_id, brew_session_id, too_sour, astringent, pretty_good
)
values
  ('e8000000-0000-4000-8000-000000000004', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'e6000000-0000-4000-8000-000000000004', false, true, false),
  ('e8000000-0000-4000-8000-000000000005', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'e6000000-0000-4000-8000-000000000005', true, false, false),
  ('f8000000-0000-4000-8000-000000000001', 'ebbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'f6000000-0000-4000-8000-000000000001', false, false, true);

insert into public.adjustment_decisions (
  id, user_id, taste_feedback_id, inferred_directions,
  selected_direction, interpretation_version, status
)
values (
  'f9000000-0000-4000-8000-000000000001',
  'ebbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'f8000000-0000-4000-8000-000000000001',
  array['hold'], 'hold', 'interpretation-v1', 'held'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$insert into public.taste_feedback (
      id, user_id, brew_session_id, pretty_good
    ) values (
      'e8000000-0000-4000-8000-000000000001',
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e6000000-0000-4000-8000-000000000001', true
    )$$,
  'Pretty Good is valid Quick Feedback'
);

select lives_ok(
  $$insert into public.taste_feedback (
      id, user_id, brew_session_id, too_sour, too_weak
    ) values (
      'e8000000-0000-4000-8000-000000000002',
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e6000000-0000-4000-8000-000000000002', true, true
    )$$,
  'multiple negative Quick Feedback signals are valid'
);

select throws_ok(
  $$insert into public.taste_feedback (user_id, brew_session_id)
    values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e6000000-0000-4000-8000-000000000003'
    )$$,
  '23514', null,
  'feedback without Quick Feedback is rejected'
);

select throws_ok(
  $$insert into public.taste_feedback (user_id, brew_session_id, pretty_good, too_bitter)
    values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e6000000-0000-4000-8000-000000000003', true, true
    )$$,
  '23514', null,
  'Pretty Good cannot be combined with negative feedback'
);

select throws_ok(
  $$insert into public.taste_feedback (user_id, brew_session_id, too_sour)
    values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e6000000-0000-4000-8000-000000000007', true
    )$$,
  '42501', null,
  'a non-completed Brew Session cannot receive feedback'
);

select throws_ok(
  $$insert into public.taste_feedback (user_id, brew_session_id, pretty_good)
    values (
      'ebbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'f6000000-0000-4000-8000-000000000001', true
    )$$,
  '42501', null,
  'a user cannot create feedback for another user'
);

select throws_ok(
  $$insert into public.taste_feedback (user_id, brew_session_id, pretty_good)
    values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e6000000-0000-4000-8000-000000000001', true
    )$$,
  '23505', null,
  'a Brew Session can have only one Taste Feedback row'
);

select lives_ok(
  $$insert into public.adjustment_decisions (
      id, user_id, taste_feedback_id, inferred_directions,
      selected_direction, interpretation_version, status
    ) values (
      'e9000000-0000-4000-8000-000000000001',
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000001',
      array['hold'], 'hold', 'interpretation-v1', 'held'
    )$$,
  'a held Decision has the exact hold shape'
);

select lives_ok(
  $$insert into public.adjustment_decisions (
      id, user_id, taste_feedback_id, inferred_directions,
      selected_direction, interpretation_version,
      recommended_candidate, selected_candidate,
      candidate_knowledge_version, status
    ) values (
      'e9000000-0000-4000-8000-000000000002',
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000002',
      array['increase_extraction', 'increase_strength'],
      'increase_extraction', 'interpretation-v1',
      '{"parameter":"grind","changeDirection":"finer","evidenceClassification":"product_heuristic","reason":"Increase extraction with grind."}'::jsonb,
      '{"parameter":"temperature","changeDirection":"higher","evidenceClassification":"product_heuristic","reason":"Increase extraction with temperature."}'::jsonb,
      'candidate-catalog-v1', 'pending'
    )$$,
  'a pending Decision retains recommended and selected candidates'
);

select lives_ok(
  $$insert into public.adjustment_decisions (
      id, user_id, taste_feedback_id, inferred_directions,
      selected_direction, interpretation_version,
      candidate_knowledge_version, status
    ) values (
      'e9000000-0000-4000-8000-000000000004',
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000004',
      array['reduce_astringency'], 'reduce_astringency', 'interpretation-v1',
      'candidate-catalog-v1', 'unsupported'
    )$$,
  'an unsupported Decision preserves direction and knowledge version without candidates'
);

select isnt(
  (
    select recommended_candidate
    from public.adjustment_decisions
    where id = 'e9000000-0000-4000-8000-000000000002'
  ),
  (
    select selected_candidate
    from public.adjustment_decisions
    where id = 'e9000000-0000-4000-8000-000000000002'
  ),
  'recommended and selected candidate snapshots may differ'
);

select throws_ok(
  $$insert into public.adjustment_decisions (
      user_id, taste_feedback_id, inferred_directions, selected_direction,
      interpretation_version, candidate_knowledge_version, status
    ) values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000005',
      array['speed_up'], 'speed_up', 'interpretation-v1', 'candidate-catalog-v1', 'unsupported'
    )$$,
  '23514', null,
  'an unknown Adjustment Direction is rejected'
);

select throws_ok(
  $$insert into public.adjustment_decisions (
      user_id, taste_feedback_id, inferred_directions, selected_direction,
      interpretation_version, candidate_knowledge_version, status
    ) values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000005',
      array['decrease_extraction'], 'increase_extraction',
      'interpretation-v1', 'candidate-catalog-v1', 'unsupported'
    )$$,
  '23514', null,
  'selected direction must be one of the inferred directions'
);

select throws_ok(
  $$insert into public.adjustment_decisions (
      user_id, taste_feedback_id, inferred_directions, selected_direction,
      interpretation_version, candidate_knowledge_version, status
    ) values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000005',
      array['hold'], 'hold', 'interpretation-v1', 'candidate-catalog-v1', 'held'
    )$$,
  '23514', null,
  'a held Decision cannot carry candidate knowledge'
);

select throws_ok(
  $$insert into public.adjustment_decisions (
      user_id, taste_feedback_id, inferred_directions, selected_direction,
      interpretation_version, candidate_knowledge_version, status
    ) values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000005',
      array['increase_extraction'], 'increase_extraction',
      'interpretation-v1', 'candidate-catalog-v1', 'pending'
    )$$,
  '23514', null,
  'a pending Decision requires both candidate snapshots'
);

select throws_ok(
  $$insert into public.adjustment_decisions (
      user_id, taste_feedback_id, inferred_directions, selected_direction,
      interpretation_version, recommended_candidate, selected_candidate,
      candidate_knowledge_version, status
    ) values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000005',
      array['reduce_astringency'], 'reduce_astringency', 'interpretation-v1',
      '{"parameter":"grind","changeDirection":"coarser","evidenceClassification":"product_heuristic","reason":"Test."}'::jsonb,
      '{"parameter":"grind","changeDirection":"coarser","evidenceClassification":"product_heuristic","reason":"Test."}'::jsonb,
      'candidate-catalog-v1', 'unsupported'
    )$$,
  '23514', null,
  'an unsupported Decision cannot carry candidates'
);

select throws_ok(
  $$insert into public.adjustment_decisions (
      user_id, taste_feedback_id, inferred_directions, selected_direction,
      interpretation_version, recommended_candidate, selected_candidate,
      candidate_knowledge_version, status
    ) values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000005',
      array['increase_extraction'], 'increase_extraction', 'interpretation-v1',
      '{"parameter":"grind","changeDirection":"finer","evidenceClassification":"product_heuristic","reason":"Test.","previousValue":"medium"}'::jsonb,
      '{"parameter":"grind","changeDirection":"finer","evidenceClassification":"product_heuristic","reason":"Test."}'::jsonb,
      'candidate-catalog-v1', 'pending'
    )$$,
  '23514', null,
  'a malformed Candidate with unexpected keys is rejected'
);

select throws_ok(
  $$insert into public.adjustment_decisions (
      user_id, taste_feedback_id, inferred_directions, selected_direction,
      interpretation_version, recommended_candidate, selected_candidate,
      candidate_knowledge_version, status
    ) values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000005',
      array['increase_extraction'], 'increase_extraction', 'interpretation-v1',
      '{"parameter":1,"changeDirection":"finer","evidenceClassification":"product_heuristic","reason":"Test."}'::jsonb,
      '{"parameter":"grind","changeDirection":"finer","evidenceClassification":"product_heuristic","reason":"Test."}'::jsonb,
      'candidate-catalog-v1', 'pending'
    )$$,
  '23514', null,
  'a Candidate with an invalid primitive type is rejected'
);

select throws_ok(
  $$insert into public.adjustment_decisions (
      user_id, taste_feedback_id, inferred_directions, selected_direction,
      interpretation_version, recommended_candidate, selected_candidate,
      candidate_knowledge_version, status
    ) values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000005',
      array['increase_strength'], 'increase_strength', 'interpretation-v1',
      '{"parameter":"dose","changeDirection":"higher","evidenceClassification":"product_heuristic","reason":"Test."}'::jsonb,
      '{"parameter":"water","changeDirection":"lower","evidenceClassification":"product_heuristic","reason":"Test."}'::jsonb,
      'candidate-catalog-v1', 'pending'
    )$$,
  '23514', null,
  'an unsupported Candidate parameter is rejected'
);

select throws_ok(
  $$insert into public.adjustment_decisions (
      user_id, taste_feedback_id, inferred_directions, selected_direction,
      interpretation_version, recommended_candidate, selected_candidate,
      candidate_knowledge_version, status
    ) values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000005',
      array['increase_strength'], 'increase_strength', 'interpretation-v1',
      '{"parameter":"water","changeDirection":"less","evidenceClassification":"product_heuristic","reason":"Test."}'::jsonb,
      '{"parameter":"water","changeDirection":"lower","evidenceClassification":"product_heuristic","reason":"Test."}'::jsonb,
      'candidate-catalog-v1', 'pending'
    )$$,
  '23514', null,
  'an unknown Candidate change direction is rejected'
);

select throws_ok(
  $$insert into public.adjustment_decisions (
      user_id, taste_feedback_id, inferred_directions, selected_direction,
      interpretation_version, recommended_candidate, selected_candidate,
      candidate_knowledge_version, status
    ) values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000005',
      array['increase_extraction'], 'increase_extraction', 'interpretation-v1',
      '{"parameter":"temperature","changeDirection":"finer","evidenceClassification":"product_heuristic","reason":"Test."}'::jsonb,
      '{"parameter":"grind","changeDirection":"finer","evidenceClassification":"product_heuristic","reason":"Test."}'::jsonb,
      'candidate-catalog-v1', 'pending'
    )$$,
  '23514', null,
  'a structurally invalid parameter and change direction pair is rejected'
);

select throws_ok(
  $$insert into public.adjustment_decisions (
      user_id, taste_feedback_id, inferred_directions, selected_direction,
      interpretation_version, recommended_candidate, selected_candidate,
      candidate_knowledge_version, status
    ) values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000005',
      array['increase_extraction'], 'increase_extraction', 'interpretation-v1',
      '{"parameter":"grind","changeDirection":"finer","evidenceClassification":"neutral_fallback","reason":"Test."}'::jsonb,
      '{"parameter":"grind","changeDirection":"finer","evidenceClassification":"product_heuristic","reason":"Test."}'::jsonb,
      'candidate-catalog-v1', 'pending'
    )$$,
  '23514', null,
  'non-candidate evidence is rejected'
);

select throws_ok(
  $$insert into public.adjustment_decisions (
      user_id, taste_feedback_id, inferred_directions,
      selected_direction, interpretation_version, status
    ) values (
      'eaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'e8000000-0000-4000-8000-000000000001',
      array['hold'], 'hold', 'interpretation-v1', 'held'
    )$$,
  '23505', null,
  'a Taste Feedback row can have only one Adjustment Decision'
);

select throws_ok(
  $$insert into public.adjustment_decisions (
      user_id, taste_feedback_id, inferred_directions,
      selected_direction, interpretation_version, status
    ) values (
      'ebbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'f8000000-0000-4000-8000-000000000001',
      array['hold'], 'hold', 'interpretation-v1', 'held'
    )$$,
  '42501', null,
  'a user cannot create an Adjustment Decision for another user'
);

select throws_ok(
  $$update public.adjustment_decisions
    set interpretation_version = 'forbidden'
    where id = 'f9000000-0000-4000-8000-000000000001'
    returning id$$,
  '42501', null,
  'a user cannot update another user Adjustment Decision'
);

select throws_ok(
  $$delete from public.adjustment_decisions
    where id = 'f9000000-0000-4000-8000-000000000001'
    returning id$$,
  '42501', null,
  'a user cannot delete another user Adjustment Decision'
);

select is(
  (select count(*) from public.adjustment_decisions),
  3::bigint,
  'RLS exposes only the current user Adjustment Decisions'
);

select * from finish();
rollback;
