-- Dia útil sem marcação nenhuma passa a existir como falta, com a jornada inteira em
-- saldo devedor.
--
-- Até aqui daily_summary só tinha linha para dia COM marcação, então um dia não batido
-- simplesmente não existia: não aparecia em lugar nenhum e não pesava no banco de horas.

-- Data em que o sistema entrou em uso. Antes dela não existe histórico a cobrar: contar
-- faltas retroativas inventaria um débito que nunca ocorreu.
alter table public.company_settings
  add column if not exists tracking_starts_on date not null default date '2026-09-01';

comment on column public.company_settings.tracking_starts_on is
  'Início do controle de ponto. Dias anteriores não geram falta nem entram no saldo.';

-- Os feriados fixos estavam só no cliente (features/company/holidaysService.ts). Sem
-- repeti-los aqui, 7 de setembro viraria falta. Móveis e regionais continuam vindo da
-- tabela `holidays`, cadastrados pelo admin.
create or replace function public.is_holiday(p_day date)
returns boolean
language sql
stable
as $$
  select exists (select 1 from public.holidays h where h.day = p_day)
      or (extract(month from p_day)::int, extract(day from p_day)::int) in
         ((1, 1), (4, 21), (5, 1), (9, 7), (10, 12), (11, 2), (11, 15), (12, 25));
$$;

comment on function public.is_holiday is
  'Feriado: cadastrado em holidays ou nacional de data fixa (mesma lista do cliente).';

create or replace function public.is_working_day(p_day date)
returns boolean
language sql
stable
as $$
  -- @> e não `= any (subconsulta)`: work_week_days é um int[] em uma única linha, e o
  -- `any` interpretaria a subconsulta como conjunto de linhas, comparando int com int[].
  select (select work_week_days from public.company_settings where id = 1)
           @> array[extract(dow from p_day)::int]
     and not public.is_holiday(p_day);
$$;

comment on function public.is_working_day is
  'Dia de trabalho: está em company_settings.work_week_days e não é feriado.';

create or replace view public.daily_summary
  with (security_invoker = true) as
with bounds as (
  -- Começa no maior entre a primeira marcação do funcionário e o início do controle:
  -- nem antes de ele existir no sistema, nem antes de o controle valer.
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
  -- Dias em que houve alguma marcação vigente, INCLUSIVE pendente de aprovação. Sem isso
  -- um dia batido e ainda não aprovado seria contado como falta.
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
-- Entra no resumo se: tem par aprovado, OU é dia útil sem marcação alguma (falta).
-- Dia com marcação só pendente fica de fora e a tela mostra como "aguardando";
-- fim de semana e feriado sem marcação não geram linha.
-- `c.day < hoje`: o dia corrente ainda está acontecendo. Marcá-lo como falta às 9h da
-- manhã acusaria uma ausência que não ocorreu — a falta só se confirma no dia seguinte.
where p.day is not null
   or (
     m.day is null
     and public.is_working_day(c.day)
     and c.day < (now() at time zone 'America/Sao_Paulo')::date
   );

comment on view public.daily_summary is
  'Um registro por funcionário/dia: dias trabalhados e dias úteis sem marcação (falta, jornada inteira negativa).';
