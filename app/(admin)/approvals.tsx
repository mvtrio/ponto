import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { fetchEmployees } from "../../features/admin/adminService";
import { formatDateTime } from "../../features/corrections/datetime";
import { fetchPendingPunches, reviewPunch } from "../../features/punches/punchService";
import { colors } from "../../lib/theme";
import { PUNCH_TYPE_LABELS, type Punch } from "../../types/domain";

export default function ApprovalsScreen() {
  const [punches, setPunches] = useState<Punch[]>([]);
  const [nameById, setNameById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pending, employees] = await Promise.all([fetchPendingPunches(), fetchEmployees()]);
      setPunches(pending);
      setNameById(new Map(employees.map((e) => [e.id, e.full_name])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar marcações pendentes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReview(id: string, approve: boolean) {
    setProcessingId(id);
    setError(null);
    try {
      await reviewPunch(id, approve);
      // Remove da fila localmente para a lista não "piscar" a cada aprovação.
      setPunches((current) => current.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao revisar a marcação");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.title}>Marcações aguardando aprovação</Text>
        <Text style={styles.hint}>
          Toda marcação batida pelo funcionário fica pendente e só entra no banco de horas depois de aprovada
          aqui. Rejeitar descarta a marcação e libera o funcionário para bater de novo.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {punches.map((punch) => (
          <View key={punch.id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.employee}>{nameById.get(punch.employee_id) ?? "Funcionário"}</Text>
              <Text style={styles.detail}>
                {PUNCH_TYPE_LABELS[punch.type]} — {formatDateTime(punch.occurred_at)}
              </Text>
              {punch.latitude !== null && punch.longitude !== null ? (
                <Text style={styles.meta}>
                  Local: {punch.latitude.toFixed(5)}, {punch.longitude.toFixed(5)}
                </Text>
              ) : (
                <Text style={styles.meta}>Sem localização registrada</Text>
              )}
            </View>
            <View style={styles.actions}>
              <View style={styles.action}>
                <Button
                  label="Rejeitar"
                  variant="secondary"
                  onPress={() => handleReview(punch.id, false)}
                  loading={processingId === punch.id}
                />
              </View>
              <View style={styles.action}>
                <Button
                  label="Aprovar"
                  onPress={() => handleReview(punch.id, true)}
                  loading={processingId === punch.id}
                />
              </View>
            </View>
          </View>
        ))}

        {!loading && punches.length === 0 ? (
          <Text style={styles.empty}>Nenhuma marcação aguardando aprovação</Text>
        ) : null}

        <Button label="Atualizar lista" variant="secondary" onPress={load} loading={loading} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  card: { gap: 12 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  hint: { fontSize: 13, color: colors.textFaint },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  info: { flex: 1, minWidth: 220, gap: 2 },
  employee: { fontSize: 17, fontWeight: "700", color: colors.text },
  detail: { fontSize: 16, color: colors.text },
  meta: { fontSize: 13, color: colors.textFaint },
  actions: { flexDirection: "row", gap: 8, minWidth: 260 },
  action: { flex: 1 },
  error: { color: colors.danger },
  empty: { textAlign: "center", color: colors.textMuted, marginVertical: 12 },
});
