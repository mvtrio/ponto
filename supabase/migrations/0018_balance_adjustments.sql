-- Lançamento manual de horas a compensar.
--
-- São horas anotadas no papel e repassadas ao sistema pelo administrador. Não são
-- marcações de ponto: não têm entrada e saída, não pertencem a uma jornada e não podem
-- passar pelo fluxo de aprovação — quem lança já é a autoridade que aprovaria. Por isso
-- tabela própria, e não uma linha em `punches`.

create table if not exists public.balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id),
  day date not null,
  -- Positivo credita (horas a compensar a favor), negativo debita. Zero não é lançamento.
  minutes int not null check (minutes <> 0),
  reason text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.balance_adjustments is
  'Ajustes manuais de banco de horas lançados pelo admin (horas anotadas fora do sistema).';
comment on column public.balance_adjustments.minutes is
  'Minutos somados ao saldo: positivo credita, negativo debita.';

create index if not exists balance_adjustments_employee_day_idx
  on public.balance_adjustments (employee_id, day);

alter table public.balance_adjustments enable row level security;

-- O funcionário vê os próprios lançamentos: eles mexem no saldo dele, então esconder
-- seria transformar o banco de horas em número sem explicação.
create policy "adjustments_select_own_or_admin" on public.balance_adjustments
  for select using (employee_id = auth.uid() or public.is_admin());

create policy "adjustments_insert_admin" on public.balance_adjustments
  for insert with check (public.is_admin() and created_by = auth.uid());

-- Correção de lançamento errado é apagar e refazer; só admin.
create policy "adjustments_delete_admin" on public.balance_adjustments
  for delete using (public.is_admin());

-- O saldo acumulado passa a somar os ajustes. Sem isto o lançamento existiria na tela
-- do admin e não apareceria no banco de horas, que é o ponto de fazê-lo.
create or replace function public.hour_bank_balance(p_employee_id uuid, p_as_of date default current_date)
returns int
language sql
stable
as $$
  select coalesce((
           select sum(balance_minutes)
           from public.daily_summary
           where employee_id = p_employee_id and day <= p_as_of
         ), 0)::int
       + coalesce((
           select sum(minutes)
           from public.balance_adjustments
           where employee_id = p_employee_id and day <= p_as_of
         ), 0)::int;
$$;

comment on function public.hour_bank_balance is
  'Saldo acumulado (minutos) até a data: dias apurados mais os ajustes manuais.';
