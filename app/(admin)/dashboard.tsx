import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { BalanceBarChart } from "../../components/charts/BalanceBarChart";
import { Card } from "../../components/ui/Card";
import { fetchEmployees } from "../../features/admin/adminService";
import { fetchHourBankBalance } from "../../features/hours/hoursService";
import { colors } from "../../lib/theme";
import { formatMinutes } from "../../types/domain";

interface BalanceRow {
  id: string;
  fullName: string;
  balanceMinutes: number;
}

export default function DashboardScreen() {
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        setLoading(true);
        try {
          const employees = await fetchEmployees();
          const active = employees.filter((e) => e.active && e.role !== "admin");
          const withBalances = await Promise.all(
            active.map(async (e) => ({
              id: e.id,
              fullName: e.full_name,
              balanceMinutes: await fetchHourBankBalance(e.id).catch(() => 0),
            }))
          );
          withBalances.sort((a, b) => a.balanceMinutes - b.balanceMinutes);
          if (!cancelled) setRows(withBalances);
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar o dashboard");
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      load();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const totalMinutes = rows.reduce((sum, r) => sum + r.balanceMinutes, 0);
  const positiveCount = rows.filter((r) => r.balanceMinutes >= 0).length;
  const negativeCount = rows.length - positiveCount;

  return (
    <FlatList
      style={styles.container}
      data={rows}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>Total no banco</Text>
              <Text style={[styles.statValue, { color: totalMinutes >= 0 ? colors.success : colors.danger }]}>
                {formatMinutes(totalMinutes)}
              </Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>Em dia</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>{positiveCount}</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>Devendo horas</Text>
              <Text style={[styles.statValue, { color: colors.danger }]}>{negativeCount}</Text>
            </Card>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Saldo por funcionário</Text>
            <BalanceBarChart points={rows.map((r) => ({ label: r.fullName, value: r.balanceMinutes }))} />
          </Card>

          <Text style={styles.sectionTitle}>Funcionários</Text>
        </>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => router.push(`/(admin)/employees/${item.id}`)}>
          <Text style={styles.rowName}>{item.fullName}</Text>
          <Text style={[styles.rowBalance, { color: item.balanceMinutes >= 0 ? colors.success : colors.danger }]}>
            {formatMinutes(item.balanceMinutes)}
          </Text>
        </Pressable>
      )}
      ListEmptyComponent={!loading ? <Text style={styles.empty}>Nenhum funcionário ativo</Text> : null}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: { flex: 1, gap: 4, alignItems: "center" },
  statLabel: { fontSize: 11, color: colors.textMuted, textAlign: "center" },
  statValue: { fontSize: 20, fontWeight: "700" },
  chartCard: { gap: 12, marginBottom: 16, alignItems: "center" },
  chartTitle: { fontSize: 15, fontWeight: "700", color: colors.text, alignSelf: "flex-start" },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: colors.textMuted, marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  rowName: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowBalance: { fontSize: 15, fontWeight: "700" },
  error: { color: colors.danger, marginBottom: 16 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
});
