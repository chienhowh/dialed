do $$
begin
  if exists (select 1 from public.adjustment_suggestions) then
    raise exception using
      errcode = 'P0001',
      message = 'adjustment_suggestions contains data; a lossless adjustment_decisions backfill is not possible';
  end if;
end;
$$;

alter table public.taste_feedback
  add constraint taste_feedback_owner_key unique (id, user_id),
  add constraint taste_feedback_quick_feedback_required_check check (
    pretty_good
    or too_sour
    or too_bitter
    or too_weak
    or too_strong
    or astringent
  ),
  add constraint taste_feedback_pretty_good_exclusive_check check (
    not pretty_good
    or not (too_sour or too_bitter or too_weak or too_strong or astringent)
  );

drop policy "taste_feedback_insert_own" on public.taste_feedback;

create policy "taste_feedback_insert_own_completed_session"
on public.taste_feedback for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.brew_sessions
    where brew_sessions.id = taste_feedback.brew_session_id
      and brew_sessions.user_id = taste_feedback.user_id
      and brew_sessions.status = 'completed'
  )
);

drop table public.adjustment_suggestions;

create table public.adjustment_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  taste_feedback_id uuid not null unique,
  inferred_directions text[] not null,
  selected_direction text not null,
  interpretation_version text not null,
  recommended_candidate jsonb,
  selected_candidate jsonb,
  candidate_knowledge_version text,
  status text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint adjustment_decisions_owned_feedback_fkey
    foreign key (taste_feedback_id, user_id)
    references public.taste_feedback (id, user_id)
    on delete cascade,
  constraint adjustment_decisions_inferred_directions_check check (
    cardinality(inferred_directions) > 0
    and inferred_directions <@ array[
      'increase_extraction',
      'decrease_extraction',
      'increase_strength',
      'decrease_strength',
      'reduce_astringency',
      'hold'
    ]::text[]
  ),
  constraint adjustment_decisions_selected_direction_check check (
    selected_direction in (
      'increase_extraction',
      'decrease_extraction',
      'increase_strength',
      'decrease_strength',
      'reduce_astringency',
      'hold'
    )
    and selected_direction = any(inferred_directions)
  ),
  constraint adjustment_decisions_interpretation_version_check check (
    char_length(trim(interpretation_version)) > 0
  ),
  constraint adjustment_decisions_candidate_knowledge_version_check check (
    candidate_knowledge_version is null
    or char_length(trim(candidate_knowledge_version)) > 0
  ),
  constraint adjustment_decisions_recommended_candidate_check check (
    recommended_candidate is null
    or (
      jsonb_typeof(recommended_candidate) = 'object'
      and recommended_candidate ?& array[
        'parameter',
        'changeDirection',
        'evidenceClassification',
        'reason'
      ]
      and recommended_candidate - array[
        'parameter',
        'changeDirection',
        'evidenceClassification',
        'reason'
      ] = '{}'::jsonb
      and jsonb_typeof(recommended_candidate -> 'parameter') = 'string'
      and jsonb_typeof(recommended_candidate -> 'changeDirection') = 'string'
      and jsonb_typeof(recommended_candidate -> 'evidenceClassification') = 'string'
      and jsonb_typeof(recommended_candidate -> 'reason') = 'string'
      and recommended_candidate ->> 'parameter' in ('grind', 'temperature', 'water')
      and recommended_candidate ->> 'changeDirection' in ('finer', 'coarser', 'higher', 'lower')
      and (
        (
          recommended_candidate ->> 'parameter' = 'grind'
          and recommended_candidate ->> 'changeDirection' in ('finer', 'coarser')
        )
        or (
          recommended_candidate ->> 'parameter' in ('temperature', 'water')
          and recommended_candidate ->> 'changeDirection' in ('higher', 'lower')
        )
      )
      and recommended_candidate ->> 'evidenceClassification' = 'product_heuristic'
      and char_length(trim(recommended_candidate ->> 'reason')) > 0
    )
  ),
  constraint adjustment_decisions_selected_candidate_check check (
    selected_candidate is null
    or (
      jsonb_typeof(selected_candidate) = 'object'
      and selected_candidate ?& array[
        'parameter',
        'changeDirection',
        'evidenceClassification',
        'reason'
      ]
      and selected_candidate - array[
        'parameter',
        'changeDirection',
        'evidenceClassification',
        'reason'
      ] = '{}'::jsonb
      and jsonb_typeof(selected_candidate -> 'parameter') = 'string'
      and jsonb_typeof(selected_candidate -> 'changeDirection') = 'string'
      and jsonb_typeof(selected_candidate -> 'evidenceClassification') = 'string'
      and jsonb_typeof(selected_candidate -> 'reason') = 'string'
      and selected_candidate ->> 'parameter' in ('grind', 'temperature', 'water')
      and selected_candidate ->> 'changeDirection' in ('finer', 'coarser', 'higher', 'lower')
      and (
        (
          selected_candidate ->> 'parameter' = 'grind'
          and selected_candidate ->> 'changeDirection' in ('finer', 'coarser')
        )
        or (
          selected_candidate ->> 'parameter' in ('temperature', 'water')
          and selected_candidate ->> 'changeDirection' in ('higher', 'lower')
        )
      )
      and selected_candidate ->> 'evidenceClassification' = 'product_heuristic'
      and char_length(trim(selected_candidate ->> 'reason')) > 0
    )
  ),
  constraint adjustment_decisions_status_consistency_check check (
    (
      status = 'held'
      and selected_direction = 'hold'
      and inferred_directions = array['hold']::text[]
      and recommended_candidate is null
      and selected_candidate is null
      and candidate_knowledge_version is null
    )
    or (
      status in ('pending', 'applied')
      and selected_direction <> 'hold'
      and not ('hold' = any(inferred_directions))
      and recommended_candidate is not null
      and selected_candidate is not null
      and candidate_knowledge_version is not null
    )
    or (
      status = 'unsupported'
      and selected_direction <> 'hold'
      and not ('hold' = any(inferred_directions))
      and recommended_candidate is null
      and selected_candidate is null
      and candidate_knowledge_version is not null
    )
  )
);

create index adjustment_decisions_user_status_created_idx
  on public.adjustment_decisions (user_id, status, created_at desc);

alter table public.adjustment_decisions enable row level security;

revoke all on public.adjustment_decisions from anon, authenticated;
grant select, insert, update, delete on public.adjustment_decisions to authenticated;

create policy "adjustment_decisions_select_own"
on public.adjustment_decisions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "adjustment_decisions_insert_own"
on public.adjustment_decisions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "adjustment_decisions_update_own"
on public.adjustment_decisions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "adjustment_decisions_delete_own"
on public.adjustment_decisions for delete
to authenticated
using ((select auth.uid()) = user_id);

grant all on public.adjustment_decisions to service_role;
