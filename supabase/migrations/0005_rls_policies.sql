-- Row Level Security para profiles, punches, corrections e company_settings.

-- security definer para evitar recursão de RLS ao checar o papel do usuário.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;

alter table public.profiles enable row level security;
alter table public.punches enable row level security;
alter table public.corrections enable row level security;
alter table public.company_settings enable row level security;

-- profiles: cada um vê o próprio perfil; admin vê todos.
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- Somente admin pode alterar profiles de terceiros (inclui role/active).
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- punches: cada um vê as próprias marcações; admin vê todas.
create policy "punches_select_own_or_admin" on public.punches
  for select using (employee_id = auth.uid() or public.is_admin());

-- Cada funcionário só insere marcações em seu próprio nome (via app, não via correção).
create policy "punches_insert_own" on public.punches
  for insert with check (employee_id = auth.uid());

-- Nenhuma policy de update: marcações são imutáveis pelo cliente. Toda mutação passa
-- pela função approve_correction() abaixo, que roda como security definer.

-- corrections: cada um vê as próprias propostas; admin vê todas.
create policy "corrections_select_own_or_admin" on public.corrections
  for select using (employee_id = auth.uid() or public.is_admin());

-- Funcionário propõe para si mesmo; admin pode propor em nome de qualquer um.
create policy "corrections_insert_own_or_admin" on public.corrections
  for insert with check (
    requested_by = auth.uid()
    and (employee_id = auth.uid() or public.is_admin())
  );

-- Só admin pode alterar o status (aprovação/rejeição) diretamente na tabela.
create policy "corrections_update_admin" on public.corrections
  for update using (public.is_admin()) with check (public.is_admin());

-- company_settings: leitura para qualquer autenticado; escrita só admin.
create policy "company_settings_select_authenticated" on public.company_settings
  for select using (auth.role() = 'authenticated');

create policy "company_settings_update_admin" on public.company_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- Aprova (ou rejeita) uma correção. Em uma única transação: cria a nova marcação
-- resultante, marca a original como corrigida e atualiza o status da proposta.
create or replace function public.approve_correction(p_correction_id uuid, p_approve boolean)
returns public.corrections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correction public.corrections;
  v_new_punch_id uuid;
begin
  if not public.is_admin() then
    raise exception 'apenas administradores podem aprovar correções';
  end if;

  select * into v_correction from public.corrections where id = p_correction_id for update;

  if v_correction is null then
    raise exception 'correção não encontrada';
  end if;

  if v_correction.status <> 'pending' then
    raise exception 'correção já foi revisada';
  end if;

  if p_approve then
    insert into public.punches (employee_id, type, occurred_at, source)
    values (v_correction.employee_id, v_correction.proposed_type, v_correction.proposed_occurred_at, 'correction')
    returning id into v_new_punch_id;

    if v_correction.original_punch_id is not null then
      update public.punches
      set is_corrected = true, superseded_by = v_new_punch_id
      where id = v_correction.original_punch_id;
    end if;

    update public.corrections
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), resulting_punch_id = v_new_punch_id
    where id = p_correction_id
    returning * into v_correction;
  else
    update public.corrections
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_correction_id
    returning * into v_correction;
  end if;

  return v_correction;
end;
$$;
