-- Fluxo de correção/aprovação: funcionário ou admin propõe, admin aprova/rejeita.
-- A aprovação roda pela função approve_correction() (ver 0005_rls_policies.sql), que cria
-- a nova marcação e vincula à original, preservando o histórico para auditoria.

create table public.corrections (
  id uuid primary key default gen_random_uuid(),
  original_punch_id uuid references public.punches (id),
  employee_id uuid not null references public.profiles (id),
  proposed_type text not null check (proposed_type in ('clock_in', 'break_start', 'break_end', 'clock_out')),
  proposed_occurred_at timestamptz not null,
  reason text not null,
  requested_by uuid not null references public.profiles (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  resulting_punch_id uuid references public.punches (id),
  created_at timestamptz not null default now()
);

comment on table public.corrections is 'Propostas de correção de marcações, com fluxo de aprovação por um admin.';

create index corrections_pending_idx on public.corrections (status) where status = 'pending';
