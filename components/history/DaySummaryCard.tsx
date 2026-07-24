import { StyleSheet, Text, View } from "react-native";

import { Card } from "../ui/Card";
import { colors } from "../../lib/theme";
import { formatMinutes, type DailySummary } from "../../types/domain";

export function DaySummaryCard({ summary }: { summary: DailySummary }) {
  const balanceColor = summary.balance_minutes >= 0 ? colors.success : colors.danger;
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.day}>{summary.day}</Text>
        {summary.is_incomplete ? <Text style={styles.incomplete}>incompleto</Text> : null}
      </View>
      <Text style={styles.worked}>Trabalhado: {formatMinutes(summary.worked_minutes)}</Text>
      <Text style={[styles.balance, { color: balanceColor }]}>
        Saldo do dia: {formatMinutes(summary.balance_minutes)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  day: { fontSize: 15, fontWeight: "600", color: colors.text },
  incomplete: { fontSize: 12, color: colors.warning },
  worked: { fontSize: 14, color: colors.textMuted },
  balance: { fontSize: 14, fontWeight: "600" },
});
