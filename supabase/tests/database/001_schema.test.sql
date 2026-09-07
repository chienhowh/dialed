begin;

select plan(21);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'bean_profiles', 'bean_profiles table exists');
select has_table('public', 'coffees', 'coffees table exists');
select has_table('public', 'recipe_templates', 'recipe_templates table exists');
select has_table('public', 'recipe_steps', 'recipe_steps table exists');
select has_table('public', 'dial_in_threads', 'dial_in_threads table exists');
select has_table('public', 'brew_plans', 'brew_plans table exists');
select has_table('public', 'brew_plan_steps', 'brew_plan_steps table exists');
select has_table('public', 'brew_sessions', 'brew_sessions table exists');
select has_table('public', 'brew_session_steps', 'brew_session_steps table exists');
select has_table('public', 'taste_feedback', 'taste_feedback table exists');
select has_table('public', 'adjustment_decisions', 'adjustment decisions table exists');
select hasnt_table('public', 'adjustment_suggestions', 'obsolete adjustment suggestions table is removed');

select has_column('public', 'bean_profiles', 'user_id', 'bean profiles have an owner');
select has_column(
  'public',
  'bean_profiles',
  'origin_country_code',
  'bean profiles store origin in an explicitly named code column'
);
select hasnt_column(
  'public',
  'bean_profiles',
  'origin_country',
  'the previous ambiguous origin column name is removed'
);
select col_type_is('public', 'taste_feedback', 'flavor_tags', 'text[]', 'flavor tags use PostgreSQL text[]');
select col_type_is(
  'public',
  'adjustment_decisions',
  'applied_brew_plan_id',
  'uuid',
  'Adjustment Decisions point to their generated Brew Plan'
);
select has_function(
  'public',
  'apply_adjustment_decision',
  array['uuid', 'text', 'text', 'smallint', 'numeric', 'numeric', 'jsonb'],
  'atomic Adjustment Decision apply RPC exists'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'brew_session_steps_session_plan_step_key'
  ),
  'session step retries have a uniqueness constraint'
);
select is(
  (
    select count(*)
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relkind = 'r'
      and pg_class.relrowsecurity
  ),
  12::bigint,
  'RLS is enabled on every public table'
);

select * from finish();
rollback;
