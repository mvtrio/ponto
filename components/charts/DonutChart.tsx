import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { colors } from "../../lib/theme";

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

const SIZE = 170;
const STROKE = 26;

/**
 * Composição em rosca, com o total no miolo e legenda ao lado.
 *
 * Desenhada com `strokeDasharray` sobre círculos em vez de arcos calculados à mão: menos
 * trigonometria para errar, e o resultado é o mesmo para fatias contíguas.
 */
export function DonutChart({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel: string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <Text style={styles.empty}>Nenhum dia apurado ainda neste mês.</Text>;
  }

  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  let consumed = 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.chartBox}>
        <Svg width={SIZE} height={SIZE}>
          {/*
            -90° para a primeira fatia começar no topo, e não às 3 horas.
            `transform` em string, e não as props rotation/origin: na web estas viram o
            atributo `transform-origin`, que o React DOM recusa e derruba um erro no
            console a cada render.
          */}
          <G transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={radius}
              stroke={colors.surfaceAlt}
              strokeWidth={STROKE}
              fill="none"
            />
            {slices.map((slice) => {
              const length = (slice.value / total) * circumference;
              const offset = -consumed;
              consumed += length;
              return (
                <Circle
                  key={slice.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={offset}
                />
              );
            })}
          </G>
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.centerValue}>{total}</Text>
          <Text style={styles.centerLabel}>{centerLabel}</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {slices.map((slice) => (
          <View key={slice.key} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: slice.color }]} />
            <Text style={styles.legendLabel}>{slice.label}</Text>
            <Text style={styles.legendValue}>{slice.value}</Text>
            <Text style={styles.legendPercent}>{Math.round((slice.value / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: "row", flexWrap: "wrap", gap: 20, alignItems: "center" },
  chartBox: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  center: { position: "absolute", alignItems: "center" },
  centerValue: { fontSize: 32, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  centerLabel: { fontSize: 13, color: colors.textMuted },
  legend: { flex: 1, minWidth: 220, gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { flex: 1, fontSize: 15, color: colors.textMuted },
  legendValue: { fontSize: 15, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  legendPercent: { fontSize: 14, color: colors.textFaint, width: 44, textAlign: "right" },
  empty: { fontSize: 14, color: colors.textFaint },
});
