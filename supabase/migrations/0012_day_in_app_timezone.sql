-- Alinha o cálculo de horas ao fuso do sistema (America/Sao_Paulo).
--
-- `p_day::timestamptz` usa o TimeZone da sessão do Postgres, que no Supabase é UTC. O dia
-- começava, portanto, às 21h de Brasília do dia anterior: uma marcação às 22h caía no dia
-- seguinte no cálculo, enquanto o índice punches_one_per_type_per_day (que já usa
-- America/Sao_Paulo) a considerava do dia certo. O cliente tinha ainda um terceiro
-- critério. Agora os três concordam.

create or replace function public.daily_worked_minutes(p_employee_id uuid, p_day date)
returns table (worked_minutes int, is_incomplete boolean)
language plpgsql
stable
as $$
declare
  v_punch record;
  v_clock_in timestamptz;
  v_total_minutes numeric := 0;
  v_paired boolean := false;
  v_incomplete boolean := false;
  v_break_minutes int;
begin
  select break_minutes into v_break_minutes from public.company_settings where id = 1;

  for v_punch in
    select type, occurred_at
    from public.effective_punches
    where employee_id = p_employee_id
      and (occurred_at at time zone 'America/Sao_Paulo')::date = p_day
      and type in ('clock_in', 'clock_out')
    order by occurred_at asc
  loop
    if v_punch.type = 'clock_in' then
      v_clock_in := v_punch.occurred_at;
    elsif v_punch.type = 'clock_out' then
      if v_clock_in is not null then
        v_total_minutes := v_total_minutes + extract(epoch from (v_punch.occurred_at - v_clock_in)) / 60;
        v_clock_in := null;
        v_paired := true;
      else
        v_incomplete := true;
      end if;
    end if;
  end loop;

  -- Entrada sem saída correspondente: dia ainda aberto.
  if v_clock_in is not null then
    v_incomplete := true;
  end if;

  -- O intervalo só é descontado de um dia efetivamente fechado.
  if v_paired then
    v_total_minutes := v_total_minutes - coalesce(v_break_minutes, 0);
  end if;

  worked_minutes := round(greatest(v_total_minutes, 0))::int;
  is_incomplete := v_incomplete;
  return next;
end;
$$;

comment on function public.daily_worked_minutes is
  'Minutos trabalhados no dia (fuso America/Sao_Paulo): par entrada/saída menos company_settings.break_minutes.';

-- A lista de dias do funcionário também precisa sair do mesmo critério, senão um dia
-- existiria no resumo com a fronteira errada.
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
  select distinct (occurred_at at time zone 'America/Sao_Paulo')::date as day
  from public.effective_punches
  where employee_id = p.id
) d
cross join public.company_settings cs
cross join lateral public.daily_worked_minutes(p.id, d.day) w;

comment on view public.daily_summary is
  'Um registro por funcionário/dia (fuso America/Sao_Paulo) com minutos trabalhados e saldo do dia.';
