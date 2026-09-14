import { appWeekday } from "../../lib/appDate.ts";
import { isValidDate } from "../../features/corrections/datetime.ts";

const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/**
 * Nome do dia da semana de uma data AAAA-MM-DD.
 *
 * Fica num módulo sem JSX para poder ser testado pelo runner do Node, e para as telas
 * compartilharem uma única lista — havia duas, e duas listas divergem com o tempo.
 * Retorna null quando a data é inválida, em vez de apontar um dia que não existe.
 */
export function weekdayName(day: string): string | null {
  if (!isValidDate(day)) return null;
  return WEEKDAYS[appWeekday(day)];
}
