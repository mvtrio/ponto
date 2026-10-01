-- Dia com atestado ou folga volta a aparecer na apuração, marcado e com saldo zero.
--
-- Em 0019 o dia justificado foi simplesmente excluído da view. Isso resolveu a falta
-- indevida, mas apagou o dia: ele sumiu do relatório, do quadro de marcações e do
-- histórico da funcionária, como se nada tivesse acontecido ali. Some do papel justamente
-- o dia que o atestado existe para documentar.
--
-- Agora o dia existe, traz o motivo em `absence_kind` e tem balance_minutes = 0 — não é
-- falta, não é débito, mas está lá.

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
    -- Justificado sem marcação: o dia não é cobrado nem premiado. Zero explícito em vez
    -- de linha ausente, para que o relatório tenha o que mostrar.
    when j.kind is not null and p.day is null then 0
    when p.clock_in_at is null or p.clock_out_at is null then 0
    else greatest(
      round(extract(epoch from (p.clock_out_at - p.clock_in_at)) / 60 - coalesce(cs.break_minutes, 0)),
      0
    )::int
  end - case
    when j.kind is not null and p.day is null then 0
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
       -- Justificado entra inclusive hoje: não é uma acusação, é um registro.
       j.kind is not null
       or c.day < (now() at time zone 'America/Sao_Paulo')::date
     )
   );

comment on view public.daily_summary is
  'Um registro por funcionário/dia: trabalhados, justificados (atestado/folga, saldo zero) e faltas.';
