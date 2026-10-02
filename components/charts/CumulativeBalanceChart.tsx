import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import { colors } from "../../lib/theme";
import { formatMinutes } from "../../types/domain";

export interface CumulativePoint {
  label: string;
  value: number;
}

const STEP = 34;
const PADDING_X = 16;
const PADDING_Y = 16;

/**
 * Trajetória do saldo ao longo do mês.
 *
 * O gráfico de barras diário responde "como foi cada dia"; este responde "para onde o
 * mês está indo", que é a pergunta de quem precisa decidir se cobra reposição antes do
 * fechamento. A linha do zero é desenhada sempre, mesmo quando todos os pontos estão de
 * um lado só — sem ela não dá para ver de que lado a curva está.
 */
export function CumulativeBalanceChart({
  points,
  height = 170,
}: {
  points: CumulativePoint[];
  height?: number;
}) {
  if (points.length === 0) {
    return <Text style={styles.empty}>Nenhum dia apurado ainda neste mês.</Text>;
  }

  const values = points.map((p) => p.value);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;

  const width = Math.max(points.length * STEP + PADDING_X * 2, 240);
  const usableHeight = height - PADDING_Y * 2;
  const yFor = (value: number) => PADDING_Y + ((max - value) / range) * usableHeight;
  const xFor = (index: number) => PADDING_X + index * STEP;

  const zeroY = yFor(0);
  const last = points[points.length - 1];

  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <Svg width={width} height={height}>
            <Line
              x1={0}
              y1={zeroY}
              x2={width}
              y2={zeroY}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <Polyline
              points={points.map((p, i) => `${xFor(i)},${yFor(p.value)}`).join(" ")}
              fill="none"
              stroke={last.value >= 0 ? colors.success : colors.danger}
              strokeWidth={2.5}
            />
            {points.map((p, i) => (
              <Circle
                key={p.label}
                cx={xFor(i)}
                cy={yFor(p.value)}
                r={3.5}
                fill={p.value >= 0 ? colors.success : colors.danger}
              />
            ))}
          </Svg>

          <View style={[styles.labelRow, { width }]}>
            {points.map((p, i) => (
              <Text key={p.label} style={[styles.labelText, { left: xFor(i) - STEP / 2, width: STEP }]}>
                {p.label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

      <Text style={styles.legend}>
        Saldo acumulado até agora:{" "}
        <Text style={{ color: last.value >= 0 ? colors.success : colors.danger, fontWeight: "700" }}>
          {formatMinutes(last.value)}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  labelRow: { height: 18 },
  labelText: {
    position: "absolute",
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  legend: { fontSize: 14, color: colors.textFaint },
  empty: { fontSize: 14, color: colors.textFaint },
});
