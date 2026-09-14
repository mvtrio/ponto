-- O funcionário só marca ponto em dia de semana.
--
-- A tela já bloqueia, mas tela não é garantia: uma falha de carregamento, um cliente
-- desatualizado ou uma chamada direta à API passariam por cima dela. Este projeto já
-- viu isso acontecer com o par entrada/saída, que só ficou seguro quando virou índice.

create or replace function public.enforce_working_day_punch()
returns trigger
language plpgsql
as $$
declare
  v_week_days int[];
  v_day date;
begin
  -- Correções são lançadas pelo admin, que pode registrar um dia excepcional (plantão,
  -- mutirão de sábado). O bloqueio vale para a marcação feita pelo funcionário.
  if new.source = 'correction' then
    return new;
  end if;

  select work_week_days into v_week_days from public.company_settings where id = 1;
  v_day := (new.occurred_at at time zone 'America/Sao_Paulo')::date;

  if not (v_week_days @> array[extract(dow from v_day)::int]) then
    raise exception 'Não há expediente neste dia: a marcação de ponto vale de segunda a sexta.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.enforce_working_day_punch is
  'Recusa marcação do funcionário em dia fora de company_settings.work_week_days.';

drop trigger if exists punches_working_day_only on public.punches;

create trigger punches_working_day_only
  before insert on public.punches
  for each row
  execute function public.enforce_working_day_punch();
