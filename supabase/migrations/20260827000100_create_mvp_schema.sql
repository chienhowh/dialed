create extension if not exists pgcrypto with schema extensions;

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(trim(display_name)) between 1 and 80),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.bean_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  origin_country text not null check (char_length(trim(origin_country)) between 1 and 100),
  region text check (region is null or char_length(trim(region)) between 1 and 120),
  process text not null check (char_length(trim(process)) between 1 and 80),
  variety text check (variety is null or char_length(trim(variety)) between 1 and 160),
  roast_level text not null check (char_length(trim(roast_level)) between 1 and 40),
  producer text check (producer is null or char_length(trim(producer)) between 1 and 160),
  farm text check (farm is null or char_length(trim(farm)) between 1 and 160),
  altitude integer check (altitude is null or altitude >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id)
);

create table public.coffees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bean_profile_id uuid not null,
  roaster text check (roaster is null or char_length(trim(roaster)) between 1 and 160),
  product_name text check (product_name is null or char_length(trim(product_name)) between 1 and 160),
  roast_date date,
  purchase_date date,
  purchase_place text check (purchase_place is null or char_length(trim(purchase_place)) between 1 and 160),
  notes text,
  status text not null default 'active' check (status in ('active', 'finished', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  constraint coffees_owned_bean_profile_fkey
    foreign key (bean_profile_id, user_id)
    references public.bean_profiles (id, user_id)
    on delete restrict
);

create table public.recipe_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 120),
  brewer_type text not null check (char_length(trim(brewer_type)) between 1 and 40),
  method_type text not null check (char_length(trim(method_type)) between 1 and 40),
  description text not null,
  default_ratio numeric(5, 2) not null check (default_ratio > 0),
  default_temperature smallint not null check (default_temperature between 1 and 100),
  default_grind_level text not null check (char_length(trim(default_grind_level)) between 1 and 80),
  expected_flavor text not null,
  source text not null check (source in ('official', 'user', 'community')),
  is_public boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_template_id uuid not null references public.recipe_templates (id) on delete cascade,
  step_order smallint not null check (step_order > 0),
  step_type text not null check (step_type in ('pour', 'wait', 'steep', 'release')),
  start_time integer not null check (start_time >= 0),
  duration integer check (duration is null or duration >= 0),
  target_water numeric(7, 2),
  note text,
  constraint recipe_steps_target_water_check check (
    (step_type = 'pour' and target_water > 0)
    or (step_type in ('wait', 'steep', 'release') and target_water is null)
  ),
  unique (recipe_template_id, step_order)
);

create table public.dial_in_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  coffee_id uuid not null,
  primary_taste_goal text not null check (
    primary_taste_goal in ('sweet', 'bright', 'clean', 'full_body', 'juicy', 'balanced', 'complex')
  ),
  secondary_taste_goal text check (
    secondary_taste_goal is null
    or secondary_taste_goal in ('sweet', 'bright', 'clean', 'full_body', 'juicy', 'balanced', 'complex')
  ),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  constraint dial_in_threads_distinct_goals_check check (
    secondary_taste_goal is null or secondary_taste_goal <> primary_taste_goal
  ),
  constraint dial_in_threads_owned_coffee_fkey
    foreign key (coffee_id, user_id)
    references public.coffees (id, user_id)
    on delete cascade
);

create table public.brew_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  coffee_id uuid not null,
  dial_in_thread_id uuid not null,
  recipe_template_id uuid references public.recipe_templates (id) on delete set null,
  coffee_dose numeric(7, 2) not null check (coffee_dose > 0),
  water_amount numeric(7, 2) not null check (water_amount > 0),
  ratio numeric(5, 2) not null check (ratio > 0),
  water_temperature smallint not null check (water_temperature between 1 and 100),
  grind_level text not null check (char_length(trim(grind_level)) between 1 and 80),
  target_brew_time_min integer not null check (target_brew_time_min >= 0),
  target_brew_time_max integer not null check (target_brew_time_max >= target_brew_time_min),
  expected_flavor text not null,
  recommendation_source text not null check (
    recommendation_source in ('official_rule', 'manual', 'community', 'personal_history', 'ai')
  ),
  recommendation_reason text not null,
  parent_plan_id uuid,
  based_on_session_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  constraint brew_plans_owned_coffee_fkey
    foreign key (coffee_id, user_id)
    references public.coffees (id, user_id)
    on delete cascade,
  constraint brew_plans_owned_thread_fkey
    foreign key (dial_in_thread_id, user_id)
    references public.dial_in_threads (id, user_id)
    on delete cascade,
  constraint brew_plans_owned_parent_fkey
    foreign key (parent_plan_id, user_id)
    references public.brew_plans (id, user_id)
    on delete set null (parent_plan_id)
);

