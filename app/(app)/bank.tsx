import { StyleSheet, Text, View } from "react-native";

import { Card } from "../../components/ui/Card";
import { useHourBank } from "../../features/hours/useHourBank";
import { useSession } from "../../features/auth/useSession";
import { formatMinutes } from "../../types/domain";

export default function BankScreen() {
  const { profile } = useSession();
  const { balanceMinutes, loading, error } = useHourBank(profile?.id);

  const color = (balanceMinutes ?? 0) >= 0 ? "#16a34a" : "#dc2626";

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.label}>Saldo do banco de horas</Text>
        {loading ? (
          <Text style={styles.value}>Carregando…</Text>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <Text style={[styles.value, { color }]}>{formatMinutes(balanceMinutes ?? 0)}</Text>
        )}
        <Text style={styles.hint}>
          Saldo acumulado entre horas trabalhadas e a jornada padrão da empresa, desde o início dos registros.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16, justifyContent: "center" },
  card: { gap: 8, alignItems: "center" },
  label: { fontSize: 14, color: "#6b7280" },
  value: { fontSize: 36, fontWeight: "700" },
  hint: { fontSize: 12, color: "#9ca3af", textAlign: "center" },
  error: { color: "#dc2626" },
});
