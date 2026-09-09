import { FlatList, StyleSheet, Text, View } from "react-native";

import { DaySummaryCard } from "../../components/history/DaySummaryCard";
import { useDailySummaries } from "../../features/hours/useDailySummary";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";
import { appDaysAgo } from "../../lib/appDate";

export default function HistoryScreen() {
  const { profile } = useSession();
  const fromDate = appDaysAgo(30);
  const toDate = appDaysAgo(0);
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
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  error: { color: colors.danger, padding: 16 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
});