create table public.brew_plan_steps (
  id uuid primary key default gen_random_uuid(),
  brew_plan_id uuid not null references public.brew_plans (id) on delete cascade,
  step_order smallint not null check (step_order > 0),
  step_type text not null check (step_type in ('pour', 'wait', 'steep', 'release')),
  start_time integer not null check (start_time >= 0),
  duration integer check (duration is null or duration >= 0),
  target_water numeric(7, 2),
  note text,
  constraint brew_plan_steps_target_water_check check (
    (step_type = 'pour' and target_water > 0)
    or (step_type in ('wait', 'steep', 'release') and target_water is null)
  ),
  unique (brew_plan_id, step_order)
);

create table public.brew_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  brew_plan_id uuid not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  actual_coffee_dose numeric(7, 2) check (actual_coffee_dose is null or actual_coffee_dose > 0),
  actual_water_temperature smallint check (
    actual_water_temperature is null or actual_water_temperature between 1 and 100
  ),
  actual_water_amount numeric(7, 2) check (actual_water_amount is null or actual_water_amount > 0),
  actual_brew_time integer check (actual_brew_time is null or actual_brew_time >= 0),
  status text not null default 'brewing' check (status in ('brewing', 'completed', 'aborted')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  constraint brew_sessions_owned_plan_fkey
    foreign key (brew_plan_id, user_id)
    references public.brew_plans (id, user_id)
    on delete cascade
);

alter table public.brew_plans
  add constraint brew_plans_owned_session_fkey
  foreign key (based_on_session_id, user_id)
  references public.brew_sessions (id, user_id)
  on delete set null (based_on_session_id);

create table public.brew_session_steps (
  id uuid primary key default gen_random_uuid(),
  brew_session_id uuid not null references public.brew_sessions (id) on delete cascade,
  brew_plan_step_id uuid not null references public.brew_plan_steps (id) on delete cascade,
  actual_start_time integer check (actual_start_time is null or actual_start_time >= 0),
  actual_end_time integer check (actual_end_time is null or actual_end_time >= actual_start_time),
  actual_water numeric(7, 2) check (actual_water is null or actual_water > 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint brew_session_steps_session_plan_step_key unique (brew_session_id, brew_plan_step_id)
);

create table public.taste_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brew_session_id uuid not null unique,
  overall_rating smallint check (overall_rating is null or overall_rating between 1 and 5),
  too_sour boolean not null default false,
  too_bitter boolean not null default false,
  too_weak boolean not null default false,
  too_strong boolean not null default false,
  astringent boolean not null default false,
  pretty_good boolean not null default false,
  sweetness smallint check (sweetness is null or sweetness between 1 and 5),
  acidity smallint check (acidity is null or acidity between 1 and 5),
  body smallint check (body is null or body between 1 and 5),
  clarity smallint check (clarity is null or clarity between 1 and 5),
  juiciness smallint check (juiciness is null or juiciness between 1 and 5),
  complexity smallint check (complexity is null or complexity between 1 and 5),
  flavor_tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint taste_feedback_owned_session_fkey
    foreign key (brew_session_id, user_id)
    references public.brew_sessions (id, user_id)
    on delete cascade
);

create table public.adjustment_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  based_on_session_id uuid not null,
  dial_in_thread_id uuid not null,
  parameter text not null check (parameter in ('grind', 'temperature', 'ratio', 'water', 'brew_time')),
  previous_value text not null,
  suggested_value text not null,
  direction text not null check (char_length(trim(direction)) between 1 and 80),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'ignored', 'superseded')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint adjustment_suggestions_owned_session_fkey
    foreign key (based_on_session_id, user_id)
    references public.brew_sessions (id, user_id)
    on delete cascade,
  constraint adjustment_suggestions_owned_thread_fkey
    foreign key (dial_in_thread_id, user_id)
    references public.dial_in_threads (id, user_id)
    on delete cascade
);

