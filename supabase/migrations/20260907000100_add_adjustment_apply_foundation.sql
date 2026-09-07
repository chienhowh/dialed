do $$
begin
  if exists (
    select 1
    from public.adjustment_decisions
    where status = 'applied'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'applied adjustment_decisions exist without a safely reconstructable generated Plan relationship';
  end if;
end;
$$;

alter table public.brew_plans
  drop constraint brew_plans_recommendation_source_check,
  add constraint brew_plans_recommendation_source_check check (
    recommendation_source in (
      'official_rule',
      'manual',
      'previous_brew_adjustment',
      'community',
      'personal_history',
      'ai'
    )
  );

alter table public.adjustment_decisions
  add column applied_brew_plan_id uuid,
  add constraint adjustment_decisions_applied_brew_plan_key unique (applied_brew_plan_id),
  add constraint adjustment_decisions_owned_applied_plan_fkey
    foreign key (applied_brew_plan_id, user_id)
    references public.brew_plans (id, user_id)
    on delete restrict;

alter table public.adjustment_decisions
  drop constraint adjustment_decisions_status_consistency_check,
  add constraint adjustment_decisions_status_consistency_check check (
    (
      status = 'held'
      and selected_direction = 'hold'
      and inferred_directions = array['hold']::text[]
      and recommended_candidate is null
      and selected_candidate is null
      and candidate_knowledge_version is null
      and applied_brew_plan_id is null
    )
    or (
      status = 'pending'
      and selected_direction <> 'hold'
      and not ('hold' = any(inferred_directions))
      and recommended_candidate is not null
      and selected_candidate is not null
      and candidate_knowledge_version is not null
      and applied_brew_plan_id is null
    )
    or (
      status = 'applied'
      and selected_direction <> 'hold'
      and not ('hold' = any(inferred_directions))
      and recommended_candidate is not null
      and selected_candidate is not null
      and candidate_knowledge_version is not null
      and applied_brew_plan_id is not null
    )
    or (
      status = 'unsupported'
      and selected_direction <> 'hold'
      and not ('hold' = any(inferred_directions))
      and recommended_candidate is null
      and selected_candidate is null
      and candidate_knowledge_version is not null
      and applied_brew_plan_id is null
    )
  );

revoke update, delete on public.adjustment_decisions from authenticated;

drop policy "adjustment_decisions_insert_own" on public.adjustment_decisions;
create policy "adjustment_decisions_insert_own"
on public.adjustment_decisions for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and status in ('pending', 'held', 'unsupported')
  and applied_brew_plan_id is null
);

drop policy "adjustment_decisions_update_own" on public.adjustment_decisions;
drop policy "adjustment_decisions_delete_own" on public.adjustment_decisions;

