import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../lib/theme";
import { formatMinutes } from "../../types/domain";

/**
 * Quanto do previsto já foi cumprido.
 *
 * A barra satura visualmente em 100%, mas o percentual ao lado continua subindo: quem
 * trabalhou 120% do previsto precisa ver 120%, e uma barra estourando a caixa só
 * quebraria o layout.
 */
export function ProgressBar({
  workedMinutes,
  expectedMinutes,
}: {
  workedMinutes: number;
  expectedMinutes: number;
}) {
  const ratio = expectedMinutes > 0 ? workedMinutes / expectedMinutes : null;
  const filled = ratio === null ? 0 : Math.min(ratio, 1) * 100;
  const color = ratio !== null && ratio >= 1 ? colors.success : colors.warning;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.worked}>{formatMinutes(workedMinutes)}</Text>
        <Text style={styles.expected}>de {formatMinutes(expectedMinutes)} previstas</Text>
        <Text style={[styles.percent, { color }]}>
          {ratio === null ? "—" : `${Math.round(ratio * 100)}%`}
        </Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${filled}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  header: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  worked: { fontSize: 26, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  expected: { flex: 1, fontSize: 14, color: colors.textMuted },
  percent: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  track: { height: 14, borderRadius: 7, backgroundColor: colors.surfaceAlt, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 7 },
});
