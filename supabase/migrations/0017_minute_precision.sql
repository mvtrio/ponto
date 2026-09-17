-- O cálculo passa a usar o minuto, como a tela.
--
-- As marcações guardam o instante com segundos, e o saldo era calculado sobre ele. Uma
-- entrada às 08:00:58 com saída às 18:00:16 dá 9h59m18s: a tela mostrava "08:00 → 18:00"
-- (10h) e o saldo saía 1h59 em vez de 2h00. A diferença não era erro de arredondamento
-- escondido — era a exibição e o cálculo usando precisões diferentes.
--
-- Truncar (e não arredondar) é o que faz os dois concordarem: a tela também trunca ao
-- formatar HH:MM, então 08:00:58 aparece e passa a contar como 08:00.

create or replace view public.daily_punch_pairs
  with (security_invoker = true) as
select
  employee_id,
  (occurred_at at time zone 'America/Sao_Paulo')::date as day,
  date_trunc('minute', min(occurred_at) filter (where type = 'clock_in')) as clock_in_at,
  date_trunc('minute', max(occurred_at) filter (where type = 'clock_out')) as clock_out_at
from public.effective_punches
where type in ('clock_in', 'clock_out')
group by 1, 2;

comment on view public.daily_punch_pairs is
  'Par entrada/saída vigente por funcionário e dia, truncado ao minuto — mesma precisão da tela.';
