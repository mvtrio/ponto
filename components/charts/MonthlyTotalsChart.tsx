import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../lib/theme";
import { formatMinutes } from "../../types/domain";

export interface MonthlyBar {
  /** Rótulo curto do mês, ex.: "set". */
  label: string;
  overtimeMinutes: number;
  /** Positivo. */
  deficitMinutes: number;
}

/**
 * Extras e débito lado a lado, mês a mês.
 *
 * Barras em View e não em SVG: são duas por mês, com largura proporcional, e o layout
 * do próprio React Native resolve isso sem precisar calcular coordenadas.
 */
export function MonthlyTotalsChart({ months }: { months: MonthlyBar[] }) {
  if (months.length === 0) {
    return <Text style={styles.empty}>Sem histórico suficiente para comparar meses.</Text>;
  }

  // Escala comum aos dois lados: extras e débito precisam ser comparáveis entre si, não
  // cada um esticado até o próprio máximo.
  const max = Math.max(1, ...months.flatMap((m) => [m.overtimeMinutes, m.deficitMinutes]));

  return (
    <View style={styles.wrapper}>
      {months.map((month) => (
        <View key={month.label} style={styles.monthRow}>
          <Text style={styles.monthLabel}>{month.label}</Text>

          <View style={styles.bars}>
            {[
              { minutes: month.overtimeMinutes, color: colors.success },
              { minutes: month.deficitMinutes, color: colors.danger },
            ].map(({ minutes, color }) => (
              <View key={color} style={styles.barLine}>
                {/* Trilho de largura fixa e valor em coluna própria: com a barra medindo
                    em % dentro da mesma linha do texto, o mês de maior valor empurrava o
                    próprio número para fora da tela. */}
                <View style={styles.track}>
                  <View style={[styles.bar, { backgroundColor: color, width: `${(minutes / max) * 100}%` }]} />
                </View>
                <Text style={[styles.barValue, { color }]}>{formatMinutes(minutes)}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>Horas extras</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.danger }]} />
          <Text style={styles.legendText}>Débito</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 14 },
  monthRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  monthLabel: { width: 36, fontSize: 15, fontWeight: "600", color: colors.textMuted },
  bars: { flex: 1, gap: 5 },
  barLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: { flex: 1 },
  // minWidth 2: um mês sem extras praticamente some, que é a informação correta — mas
  // sobra um traço indicando que a linha existe, e o valor ao lado confirma 0h00.
  bar: { height: 14, borderRadius: 4, minWidth: 2 },
  barValue: { width: 58, fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"], textAlign: "right" },
  legend: { flexDirection: "row", gap: 16, marginTop: 2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, color: colors.textFaint },
  empty: { fontSize: 14, color: colors.textFaint },
});
