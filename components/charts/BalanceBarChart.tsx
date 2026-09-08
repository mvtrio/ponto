import { StyleSheet, Text, View } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";

import { colors } from "../../lib/theme";

export interface BalancePoint {
  label: string;
  value: number;
}

interface BalanceBarChartProps {
  points: BalancePoint[];
  height?: number;
}

const WIDTH = 280;
const PADDING_X = 8;
const PADDING_Y = 6;
const BAR_GAP = 6;

export function BalanceBarChart({ points, height = 140 }: BalanceBarChartProps) {
  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Sem funcionários para exibir</Text>
      </View>
    );
  }

  const max = Math.max(1, ...points.map((p) => Math.abs(p.value)));
  const usableWidth = WIDTH - PADDING_X * 2;
  const centerY = height / 2;
  const halfHeight = centerY - PADDING_Y;
  const barWidth = Math.max(3, usableWidth / points.length - BAR_GAP);

  return (
    <Svg width={WIDTH} height={height}>
      <Line x1={PADDING_X} y1={centerY} x2={WIDTH - PADDING_X} y2={centerY} stroke={colors.border} strokeWidth={1} />
      {points.map((p, i) => {
        const barHeight = Math.max((Math.abs(p.value) / max) * halfHeight, 1);
        const x = PADDING_X + i * (barWidth + BAR_GAP);
        const y = p.value >= 0 ? centerY - barHeight : centerY;
        return (
          <Rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={2}
            fill={p.value >= 0 ? colors.success : colors.danger}
          />
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textFaint, fontSize: 13 },
});
