-- Toda marcação batida pelo funcionário nasce pendente e só passa a valer depois que um
-- admin aprova. A aprovação é feita na tela de administração.

alter table public.punches
  add column if not exists approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists approved_by uuid references public.profiles (id),
  add column if not exists approved_at timestamptz;

comment on column public.punches.approval_status is
  'Marcações nascem pendentes; só entram no cálculo de horas depois de aprovadas por um admin.';

-- Marcações que já existiam são anteriores à regra: valem como aprovadas, senão todo o
-- histórico (e o saldo do banco de horas) zeraria de uma vez.
update public.punches
set approval_status = 'approved'
where approval_status = 'pending';

create index if not exists punches_pending_idx
  on public.punches (approval_status, occurred_at)
  where approval_status = 'pending';

-- effective_punches é a fonte única do cálculo de horas: filtrando aqui, tanto
-- daily_worked_minutes quanto daily_summary passam a ignorar pendentes e rejeitadas
-- sem nenhuma outra alteração.
--
-- create or replace (e não drop + create): a view daily_summary depende desta, e o drop
-- falharia com "cannot drop view effective_punches because other objects depend on it".
-- O replace é aceito porque as colunas novas de punches entram no fim da lista.
create or replace view public.effective_punches
  with (security_invoker = true) as
  select * from public.punches
  where superseded_by is null and approval_status = 'approved';

comment on view public.effective_punches is
  'Marcações vigentes: aprovadas e não substituídas por uma correção.';

-- Aprova ou rejeita uma marcação. security definer porque punches não tem policy de
-- update — o cliente nunca altera o ledger diretamente.
create or replace function public.review_punch(p_punch_id uuid, p_approve boolean)
returns public.punches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_punch public.punches;
begin
  if not public.is_admin() then
    raise exception 'apenas administradores podem aprovar marcações';
  end if;

  select * into v_punch from public.punches where id = p_punch_id for update;

  if v_punch is null then
    raise exception 'marcação não encontrada';
  end if;

  if v_punch.approval_status <> 'pending' then
    raise exception 'marcação já foi revisada';
  end if;

  update public.punches
  set approval_status = case when p_approve then 'approved' else 'rejected' end,
      approved_by = auth.uid(),
      approved_at = now()
  where id = p_punch_id
  returning * into v_punch;

  return v_punch;
end;
$$;

comment on function public.review_punch is 'Aprova ou rejeita uma marcação pendente (somente admin).';

-- Correção aprovada já passou pelo crivo do admin: a marcação resultante nasce aprovada,
-- senão exigiria uma segunda aprovação para o mesmo ato.
create or replace function public.approve_correction(p_correction_id uuid, p_approve boolean)
returns public.corrections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correction public.corrections;
  v_new_punch_id uuid;
begin
  if not public.is_admin() then
    raise exception 'apenas administradores podem aprovar correções';
  end if;

  select * into v_correction from public.corrections where id = p_correction_id for update;

  if v_correction is null then
    raise exception 'correção não encontrada';
  end if;

  if v_correction.status <> 'pending' then
    raise exception 'correção já foi revisada';
  end if;

  if p_approve then
    insert into public.punches
      (employee_id, type, occurred_at, source, approval_status, approved_by, approved_at)
    values
      (v_correction.employee_id, v_correction.proposed_type, v_correction.proposed_occurred_at,
       'correction', 'approved', auth.uid(), now())
    returning id into v_new_punch_id;

    if v_correction.original_punch_id is not null then
      update public.punches
      set is_corrected = true, superseded_by = v_new_punch_id
      where id = v_correction.original_punch_id;
    end if;

    update public.corrections
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), resulting_punch_id = v_new_punch_id
    where id = p_correction_id
    returning * into v_correction;
  else
    update public.corrections
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_correction_id
    returning * into v_correction;
  end if;

  return v_correction;
end;
$$;
