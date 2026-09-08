-- Uma entrada e uma saída por dia, garantido no banco.
--
-- Até aqui a regra só existia na tela (o botão desabilita quando o dia fecha). Isso não
-- é garantia: qualquer falha de carregamento faz a tela achar que o dia está vazio e
-- liberar uma nova marcação — foi assim que um mesmo dia acumulou seis entradas.
--
-- A data é calculada no fuso de Brasília, e não com `occurred_at::date`, porque esse cast
-- depende do TimeZone da sessão (é STABLE) e o Postgres não aceita expressão instável em
-- índice. `occurred_at at time zone '<zona literal>'` é imutável e pode ser indexado.
--
-- Marcações substituídas por correção (superseded_by) e rejeitadas ficam fora do índice:
-- elas não valem mais, então não devem bloquear uma marcação nova no lugar delas.
create unique index if not exists punches_one_per_type_per_day
  on public.punches (
    employee_id,
    ((occurred_at at time zone 'America/Sao_Paulo')::date),
    type
  )
  where superseded_by is null
    and approval_status <> 'rejected'
    and type in ('clock_in', 'clock_out');

comment on index public.punches_one_per_type_per_day is
  'Impede mais de uma entrada e mais de uma saída vigentes por funcionário por dia.';