create trigger coffees_set_updated_at
before update on public.coffees
for each row execute function public.set_updated_at();

create trigger dial_in_threads_set_updated_at
before update on public.dial_in_threads
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create index bean_profiles_user_id_idx on public.bean_profiles (user_id);
create index coffees_user_status_idx on public.coffees (user_id, status);
create index coffees_bean_profile_id_idx on public.coffees (bean_profile_id);
create index recipe_templates_catalog_idx on public.recipe_templates (brewer_type, source, is_public);
create index recipe_steps_template_order_idx on public.recipe_steps (recipe_template_id, step_order);
create index dial_in_threads_coffee_status_idx on public.dial_in_threads (coffee_id, status);
create index dial_in_threads_user_updated_idx on public.dial_in_threads (user_id, updated_at desc);
create index brew_plans_coffee_created_idx on public.brew_plans (coffee_id, created_at desc);
create index brew_plans_thread_created_idx on public.brew_plans (dial_in_thread_id, created_at desc);
create index brew_plans_user_created_idx on public.brew_plans (user_id, created_at desc);
create index brew_plan_steps_plan_order_idx on public.brew_plan_steps (brew_plan_id, step_order);
create index brew_sessions_user_started_idx on public.brew_sessions (user_id, started_at desc);
create index brew_session_steps_session_idx on public.brew_session_steps (brew_session_id);
create index taste_feedback_user_created_idx on public.taste_feedback (user_id, created_at desc);
create index adjustment_suggestions_thread_status_idx
  on public.adjustment_suggestions (dial_in_thread_id, status, created_at desc);
