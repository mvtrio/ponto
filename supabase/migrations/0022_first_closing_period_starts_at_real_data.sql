-- O período do primeiro fechamento tem de ser uma data que existiu.
--
-- Sem fechamento anterior, a apuração começa "desde sempre" — e esse "sempre" estava
-- sendo gravado como 1900-01-01 e aparecendo no extrato da funcionária:
-- "Período apurado: 01/01/1900 a 30/09/2026". A sentinela serve para a conta (em
-- hour_bank_state ela só precisa ser anterior a qualquer marcação), mas não serve para
-- ser lida: o extrato existe justamente para ser conferido.
--
-- O começo real do primeiro fechamento é o primeiro dia com movimento do funcionário —
-- marcação ou ajuste manual. Se esse dia cair dentro do próprio mês fechado (ou se não
-- houver movimento nenhum), o período começa no dia 1º do mês. Se for anterior, continua
-- aparecendo: aqueles dias entram na apuração de verdade e esconder isso seria mentir
-- sobre o que o número contém.

create or replace function public.close_month(p_employee_id uuid, p_month date)
returns public.month_closings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', p_month)::date;
  v_from date;
  v_to date := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;
  v_last date;
  v_first date;
  v_debit int;
  v_overtime int;
  v_applied int;
  v_row public.month_closings;
begin
  if not public.is_admin() then
    raise exception 'Apenas o administrador pode fechar o mês.';
  end if;

  -- Fechar um mês em curso jogaria os dias restantes para depois da fronteira, e eles
  -- sumiriam da apuração. Só se fecha mês terminado.
  if v_to >= (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'O mês ainda não terminou. O fechamento só pode ser feito a partir do dia 1º do mês seguinte.';
  end if;

  select max(c.to_day) into v_last
  from public.month_closings c where c.employee_id = p_employee_id;

  if v_last is not null and v_month <= date_trunc('month', v_last)::date then
    raise exception 'Este mês já foi fechado, ou é anterior ao último fechamento.';
  end if;

  if v_last is null then
    select min(x.day) into v_first from (
      select min(d.day) as day from public.daily_summary d where d.employee_id = p_employee_id
      union all
      select min(a.day) as day from public.balance_adjustments a where a.employee_id = p_employee_id
    ) x;
    -- least ignora nulo: sem movimento nenhum, sobra o dia 1º do mês.
    v_from := least(v_first, v_month);
  else
    v_from := v_last + 1;
  end if;

  select s.debit_minutes, s.overtime_minutes into v_debit, v_overtime
  from public.hour_bank_state(p_employee_id, v_to) s;

  -- As extras pagam o débito até onde alcançam; o que sobra de um dos lados segue adiante.
  v_applied := least(v_debit, v_overtime);

  insert into public.month_closings (
    employee_id, month, from_day, to_day,
    debit_minutes, overtime_minutes, applied_minutes,
    carry_debit_minutes, carry_credit_minutes, closed_by
  ) values (
    p_employee_id, v_month, v_from, v_to,
    v_debit, v_overtime, v_applied,
    v_debit - v_applied, v_overtime - v_applied, auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.close_month is
  'Fecha o mês: as extras abatem o débito e o restante vai para o mês seguinte.';

-- Os fechamentos já gravados com a sentinela, pela mesma regra. Só o from_day muda; os
-- minutos apurados continuam exatamente os mesmos, porque a conta nunca dependeu dele.
update public.month_closings c
set from_day = least(
  (
    select min(x.day) from (
      select min(d.day) as day from public.daily_summary d where d.employee_id = c.employee_id
      union all
      select min(a.day) as day from public.balance_adjustments a where a.employee_id = c.employee_id
    ) x
  ),
  c.month
)
where c.from_day = date '1900-01-01';
