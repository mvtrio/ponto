import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import { colors } from "../../lib/theme";

export interface ChartPoint {
  label: string;
  value: number;
}

interface MiniLineChartProps {
  points: ChartPoint[];
  color?: string;
  height?: number;
}

const WIDTH = 280;
const PADDING_X = 8;
const PADDING_Y = 12;

export function MiniLineChart({ points, color = colors.accent, height = 120 }: MiniLineChartProps) {
  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Sem dados no período</Text>
      </View>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;

  const usableWidth = WIDTH - PADDING_X * 2;
  const usableHeight = height - PADDING_Y * 2;

  const step = points.length > 1 ? usableWidth / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = PADDING_X + i * step;
    const y = PADDING_Y + usableHeight - ((p.value - min) / range) * usableHeight;
    return { x, y };
  });

  const zeroY = PADDING_Y + usableHeight - ((0 - min) / range) * usableHeight;
  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const last = coords[coords.length - 1];

  const showEvery = Math.ceil(points.length / 5) || 1;

  return (
    <View>
      <Svg width={WIDTH} height={height}>
        <Line x1={PADDING_X} y1={zeroY} x2={WIDTH - PADDING_X} y2={zeroY} stroke={colors.border} strokeWidth={1} />
        <Polyline points={polylinePoints} fill="none" stroke={color} strokeWidth={2} />
        <Circle cx={last.x} cy={last.y} r={3} fill={color} />
      </Svg>
      <View style={styles.labelsRow}>
        {points.map((p, i) =>
          i % showEvery === 0 || i === points.length - 1 ? (
            <Text key={i} style={[styles.labelText, { position: "absolute", left: coords[i].x - 12 }]}>
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
