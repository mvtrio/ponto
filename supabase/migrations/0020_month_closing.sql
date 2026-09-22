-- Fechamento mensal do banco de horas.
--
-- Até aqui o saldo era um número só: extras menos débito, misturados. Quem olhava
-- "-0h46" não sabia que por trás havia 8h30 devidas e 7h44 trabalhadas a mais. Agora os
-- dois lados andam separados e só se encontram no fechamento, quando as extras abatem o
-- débito e o que sobrar segue para o mês seguinte.
--
-- O fechamento é o único ponto do sistema que guarda um número apurado. Todo o resto
-- continua derivado das marcações, então correção de ponto e atestado retroativos seguem
-- valendo — por isso o mês fechado pode ser reaberto.

create table if not exists public.month_closings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id),
  -- Sempre o dia 1º do mês fechado: a coluna é o mês, a data é só como o Postgres o guarda.
  month date not null,
  from_day date not null,
  to_day date not null,
  -- Estado apurado no momento do fechamento, incluindo o que veio do mês anterior.
  debit_minutes int not null check (debit_minutes >= 0),
  overtime_minutes int not null check (overtime_minutes >= 0),
  -- Quanto das extras foi usado para abater o débito.
  applied_minutes int not null check (applied_minutes >= 0),
  -- O que sobrou de cada lado e segue para o mês seguinte. Um deles é sempre zero.
  carry_debit_minutes int not null check (carry_debit_minutes >= 0),
  carry_credit_minutes int not null check (carry_credit_minutes >= 0),
  closed_by uuid not null references public.profiles (id),
  closed_at timestamptz not null default now(),
  unique (employee_id, month)
);

comment on table public.month_closings is
  'Fechamento mensal: extras abatem o débito e o restante passa para o mês seguinte.';

alter table public.month_closings enable row level security;

create policy "month_closings_select_own_or_admin" on public.month_closings
  for select using (employee_id = auth.uid() or public.is_admin());

create policy "month_closings_admin_all" on public.month_closings
  for all using (public.is_admin()) with check (public.is_admin());

-- Estado atual do banco de horas, com os dois lados separados.
--
-- Parte do último fechamento (o que ele mandou adiante) e soma dia a dia o que veio
-- depois. Um dia negativo engorda o débito, um positivo engorda as extras; nunca se
-- cancelam antes do fechamento.
create or replace function public.hour_bank_state(p_employee_id uuid, p_as_of date default current_date)
returns table (debit_minutes int, overtime_minutes int)
language sql
stable
as $$
  with closing as (
    select c.carry_debit_minutes, c.carry_credit_minutes, c.to_day
    from public.month_closings c
    where c.employee_id = p_employee_id
      and c.month <= date_trunc('month', p_as_of)::date
    order by c.month desc
    limit 1
  ),
  since as (
    -- Sem fechamento nenhum, considera tudo desde sempre.
    select coalesce((select to_day + 1 from closing), date '1900-01-01') as from_day
  ),
  dias as (
    select
      coalesce(sum(case when d.balance_minutes < 0 then -d.balance_minutes else 0 end), 0)::int as deb,
      coalesce(sum(case when d.balance_minutes > 0 then d.balance_minutes else 0 end), 0)::int as ext
    from public.daily_summary d, since s
    where d.employee_id = p_employee_id and d.day >= s.from_day and d.day <= p_as_of
  ),
  ajustes as (
    -- Lançamento manual do admin entra junto com as extras (ou com o débito, se negativo)
    -- e só encontra o outro lado no fechamento.
    select
      coalesce(sum(case when a.minutes < 0 then -a.minutes else 0 end), 0)::int as deb,
      coalesce(sum(case when a.minutes > 0 then a.minutes else 0 end), 0)::int as ext
    from public.balance_adjustments a, since s
    where a.employee_id = p_employee_id and a.day >= s.from_day and a.day <= p_as_of
  )
  select
    (coalesce((select carry_debit_minutes from closing), 0) + dias.deb + ajustes.deb)::int,
    (coalesce((select carry_credit_minutes from closing), 0) + dias.ext + ajustes.ext)::int
  from dias, ajustes;
$$;

comment on function public.hour_bank_state is
  'Débito e horas extras acumulados, separados, a partir do último fechamento.';

-- Continua existindo e continua sendo o líquido: as telas que mostram um número só
-- seguem funcionando, e sem fechamento algum o resultado é idêntico ao de antes.
create or replace function public.hour_bank_balance(p_employee_id uuid, p_as_of date default current_date)
returns int
language sql
stable
as $$
  select (s.overtime_minutes - s.debit_minutes)::int
  from public.hour_bank_state(p_employee_id, p_as_of) s;
$$;

comment on function public.hour_bank_balance is
  'Saldo líquido (minutos): horas extras menos débito, a partir do último fechamento.';

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

  v_from := coalesce(v_last + 1, date '1900-01-01');

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

create or replace function public.reopen_month(p_closing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee uuid;
  v_month date;
  v_latest date;
begin
  if not public.is_admin() then
    raise exception 'Apenas o administrador pode reabrir o mês.';
  end if;

  select employee_id, month into v_employee, v_month
  from public.month_closings where id = p_closing_id;

  if v_employee is null then
    raise exception 'Fechamento não encontrado.';
  end if;

  select max(month) into v_latest
  from public.month_closings where employee_id = v_employee;

  -- Reabrir um mês do meio deixaria os fechamentos seguintes apoiados num saldo que
  -- deixou de existir. Só se desfaz de trás para frente.
  if v_month <> v_latest then
    raise exception 'Só é possível reabrir o último mês fechado.';
  end if;

  delete from public.month_closings where id = p_closing_id;
end;
$$;

comment on function public.reopen_month is
  'Desfaz o último fechamento do funcionário, devolvendo o mês à apuração normal.';
