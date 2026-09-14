-- O dia em andamento não pode pesar no saldo.
--
-- Um dia com entrada batida e saída ainda não batida era contado como 0h trabalhadas,
-- lançando a jornada inteira como débito: às 8h da manhã o funcionário já aparecia com
-- -8h e o acumulado virava negativo, mesmo estando em dia. O dia de hoje sem marcação
-- alguma já era ignorado (0014); faltava o caso do dia aberto.
--
-- A partir daqui, um dia só entra no saldo quando tem entrada E saída. Dia de hoje
-- incompleto fica neutro (saldo 0); dias anteriores sem par continuam devendo a jornada,
-- porque aí a jornada realmente não foi cumprida.

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
base as (
  select
    c.employee_id,
    c.day,
    p.clock_in_at,
    p.clock_out_at,
    cs.standard_daily_minutes,
    cs.break_minutes,
    c.day = (now() at time zone 'America/Sao_Paulo')::date as is_today
  from calendar c
  cross join public.company_settings cs
  left join public.daily_punch_pairs p on p.employee_id = c.employee_id and p.day = c.day
  left join marked m on m.employee_id = c.employee_id and m.day = c.day
  where p.day is not null
     or (m.day is null and public.is_working_day(c.day)
         and c.day < (now() at time zone 'America/Sao_Paulo')::date)
)
select
  employee_id,
  day,
  case
    when clock_in_at is null or clock_out_at is null then 0
    else greatest(
      round(extract(epoch from (clock_out_at - clock_in_at)) / 60 - coalesce(break_minutes, 0)),
      0
    )::int
  end as worked_minutes,
  (clock_in_at is null or clock_out_at is null) as is_incomplete,
  standard_daily_minutes,
  case
    -- Dia fechado: horas trabalhadas menos a jornada.
    when clock_in_at is not null and clock_out_at is not null then
      greatest(
        round(extract(epoch from (clock_out_at - clock_in_at)) / 60 - coalesce(break_minutes, 0)),
        0
      )::int - standard_daily_minutes
    -- Hoje ainda aberto: neutro, o expediente não terminou.
    when is_today then 0
    -- Dia anterior sem par: a jornada não foi cumprida.
    else -standard_daily_minutes
  end as balance_minutes
from base;

comment on view public.daily_summary is
  'Um registro por funcionário/dia. Dia aberto de hoje não afeta o saldo; dia anterior sem par completo deve a jornada.';
