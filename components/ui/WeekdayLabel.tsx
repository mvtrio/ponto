import { StyleSheet, Text } from "react-native";

import { colors } from "../../lib/theme";
import { weekdayName } from "./weekdayNames";

export { weekdayName };

/**
 * Dia da semana ao lado de um campo de data. Uma data crua como "2026-09-14" não diz
 * nada a quem precisa lembrar de que dia se trata — e é justamente o que se quer saber
 * ao corrigir um ponto esquecido.
 */
export function WeekdayLabel({ day, style }: { day: string; style?: object }) {
  const name = weekdayName(day);
  if (!name) return null;
  return <Text style={[styles.text, style]}>{name}</Text>;
}

const styles = StyleSheet.create({
  text: { fontSize: 20, color: colors.accent, fontWeight: "600", textTransform: "capitalize" },
});
