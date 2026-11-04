-- Liberado: o funcionário foi dispensado no dia, mas a jornada é descontada como falta.
--
-- Atestado e folga zeram o saldo do dia. Liberado não: a empresa autorizou a ausência,
-- então o dia não é falta — aparece marcado com o motivo —, mas as horas não trabalhadas
-- entram no banco como débito, exatamente como numa falta.

alter table public.justified_absences
  drop constraint if exists justified_absences_kind_check;

alter table public.justified_absences
  add constraint justified_absences_kind_check
  check (kind in ('atestado', 'folga', 'liberado'));

comment on table public.justified_absences is
  'Dias de ausência autorizada: atestado e folga não geram débito; liberado desconta a jornada como falta.';

-- Mesma view de 0021; só muda o saldo do dia justificado sem marcação, que passa a
-- depender do motivo.
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
),
justificado as (
  select employee_id, day, kind from public.justified_absences
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
  end - case
    -- Atestado/folga sem marcação: o dia não é cobrado. Liberado é cobrado como falta.
    when j.kind is not null and j.kind <> 'liberado' and p.day is null then 0
    else cs.standard_daily_minutes
  end as balance_minutes,
  j.kind as absence_kind
from calendar c
cross join public.company_settings cs
left join public.daily_punch_pairs p on p.employee_id = c.employee_id and p.day = c.day
left join marked m on m.employee_id = c.employee_id and m.day = c.day
left join justificado j on j.employee_id = c.employee_id and j.day = c.day
where p.day is not null
   or (
     m.day is null
     and public.is_working_day(c.day)
     and (
       j.kind is not null
       or c.day < (now() at time zone 'America/Sao_Paulo')::date
     )
   );

comment on view public.daily_summary is
  'Um registro por funcionário/dia: trabalhados, justificados (atestado/folga com saldo zero; liberado com a jornada descontada) e faltas.';
