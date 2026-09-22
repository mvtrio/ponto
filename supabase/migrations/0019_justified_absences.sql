-- Atestado e folga: dias em que a ausência é justificada e não vira falta.
--
-- Hoje o sistema só sabe pular um dia se ele for fim de semana ou feriado — condições
-- iguais para todo mundo. Atestado e folga são do funcionário, não do calendário, então
-- precisam de uma tabela própria, por funcionário e por dia.
--
-- Por que isto e não um lançamento em balance_adjustments: o ajuste conserta o número e
-- deixa o histórico mentindo, continuaria escrito "falta" no dia. Aqui o dia deixa de ser
-- cobrado e fica registrado o motivo.

create table if not exists public.justified_absences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id),
  day date not null,
  kind text not null check (kind in ('atestado', 'folga')),
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  -- Um dia é justificado ou não é; dois registros para o mesmo dia não significariam nada.
  unique (employee_id, day)
);

comment on table public.justified_absences is
  'Dias de ausência justificada (atestado ou folga): não geram falta nem débito.';

create index if not exists justified_absences_employee_day_idx
  on public.justified_absences (employee_id, day);

alter table public.justified_absences enable row level security;

-- O funcionário vê os próprios: o dia sumiu do débito por causa deste registro, esconder
-- deixaria o banco de horas sem explicação.
create policy "justified_absences_select_own_or_admin" on public.justified_absences
  for select using (employee_id = auth.uid() or public.is_admin());

create policy "justified_absences_insert_admin" on public.justified_absences
  for insert with check (public.is_admin() and created_by = auth.uid());

create policy "justified_absences_delete_admin" on public.justified_absences
  for delete using (public.is_admin());

create or replace function public.has_justified_absence(p_employee_id uuid, p_day date)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.justified_absences a
    where a.employee_id = p_employee_id and a.day = p_day
  );
$$;

comment on function public.has_justified_absence is
  'Há atestado ou folga registrado para o funcionário neste dia.';

-- Mesma view de 0014, com uma condição a mais: dia justificado não gera linha de falta.
-- Repetida por inteiro porque `create or replace view` não aceita alteração parcial.
create or replace view public.daily_summary
  with (security_invoker = true) as
with bounds as (
  select p.employee_id,
         greatest(
           min((p.occurred_at at time zone 'America/Sao_Paulo')::date),
           (select tracking_starts_on from public.company_settings where id = 1)
         ) as first_day
  from public.effective_punches p
  group by p.employee_id
),
calendar as (
  select b.employee_id, d::date as day
  from bounds b
  cross join lateral generate_series(
    b.first_day,
    (now() at time zone 'America/Sao_Paulo')::date,
    interval '1 day'
  ) as d
),
marked as (
  select employee_id, (occurred_at at time zone 'America/Sao_Paulo')::date as day
  from public.punches
  where superseded_by is null
    and approval_status <> 'rejected'
    and type in ('clock_in', 'clock_out')
  group by 1, 2
)
select
  c.employee_id,
  c.day,
  case
    when p.clock_in_at is null or p.clock_out_at is null then 0
    else greatest(
      round(extract(epoch from (p.clock_out_at - p.clock_in_at)) / 60 - coalesce(cs.break_minutes, 0)),
      0
    )::int
  end as worked_minutes,
  (p.clock_in_at is null or p.clock_out_at is null) as is_incomplete,
  cs.standard_daily_minutes,
  case
    when p.clock_in_at is null or p.clock_out_at is null then 0
    else greatest(
      round(extract(epoch from (p.clock_out_at - p.clock_in_at)) / 60 - coalesce(cs.break_minutes, 0)),
      0
    )::int
  end - cs.standard_daily_minutes as balance_minutes
from calendar c
cross join public.company_settings cs
left join public.daily_punch_pairs p on p.employee_id = c.employee_id and p.day = c.day
left join marked m on m.employee_id = c.employee_id and m.day = c.day
where p.day is not null
   or (
     m.day is null
     and public.is_working_day(c.day)
     and c.day < (now() at time zone 'America/Sao_Paulo')::date
     and not public.has_justified_absence(c.employee_id, c.day)
   );

comment on view public.daily_summary is
  'Um registro por funcionário/dia: dias trabalhados e dias úteis sem marcação nem justificativa (falta).';
