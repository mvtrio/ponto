import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";

import { colors } from "../../lib/theme";
import { formatMinutes } from "../../types/domain";

export interface DailyBalancePoint {
  /** Dia do mês, dois dígitos. */
  label: string;
  /** Saldo do dia em minutos. */
  value: number;
}

const BAR_WIDTH = 22;
const BAR_GAP = 10;
const PADDING_Y = 10;

/**
 * Saldo de cada dia do mês: barra para cima quando sobrou hora, para baixo quando faltou.
 *
 * Com rótulo por dia, diferente do gráfico por funcionário que havia antes — sem saber a
 * que dia a barra se refere, o desenho não responde a nenhuma pergunta. Rola na
 * horizontal porque um mês inteiro não cabe em tela estreita, e espremer as barras até
 * caberem deixaria todas iguais.
 */
export function DailyBalanceChart({
  points,
  height = 160,
}: {
  points: DailyBalancePoint[];
  height?: number;
}) {
  if (points.length === 0) {
    return <Text style={styles.empty}>Nenhum dia apurado ainda neste mês.</Text>;
  }

  const max = Math.max(1, ...points.map((p) => Math.abs(p.value)));
  const width = points.length * (BAR_WIDTH + BAR_GAP) + BAR_GAP;
  const centerY = height / 2;
  const halfHeight = centerY - PADDING_Y;

  const totalMinutes = points.reduce((sum, p) => sum + p.value, 0);

  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <Svg width={width} height={height}>
            <Line
              x1={0}
              y1={centerY}
              x2={width}
              y2={centerY}
              stroke={colors.border}
              strokeWidth={1}
            />
            {points.map((p, i) => {
              // Altura mínima de 2px: um dia exatamente no horário tem saldo zero e
              // ficaria invisível, parecendo dia sem registro.
              const barHeight = Math.max((Math.abs(p.value) / max) * halfHeight, 2);
              const x = BAR_GAP + i * (BAR_WIDTH + BAR_GAP);
              return (
                <Rect
                  key={p.label}
                  x={x}
                  y={p.value >= 0 ? centerY - barHeight : centerY}
                  width={BAR_WIDTH}
                  height={barHeight}
                  rx={3}
                  fill={p.value > 0 ? colors.success : p.value < 0 ? colors.danger : colors.textFaint}
                />
              );
            })}
          </Svg>

          <View style={[styles.labelRow, { width }]}>
            {points.map((p) => (
              <View key={p.label} style={styles.labelCell}>
                <Text style={styles.labelText}>{p.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Text style={styles.legend}>
        Soma do mês:{" "}
        <Text style={{ color: totalMinutes >= 0 ? colors.success : colors.danger, fontWeight: "700" }}>
          {formatMinutes(totalMinutes)}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  labelRow: { flexDirection: "row", paddingLeft: BAR_GAP },
  labelCell: { width: BAR_WIDTH, marginRight: BAR_GAP, alignItems: "center" },
  labelText: { fontSize: 12, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  legend: { fontSize: 14, color: colors.textFaint },
  empty: { fontSize: 14, color: colors.textFaint },
});
