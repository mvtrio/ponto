-- Torna o resumo diário uma agregação única em vez de N chamadas de função.
--
-- daily_summary chamava daily_worked_minutes (plpgsql) uma vez por dia de cada
-- funcionário, e cada chamada abria a própria consulta em effective_punches. Carregar a
-- tela inicial custava, portanto, uma consulta por dia de histórico. Como o índice
-- punches_one_per_type_per_day garante no máximo uma entrada e uma saída por dia, o par
-- do dia é simplesmente min(entrada)/max(saída) — dá para resolver tudo com um group by.
--
-- daily_worked_minutes continua existindo (mesma regra, para consultas pontuais e
-- compatibilidade), mas deixa de estar no caminho do resumo.

create or replace view public.daily_punch_pairs
  with (security_invoker = true) as
select
  employee_id,
  (occurred_at at time zone 'America/Sao_Paulo')::date as day,
  min(occurred_at) filter (where type = 'clock_in') as clock_in_at,
  max(occurred_at) filter (where type = 'clock_out') as clock_out_at
from public.effective_punches
where type in ('clock_in', 'clock_out')
group by 1, 2;

comment on view public.daily_punch_pairs is
  'Par entrada/saída vigente de cada funcionário por dia (fuso America/Sao_Paulo).';

create or replace view public.daily_summary
  with (security_invoker = true) as
select
  pairs.employee_id,
  pairs.day,
  case
    when pairs.clock_in_at is null or pairs.clock_out_at is null then 0
    else greatest(
      round(
        extract(epoch from (pairs.clock_out_at - pairs.clock_in_at)) / 60 - coalesce(cs.break_minutes, 0)
      ),
      0
    )::int
  end as worked_minutes,
  (pairs.clock_in_at is null or pairs.clock_out_at is null) as is_incomplete,
  cs.standard_daily_minutes,
  case
    when pairs.clock_in_at is null or pairs.clock_out_at is null then 0
    else greatest(
      round(
        extract(epoch from (pairs.clock_out_at - pairs.clock_in_at)) / 60 - coalesce(cs.break_minutes, 0)
      ),
      0
    )::int
  end - cs.standard_daily_minutes as balance_minutes
from public.daily_punch_pairs pairs
cross join public.company_settings cs;

comment on view public.daily_summary is
  'Um registro por funcionário/dia com minutos trabalhados e saldo, resolvido em uma única agregação.';

-- Suporta o filtro por funcionário + a ordenação por dia usada pelas telas.
create index if not exists punches_effective_lookup_idx
  on public.punches (employee_id, occurred_at)
  where superseded_by is null and approval_status = 'approved';
