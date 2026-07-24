-- Cálculo de horas trabalhadas por dia e saldo de banco de horas.
-- Pareia clock_in/clock_out e break_start/break_end sequencialmente por dia,
-- de forma robusta a marcações ímpares/faltantes (ex.: esqueceu de bater a saída).

create or replace function public.daily_worked_minutes(p_employee_id uuid, p_day date)
returns table (worked_minutes int, is_incomplete boolean)
language plpgsql
stable
as $$
declare
  v_punch record;
  v_clock_in timestamptz;
  v_break_start timestamptz;
  v_total_minutes numeric := 0;
  v_incomplete boolean := false;
begin
  for v_punch in
    select type, occurred_at
    from public.effective_punches
    where employee_id = p_employee_id
      and occurred_at >= p_day::timestamptz
      and occurred_at < (p_day + 1)::timestamptz
    order by occurred_at asc
  loop
    if v_punch.type = 'clock_in' then
      v_clock_in := v_punch.occurred_at;
    elsif v_punch.type = 'clock_out' then
      if v_clock_in is not null then
        v_total_minutes := v_total_minutes + extract(epoch from (v_punch.occurred_at - v_clock_in)) / 60;
        v_clock_in := null;
      else
        v_incomplete := true;
      end if;
    elsif v_punch.type = 'break_start' then
      v_break_start := v_punch.occurred_at;
    elsif v_punch.type = 'break_end' then
      if v_break_start is not null then
        v_total_minutes := v_total_minutes - extract(epoch from (v_punch.occurred_at - v_break_start)) / 60;
        v_break_start := null;
      else
        v_incomplete := true;
      end if;
    end if;
  end loop;

  if v_clock_in is not null or v_break_start is not null then
    v_incomplete := true;
  end if;

  worked_minutes := round(greatest(v_total_minutes, 0))::int;
  is_incomplete := v_incomplete;
  return next;
end;
$$;

comment on function public.daily_worked_minutes is
  'Minutos trabalhados por funcionário em um dia, pareando clock_in/out e intervalos sequencialmente.';

-- Resumo diário: minutos trabalhados vs. jornada padrão da empresa.
-- security_invoker garante que a RLS de profiles/punches seja aplicada com base em quem
-- consulta a view (funcionário só vê a si mesmo; admin vê todos).
create or replace view public.daily_summary
  with (security_invoker = true) as
select
  p.id as employee_id,
  d.day,
  w.worked_minutes,
  w.is_incomplete,
  cs.standard_daily_minutes,
  w.worked_minutes - cs.standard_daily_minutes as balance_minutes
from public.profiles p
cross join lateral (
  select distinct occurred_at::date as day
  from public.effective_punches
  where employee_id = p.id
) d
cross join public.company_settings cs
cross join lateral public.daily_worked_minutes(p.id, d.day) w;

comment on view public.daily_summary is
  'Um registro por funcionário/dia com minutos trabalhados e saldo (banco de horas) do dia.';

-- Saldo acumulado do banco de horas até uma data (padrão: hoje).
create or replace function public.hour_bank_balance(p_employee_id uuid, p_as_of date default current_date)
returns int
language sql
stable
as $$
  select coalesce(sum(balance_minutes), 0)::int
  from public.daily_summary
  where employee_id = p_employee_id and day <= p_as_of;
$$;

comment on function public.hour_bank_balance is 'Saldo acumulado (minutos) do banco de horas até a data informada.';
