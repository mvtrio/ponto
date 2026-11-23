-- O sistema passa a conhecer todos os feriados nacionais.
--
-- Faltavam dois, e os dois viravam falta com a jornada inteira em débito:
--   * 20 de novembro (Consciência Negra), nacional desde a Lei 14.759/2023;
--   * Sexta-feira Santa, o único feriado nacional móvel.
-- Carnaval e Corpus Christi continuam fora: são ponto facultativo, não feriado, então
-- quem decide é o admin na tabela `holidays`.
--
-- daily_summary é view, não tabela: corrigir is_holiday já apaga as faltas indevidas do
-- passado: não há linha a atualizar.

-- Domingo de Páscoa pelo algoritmo gregoriano anônimo (Meeus/Jones/Butcher). Mesma conta
-- de features/company/nationalHolidays.ts — as duas implementações têm que concordar.
create or replace function public.easter_sunday(p_year int)
returns date
language plpgsql
immutable
as $$
declare
  a int := p_year % 19;
  b int := p_year / 100;
  c int := p_year % 100;
  d int := (p_year / 100) / 4;
  e int := (p_year / 100) % 4;
  f int;
  g int;
  h int;
  i int;
  k int;
  l int;
  m int;
begin
  f := (b + 8) / 25;
  g := (b - f + 1) / 3;
  h := (19 * a + b - d - g + 15) % 30;
  i := c / 4;
  k := c % 4;
  l := (32 + 2 * e + 2 * i - h - k) % 7;
  m := (a + 11 * h + 22 * l) / 451;
  return make_date(p_year, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);
end;
$$;

comment on function public.easter_sunday is
  'Domingo de Páscoa do ano. Base da Sexta-feira Santa, único feriado nacional móvel.';

-- A lista de datas fixas é a mesma do cliente (features/company/nationalHolidays.ts).
-- Sem repeti-la aqui, 7 de setembro viraria falta. Móveis de empresa e regionais
-- continuam vindo da tabela `holidays`, cadastrados pelo admin.
create or replace function public.is_holiday(p_day date)
returns boolean
language sql
stable
as $$
  select exists (select 1 from public.holidays h where h.day = p_day)
      or (extract(month from p_day)::int, extract(day from p_day)::int) in
         ((1, 1), (4, 21), (5, 1), (9, 7), (10, 12), (11, 2), (11, 15), (11, 20), (12, 25))
      or p_day = public.easter_sunday(extract(year from p_day)::int) - 2;
$$;

comment on function public.is_holiday is
  'Feriado: cadastrado em holidays ou nacional, fixo ou Sexta-feira Santa (mesma lista do cliente).';
