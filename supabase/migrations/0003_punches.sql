-- Ledger imutável e append-only de marcações de ponto.
-- Correções nunca editam uma linha existente: uma marcação corrigida é sinalizada via
-- is_corrected/superseded_by, apontando para a nova linha criada pelo fluxo de aprovação.

create table public.punches (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id),
  type text not null check (type in ('clock_in', 'break_start', 'break_end', 'clock_out')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  location_accuracy_m double precision,
  photo_path text,
  source text not null default 'mobile' check (source in ('mobile', 'web', 'correction')),
  is_corrected boolean not null default false,
  superseded_by uuid references public.punches (id)
);

comment on table public.punches is 'Eventos imutáveis de marcação de ponto (entrada/saída/intervalo).';
comment on column public.punches.superseded_by is 'Aponta para a marcação que substituiu esta, quando corrigida.';

create index punches_employee_occurred_idx on public.punches (employee_id, occurred_at);

-- View com apenas as marcações "vigentes" (não substituídas por uma correção aprovada).
-- security_invoker garante que a RLS de punches seja aplicada com base em quem consulta
-- a view, e não no dono da view (evita vazar dados de outros funcionários).
create view public.effective_punches
  with (security_invoker = true) as
  select * from public.punches where superseded_by is null;
