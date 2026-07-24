import { FlatList, StyleSheet, Text, View } from "react-native";

import { DaySummaryCard } from "../../components/history/DaySummaryCard";
import { useDailySummaries } from "../../features/hours/useDailySummary";
import { useSession } from "../../features/auth/useSession";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function HistoryScreen() {
  const { profile } = useSession();
  const fromDate = isoDaysAgo(30);
  const toDate = isoDaysAgo(0);
  const { summaries, loading, error } = useDailySummaries(profile?.id, fromDate, toDate);

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={summaries}
        keyExtractor={(item) => item.day}
        renderItem={({ item }) => <DaySummaryCard summary={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>Nenhum registro nos últimos 30 dias</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  list: { padding: 16 },
  error: { color: "#dc2626", padding: 16 },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 32 },
});
