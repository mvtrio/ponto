-- Feriados personalizados (móveis/regionais/empresa). Feriados nacionais fixos (data
-- fixa todo ano, ex.: 7 de setembro) são reconhecidos automaticamente no cliente e não
-- precisam de linha aqui — esta tabela é só para os que variam ou são específicos.

create table public.holidays (
  day date primary key,
  name text not null,
  created_at timestamptz not null default now()
);

comment on table public.holidays is
  'Feriados adicionais (móveis/regionais) marcados como dia de folga no banco de horas.';

alter table public.holidays enable row level security;

create policy "holidays_select_authenticated" on public.holidays
  for select using (auth.role() = 'authenticated');

create policy "holidays_insert_admin" on public.holidays
  for insert with check (public.is_admin());

create policy "holidays_delete_admin" on public.holidays
  for delete using (public.is_admin());