create index adjustment_suggestions_user_created_idx
  on public.adjustment_suggestions (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.bean_profiles enable row level security;
alter table public.coffees enable row level security;
alter table public.recipe_templates enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.dial_in_threads enable row level security;
alter table public.brew_plans enable row level security;
alter table public.brew_plan_steps enable row level security;
alter table public.brew_sessions enable row level security;
alter table public.brew_session_steps enable row level security;
alter table public.taste_feedback enable row level security;
alter table public.adjustment_suggestions enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.recipe_templates, public.recipe_steps to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.bean_profiles to authenticated;
grant select, insert, update, delete on public.coffees to authenticated;
grant select, insert, update, delete on public.dial_in_threads to authenticated;
grant select, insert, update, delete on public.brew_plans to authenticated;
grant select, insert, update, delete on public.brew_plan_steps to authenticated;
grant select, insert, update, delete on public.brew_sessions to authenticated;
grant select, insert, update, delete on public.brew_session_steps to authenticated;
grant select, insert, update, delete on public.taste_feedback to authenticated;
grant select, insert, update, delete on public.adjustment_suggestions to authenticated;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "bean_profiles_select_own"
on public.bean_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "bean_profiles_insert_own"
on public.bean_profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "bean_profiles_update_own"
on public.bean_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "bean_profiles_delete_own"
on public.bean_profiles for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "coffees_select_own"
on public.coffees for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "coffees_insert_own"
on public.coffees for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "coffees_update_own"
on public.coffees for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "coffees_delete_own"
on public.coffees for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "recipe_templates_select_public"
on public.recipe_templates for select
to anon, authenticated
using (is_public);

create policy "recipe_steps_select_public"
on public.recipe_steps for select
to anon, authenticated
using (
  exists (
    select 1
    from public.recipe_templates
    where recipe_templates.id = recipe_steps.recipe_template_id
      and recipe_templates.is_public
  )
);

create policy "dial_in_threads_select_own"
on public.dial_in_threads for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "dial_in_threads_insert_own"
on public.dial_in_threads for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "dial_in_threads_update_own"
on public.dial_in_threads for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "dial_in_threads_delete_own"
on public.dial_in_threads for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "brew_plans_select_own"
on public.brew_plans for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "brew_plans_insert_own"
on public.brew_plans for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "brew_plans_update_own"
on public.brew_plans for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "brew_plans_delete_own"
on public.brew_plans for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "brew_plan_steps_select_own"
on public.brew_plan_steps for select
to authenticated
using (
  exists (
    select 1 from public.brew_plans
    where brew_plans.id = brew_plan_steps.brew_plan_id
      and brew_plans.user_id = (select auth.uid())
  )
);

create policy "brew_plan_steps_insert_own"
on public.brew_plan_steps for insert
to authenticated
with check (
  exists (
    select 1 from public.brew_plans
    where brew_plans.id = brew_plan_steps.brew_plan_id
      and brew_plans.user_id = (select auth.uid())
  )
);

create policy "brew_plan_steps_update_own"
on public.brew_plan_steps for update
to authenticated
using (
  exists (
    select 1 from public.brew_plans
    where brew_plans.id = brew_plan_steps.brew_plan_id
      and brew_plans.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.brew_plans
    where brew_plans.id = brew_plan_steps.brew_plan_id
      and brew_plans.user_id = (select auth.uid())
  )
);

create policy "brew_plan_steps_delete_own"
on public.brew_plan_steps for delete
to authenticated
using (
  exists (
    select 1 from public.brew_plans
    where brew_plans.id = brew_plan_steps.brew_plan_id
      and brew_plans.user_id = (select auth.uid())
  )
);

create policy "brew_sessions_select_own"
on public.brew_sessions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "brew_sessions_insert_own"
on public.brew_sessions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "brew_sessions_update_own"
on public.brew_sessions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "brew_sessions_delete_own"
on public.brew_sessions for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "brew_session_steps_select_own"
on public.brew_session_steps for select
to authenticated
using (
  exists (
    select 1
    from public.brew_sessions
    join public.brew_plan_steps
      on brew_plan_steps.brew_plan_id = brew_sessions.brew_plan_id
    where brew_sessions.id = brew_session_steps.brew_session_id
      and brew_sessions.user_id = (select auth.uid())
      and brew_plan_steps.id = brew_session_steps.brew_plan_step_id
  )
);

create policy "brew_session_steps_insert_own"
on public.brew_session_steps for insert
to authenticated
with check (
  exists (
    select 1
    from public.brew_sessions
    join public.brew_plan_steps
      on brew_plan_steps.brew_plan_id = brew_sessions.brew_plan_id
    where brew_sessions.id = brew_session_steps.brew_session_id
      and brew_sessions.user_id = (select auth.uid())
      and brew_plan_steps.id = brew_session_steps.brew_plan_step_id
  )
);

create policy "brew_session_steps_update_own"
on public.brew_session_steps for update
to authenticated
using (
  exists (
    select 1
    from public.brew_sessions
    join public.brew_plan_steps
      on brew_plan_steps.brew_plan_id = brew_sessions.brew_plan_id
    where brew_sessions.id = brew_session_steps.brew_session_id
      and brew_sessions.user_id = (select auth.uid())
      and brew_plan_steps.id = brew_session_steps.brew_plan_step_id
  )
)
with check (
  exists (
    select 1
    from public.brew_sessions
    join public.brew_plan_steps
      on brew_plan_steps.brew_plan_id = brew_sessions.brew_plan_id
    where brew_sessions.id = brew_session_steps.brew_session_id
      and brew_sessions.user_id = (select auth.uid())
      and brew_plan_steps.id = brew_session_steps.brew_plan_step_id
  )
);

create policy "brew_session_steps_delete_own"
on public.brew_session_steps for delete
to authenticated
using (
  exists (
    select 1
    from public.brew_sessions
    join public.brew_plan_steps
      on brew_plan_steps.brew_plan_id = brew_sessions.brew_plan_id
    where brew_sessions.id = brew_session_steps.brew_session_id
      and brew_sessions.user_id = (select auth.uid())
      and brew_plan_steps.id = brew_session_steps.brew_plan_step_id
  )
);

create policy "taste_feedback_select_own"
on public.taste_feedback for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "taste_feedback_insert_own"
on public.taste_feedback for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "taste_feedback_update_own"
on public.taste_feedback for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "taste_feedback_delete_own"
on public.taste_feedback for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "adjustment_suggestions_select_own"
on public.adjustment_suggestions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "adjustment_suggestions_insert_own"
on public.adjustment_suggestions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "adjustment_suggestions_update_own"
on public.adjustment_suggestions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "adjustment_suggestions_delete_own"
on public.adjustment_suggestions for delete
to authenticated
using ((select auth.uid()) = user_id);

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
