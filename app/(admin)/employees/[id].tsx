import { useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { DaySummaryCard } from "../../../components/history/DaySummaryCard";
import { useDailySummaries } from "../../../features/hours/useDailySummary";
import { useHourBank } from "../../../features/hours/useHourBank";
import { colors } from "../../../lib/theme";
import { formatMinutes } from "../../../types/domain";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fromDate = isoDaysAgo(30);
  const toDate = isoDaysAgo(0);
  const { summaries, loading, error } = useDailySummaries(id, fromDate, toDate);
  const { balanceMinutes } = useHourBank(id);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.balanceLabel}>Banco de horas</Text>
        <Text
          style={[styles.balanceValue, { color: (balanceMinutes ?? 0) >= 0 ? colors.success : colors.danger }]}
        >
          {balanceMinutes !== null ? formatMinutes(balanceMinutes) : "—"}
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={summaries}
        keyExtractor={(item) => item.day}
        renderItem={({ item }) => <DaySummaryCard summary={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Sem registros nos últimos 30 dias</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 16, backgroundColor: colors.surface, alignItems: "center", gap: 4 },
  balanceLabel: { fontSize: 12, color: colors.textMuted },
  balanceValue: { fontSize: 24, fontWeight: "700" },
  list: { padding: 16 },
  error: { color: colors.danger, padding: 16 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
});
