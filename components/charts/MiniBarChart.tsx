import { StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { colors } from "../../lib/theme";
import type { ChartPoint } from "./MiniLineChart";

interface MiniBarChartProps {
  points: ChartPoint[];
  color?: string;
  height?: number;
}

const WIDTH = 280;
const PADDING_X = 8;
const PADDING_Y = 4;
const BAR_GAP = 4;

export function MiniBarChart({ points, color = colors.success, height = 120 }: MiniBarChartProps) {
  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Sem dados no período</Text>
      </View>
    );
  }

  const max = Math.max(1, ...points.map((p) => p.value));
  const usableWidth = WIDTH - PADDING_X * 2;
  const usableHeight = height - PADDING_Y * 2;
  const barWidth = Math.max(2, usableWidth / points.length - BAR_GAP);

  const showEvery = Math.ceil(points.length / 5) || 1;

  return (
    <View>
      <Svg width={WIDTH} height={height}>
        {points.map((p, i) => {
          const barHeight = (p.value / max) * usableHeight;
          const x = PADDING_X + i * (barWidth + BAR_GAP);
          const y = PADDING_Y + usableHeight - barHeight;
          return <Rect key={i} x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} rx={2} fill={color} />;
        })}
      </Svg>
      <View style={styles.labelsRow}>
        {points.map((p, i) =>
          i % showEvery === 0 || i === points.length - 1 ? (
            <Text
              key={i}
              style={[
                styles.labelText,
                { position: "absolute", left: PADDING_X + i * (barWidth + BAR_GAP) - 8 },
              ]}
            >
              {p.label}
            </Text>
          ) : null
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textFaint, fontSize: 13 },
  labelsRow: { height: 14, marginTop: 4, width: WIDTH },
  labelText: { fontSize: 10, color: colors.textFaint },
});
