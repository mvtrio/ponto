import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { EmployeeTable, type EmployeeRow } from "../../../components/admin/EmployeeTable";
import { Button } from "../../../components/ui/Button";
import { fetchEmployees } from "../../../features/admin/adminService";
import { fetchHourBankBalance } from "../../../features/hours/hoursService";
import { colors } from "../../../lib/theme";

export default function EmployeesScreen() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        setLoading(true);
        try {
          const employees = await fetchEmployees();
          const staff = employees.filter((e) => e.role !== "admin");
          const withBalances = await Promise.all(
            staff.map(async (e) => ({
              id: e.id,
              fullName: e.full_name,
              employeeCode: e.employee_code,
              active: e.active,
              balanceMinutes: await fetchHourBankBalance(e.id).catch(() => null),
            }))
          );
          if (!cancelled) setRows(withBalances);
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar funcionários");
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button label="+ Novo funcionário" onPress={() => router.push("/(admin)/employees/new")} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <EmployeeTable rows={[item]} onPress={(id) => router.push(`/(admin)/employees/${id}`)} />
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Nenhum funcionário cadastrado</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 16, paddingBottom: 0 },
  list: { padding: 16 },
  error: { color: colors.danger, padding: 16 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
});