create function public.apply_adjustment_decision(
  p_adjustment_decision_id uuid,
  p_magnitude_version text,
  p_grind_level text,
  p_water_temperature smallint,
  p_water_amount numeric,
  p_ratio numeric,
  p_pour_targets jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_decision public.adjustment_decisions%rowtype;
  v_source_plan public.brew_plans%rowtype;
  v_source_plan_id uuid;
  v_source_session_id uuid;
  v_source_session_status text;
  v_candidate_parameter text;
  v_candidate_direction text;
  v_expected_grind text;
  v_expected_temperature smallint;
  v_expected_ratio numeric(5, 2);
  v_expected_water numeric(7, 2);
  v_final_pour_step_id uuid;
  v_pour_count integer;
  v_new_plan_id uuid := gen_random_uuid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication is required';
  end if;

  select *
  into v_decision
  from public.adjustment_decisions
  where id = p_adjustment_decision_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Adjustment Decision is unavailable';
  end if;

  if v_decision.status = 'applied' then
    return v_decision.applied_brew_plan_id;
  end if;

  if v_decision.status <> 'pending' then
    raise exception using errcode = '22023', message = 'Adjustment Decision is not pending';
  end if;

  if p_magnitude_version is distinct from 'adjustment-magnitude-v1' then
    raise exception using errcode = '22023', message = 'unsupported adjustment magnitude version';
  end if;

  if v_decision.candidate_knowledge_version <> 'candidate-catalog-v1' then
    raise exception using errcode = '22023', message = 'unsupported candidate knowledge version';
  end if;

  select
    brew_sessions.id,
    brew_sessions.brew_plan_id,
    brew_sessions.status
  into
    v_source_session_id,
    v_source_plan_id,
    v_source_session_status
  from public.taste_feedback
  join public.brew_sessions
    on brew_sessions.id = taste_feedback.brew_session_id
   and brew_sessions.user_id = taste_feedback.user_id
  where taste_feedback.id = v_decision.taste_feedback_id
    and taste_feedback.user_id = v_user_id;

  if not found then
    raise exception using errcode = '23503', message = 'Adjustment Decision source chain is unavailable';
  end if;

  if v_source_session_status <> 'completed' then
    raise exception using errcode = '23514', message = 'Adjustment Decision source Session is not completed';
  end if;

  select *
  into v_source_plan
  from public.brew_plans
  where id = v_source_plan_id
    and user_id = v_user_id;

  if not found then
    raise exception using errcode = '23503', message = 'Adjustment Decision source Plan is unavailable';
  end if;

  v_candidate_parameter := v_decision.selected_candidate ->> 'parameter';
  v_candidate_direction := v_decision.selected_candidate ->> 'changeDirection';

  if not (
    (v_decision.selected_direction = 'increase_extraction' and (
      (v_candidate_parameter = 'grind' and v_candidate_direction = 'finer')
      or (v_candidate_parameter = 'temperature' and v_candidate_direction = 'higher')
    ))
    or (v_decision.selected_direction = 'decrease_extraction' and (
      (v_candidate_parameter = 'grind' and v_candidate_direction = 'coarser')
      or (v_candidate_parameter = 'temperature' and v_candidate_direction = 'lower')
    ))
    or (v_decision.selected_direction = 'increase_strength'
      and v_candidate_parameter = 'water'
      and v_candidate_direction = 'lower')
    or (v_decision.selected_direction = 'decrease_strength'
      and v_candidate_parameter = 'water'
      and v_candidate_direction = 'higher')
  ) then
    raise exception using errcode = '22023', message = 'selected Candidate does not match selected direction';
  end if;

  if v_candidate_parameter = 'grind' then
    if p_water_temperature is distinct from v_source_plan.water_temperature
      or p_water_amount is distinct from v_source_plan.water_amount
      or p_ratio is distinct from v_source_plan.ratio
      or p_pour_targets is distinct from '{}'::jsonb then
      raise exception using errcode = '22023', message = 'grind adjustment payload changes unrelated fields';
    end if;

    v_expected_grind := case v_source_plan.grind_level
      when 'fine' then case when v_candidate_direction = 'coarser' then 'medium-fine' end
      when 'medium-fine' then case
        when v_candidate_direction = 'finer' then 'fine'
        when v_candidate_direction = 'coarser' then 'medium'
      end
      when 'medium' then case
        when v_candidate_direction = 'finer' then 'medium-fine'
        when v_candidate_direction = 'coarser' then 'medium-coarse'
      end
      when 'medium-coarse' then case
        when v_candidate_direction = 'finer' then 'medium'
        when v_candidate_direction = 'coarser' then 'coarse'
      end
      when 'coarse' then case when v_candidate_direction = 'finer' then 'medium-coarse' end
    end;

    if v_expected_grind is null or p_grind_level is distinct from v_expected_grind then
      raise exception using errcode = '22023', message = 'invalid resolved grind adjustment';
    end if;
  elsif v_candidate_parameter = 'temperature' then
    if p_grind_level is distinct from v_source_plan.grind_level
      or p_water_amount is distinct from v_source_plan.water_amount
      or p_ratio is distinct from v_source_plan.ratio
      or p_pour_targets is distinct from '{}'::jsonb then
      raise exception using errcode = '22023', message = 'temperature adjustment payload changes unrelated fields';
    end if;

    v_expected_temperature := case v_candidate_direction
      when 'higher' then v_source_plan.water_temperature + 1
      when 'lower' then v_source_plan.water_temperature - 1
    end;

    if v_expected_temperature is null
      or v_expected_temperature not between 1 and 100
      or p_water_temperature is distinct from v_expected_temperature then
      raise exception using errcode = '22023', message = 'invalid resolved temperature adjustment';
    end if;
  elsif v_candidate_parameter = 'water' then
    if p_grind_level is distinct from v_source_plan.grind_level
      or p_water_temperature is distinct from v_source_plan.water_temperature then
      raise exception using errcode = '22023', message = 'water adjustment payload changes unrelated fields';
    end if;

    if v_source_plan.water_amount <= 0 then
      raise exception using errcode = '22023', message = 'source water must be positive';
    end if;

    v_expected_ratio := round(v_source_plan.ratio + case v_candidate_direction
      when 'higher' then 1.0
      when 'lower' then -1.0
    end, 2);
    v_expected_water := round(v_source_plan.coffee_dose * v_expected_ratio, 2);

    if v_expected_ratio is null
      or v_expected_ratio not between 1 and 100
      or v_expected_water not between 1 and 2000
      or p_ratio is distinct from v_expected_ratio
      or p_water_amount is distinct from v_expected_water then
      raise exception using errcode = '22023', message = 'invalid resolved water adjustment';
    end if;

    if p_pour_targets is null or jsonb_typeof(p_pour_targets) <> 'object' then
      raise exception using errcode = '22023', message = 'water adjustment requires Pour targets';
    end if;

    select count(*), (array_agg(id order by step_order desc))[1]
    into v_pour_count, v_final_pour_step_id
    from public.brew_plan_steps
    where brew_plan_id = v_source_plan.id
      and step_type = 'pour';

    if v_pour_count = 0
      or (select count(*) from jsonb_object_keys(p_pour_targets)) <> v_pour_count then
      raise exception using errcode = '22023', message = 'water adjustment Pour targets do not match source steps';
    end if;

    if exists (
      select 1
      from jsonb_each(p_pour_targets) as target(key, value)
      left join public.brew_plan_steps
        on brew_plan_steps.id::text = target.key
       and brew_plan_steps.brew_plan_id = v_source_plan.id
       and brew_plan_steps.step_type = 'pour'
      where jsonb_typeof(target.value) <> 'number'
         or brew_plan_steps.id is null
    ) or exists (
      select 1
      from public.brew_plan_steps
      where brew_plan_id = v_source_plan.id
        and step_type = 'pour'
        and not (p_pour_targets ? id::text)
    ) then
      raise exception using errcode = '22023', message = 'water adjustment Pour targets do not match source steps';
    end if;

    if exists (
      select 1
      from public.brew_plan_steps
      where brew_plan_id = v_source_plan.id
        and step_type = 'pour'
        and (p_pour_targets ->> id::text)::numeric is distinct from case
          when id = v_final_pour_step_id then v_expected_water
          else round(target_water * v_expected_water / v_source_plan.water_amount, 1)
        end
    ) then
      raise exception using errcode = '22023', message = 'water adjustment Pour targets are not proportionally rescaled';
    end if;

    if exists (
      select 1
      from (
        select
          (p_pour_targets ->> id::text)::numeric as target_water,
          lag((p_pour_targets ->> id::text)::numeric) over (order by step_order) as previous_target
        from public.brew_plan_steps
        where brew_plan_id = v_source_plan.id
          and step_type = 'pour'
      ) ordered_targets
      where target_water not between 0.1 and 2000
         or target_water < previous_target
    ) or (p_pour_targets ->> v_final_pour_step_id::text)::numeric <> v_expected_water then
      raise exception using errcode = '22023', message = 'water adjustment Pour targets are invalid';
    end if;
  else
    raise exception using errcode = '22023', message = 'unsupported selected Adjustment Candidate';
  end if;

  insert into public.brew_plans (
    id,
    user_id,
    coffee_id,
    dial_in_thread_id,
    recipe_template_id,
    coffee_dose,
    water_amount,
    ratio,
    water_temperature,
    grind_level,
    target_brew_time_min,
    target_brew_time_max,
    expected_flavor,
    recommendation_source,
    recommendation_reason,
    parent_plan_id,
    based_on_session_id
  ) values (
    v_new_plan_id,
    v_source_plan.user_id,
    v_source_plan.coffee_id,
    v_source_plan.dial_in_thread_id,
    v_source_plan.recipe_template_id,
    v_source_plan.coffee_dose,
    case when v_candidate_parameter = 'water' then p_water_amount else v_source_plan.water_amount end,
    case when v_candidate_parameter = 'water' then p_ratio else v_source_plan.ratio end,
    case when v_candidate_parameter = 'temperature' then p_water_temperature else v_source_plan.water_temperature end,
    case when v_candidate_parameter = 'grind' then p_grind_level else v_source_plan.grind_level end,
    v_source_plan.target_brew_time_min,
    v_source_plan.target_brew_time_max,
    v_source_plan.expected_flavor,
    'previous_brew_adjustment',
    v_source_plan.recommendation_reason,
    v_source_plan.id,
    v_source_session_id
  );

  insert into public.brew_plan_steps (
    id,
    brew_plan_id,
    step_order,
    step_type,
    start_time,
    duration,
    target_water,
    note
  )
  select
    gen_random_uuid(),
    v_new_plan_id,
    step_order,
    step_type,
    start_time,
    duration,
    case
      when v_candidate_parameter = 'water' and step_type = 'pour'
        then (p_pour_targets ->> id::text)::numeric
      else target_water
    end,
    note
  from public.brew_plan_steps
  where brew_plan_id = v_source_plan.id
  order by step_order;

  update public.adjustment_decisions
  set
    status = 'applied',
    applied_brew_plan_id = v_new_plan_id
  where id = v_decision.id
    and user_id = v_user_id
    and status = 'pending';

  if not found then
    raise exception using errcode = '40001', message = 'Adjustment Decision changed during application';
  end if;

  return v_new_plan_id;
end;
$$;

revoke all on function public.apply_adjustment_decision(uuid, text, text, smallint, numeric, numeric, jsonb)
  from public, anon;
grant execute on function public.apply_adjustment_decision(uuid, text, text, smallint, numeric, numeric, jsonb)
  to authenticated, service_role;
