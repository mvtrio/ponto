-- O funcionário passa a bater apenas uma entrada e uma saída por dia.
-- O intervalo deixa de ser marcado (nem manual, nem automático) e vira um desconto
-- fixo configurável, aplicado sobre o total do dia.
--
-- As marcações de intervalo já gravadas (break_start/break_end, geradas automaticamente
-- às 12:00/13:00) são preservadas como histórico, mas passam a ser ignoradas tanto pelo
-- cálculo quanto pelas telas. Por isso o check constraint de punches continua aceitando
-- esses tipos — nada é apagado.

alter table public.company_settings
  add column if not exists break_minutes int not null default 60;

comment on column public.company_settings.break_minutes is
  'Minutos de intervalo descontados automaticamente de cada dia trabalhado (não são marcados pelo funcionário).';

-- Recalcula os minutos do dia usando só o par entrada/saída e descontando o intervalo fixo.
-- Marcações de intervalo antigas são ignoradas: sem isso o desconto seria contado duas vezes.
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
      and occurred_at >= p_day::timestamptz
      and occurred_at < (p_day + 1)::timestamptz
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

  -- O intervalo só é descontado de um dia efetivamente fechado; um dia sem par
  -- entrada/saída não deve ficar com saldo negativo por conta do desconto.
  if v_paired then
    v_total_minutes := v_total_minutes - coalesce(v_break_minutes, 0);
  end if;

  worked_minutes := round(greatest(v_total_minutes, 0))::int;
  is_incomplete := v_incomplete;
  return next;
end;
$$;

comment on function public.daily_worked_minutes is
  'Minutos trabalhados por funcionário em um dia: par entrada/saída menos o intervalo fixo de company_settings.break_minutes.';
