import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { WeekdayLabel } from "../../components/ui/WeekdayLabel";
import { fetchEmployees } from "../../features/admin/adminService";
import { parseAdjustmentMinutes, type AdjustmentKind } from "../../features/admin/adjustmentMinutes";
import {
  createAdjustment,
  deleteAdjustment,
  fetchAdjustments,
  type AdjustmentWithName,
} from "../../features/admin/adjustmentsService";
import { isValidDate, todayIsoDate } from "../../features/corrections/datetime";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";
import { formatMinutes, type Profile } from "../../types/domain";

const KIND_OPTIONS: { label: string; value: AdjustmentKind }[] = [
  { label: "Creditar", value: "credit" },
  { label: "Debitar", value: "debit" },
];

function formatDay(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

export default function AdjustmentsScreen() {
  const { profile } = useSession();

  const [employees, setEmployees] = useState<Profile[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [day, setDay] = useState(todayIsoDate());
  const [kind, setKind] = useState<AdjustmentKind>("credit");
  const [horas, setHoras] = useState("");
  const [minutos, setMinutos] = useState("");
  const [reason, setReason] = useState("");

  const [list, setList] = useState<AdjustmentWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  // Confirmação na própria linha em vez de Alert/confirm: o Alert do React Native não
  // funciona na web e o confirm() do navegador trava a tela até alguém responder.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await fetchAdjustments());
    } catch (err) {
      setList([]);
      setError(err instanceof Error ? err.message : "Erro ao carregar os lançamentos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetchEmployees()
      .then((all) => setEmployees(all.filter((e) => e.role === "employee")))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar funcionários"));
  }, [load]);

  async function handleSave() {
    setError(null);
    setMessage(null);

    if (!profile) return;
    if (!employeeId) {
      setError("Selecione o funcionário.");
      return;
    }
    if (!isValidDate(day)) {
      setError("Data inválida. Use o formato AAAA-MM-DD.");
      return;
    }
    const { minutes, error: parseError } = parseAdjustmentMinutes(horas, minutos, kind);
    if (parseError) {
      setError(parseError);
      return;
    }
    if (!reason.trim()) {
      setError("Descreva de onde vêm essas horas.");
      return;
    }

    setSaving(true);
    try {
      await createAdjustment({
        employeeId,
        day,
        minutes,
        reason: reason.trim(),
        createdBy: profile.id,
      });
      setHoras("");
      setMinutos("");
      setReason("");
      setMessage("Lançamento registrado. O saldo do funcionário já reflete.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar o lançamento");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setRemovingId(id);
    setError(null);
    setMessage(null);
    try {
      await deleteAdjustment(id);
      setList((current) => current.filter((row) => row.id !== id));
      setConfirmingId(null);
    } catch (err) {
      // A linha continua na tela e em modo de confirmação: se a remoção falhou, sumir
      // com ela daria a impressão de que deu certo.
      setError(err instanceof Error ? err.message : "Erro ao remover o lançamento");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.title}>Horas a compensar</Text>
        <Text style={styles.hint}>
          Para horas anotadas fora do sistema. O valor entra direto no banco de horas do funcionário — não passa
          por aprovação, porque quem lança já é quem aprovaria.
        </Text>

        <Text style={styles.label}>Funcionário</Text>
        <View style={styles.chipRow}>
          {employees.map((employee) => {
            const selected = employee.id === employeeId;
            return (
              <Pressable
                key={employee.id}
                onPress={() => setEmployeeId(employee.id)}
                style={[styles.chip, selected && styles.chipOn]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>{employee.full_name}</Text>
              </Pressable>
            );
          })}
          {employees.length === 0 ? <Text style={styles.hint}>Nenhum funcionário cadastrado.</Text> : null}
        </View>

        <Text style={styles.label}>Tipo</Text>
        <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={setKind} />

        <Text style={styles.label}>Data de referência</Text>
        <TextInput
          style={styles.input}
          value={day}
          onChangeText={setDay}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={colors.textFaint}
        />
        <WeekdayLabel day={day} />

        <Text style={styles.label}>Quanto tempo</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <TextInput
              style={styles.input}
              value={horas}
              onChangeText={setHoras}
              placeholder="0"
              keyboardType="number-pad"
              placeholderTextColor={colors.textFaint}
            />
            <Text style={styles.unit}>horas</Text>
          </View>
          <View style={styles.timeField}>
            <TextInput
              style={styles.input}
              value={minutos}
              onChangeText={setMinutos}
              placeholder="0"
              keyboardType="number-pad"
              placeholderTextColor={colors.textFaint}
            />
            <Text style={styles.unit}>minutos</Text>
          </View>
        </View>

        <Text style={styles.label}>De onde vêm essas horas</Text>
        <TextInput
          style={[styles.input, styles.reasonInput]}
          value={reason}
          onChangeText={setReason}
          placeholder="Ex.: mutirão de sábado anotado na folha"
          placeholderTextColor={colors.textFaint}
          multiline
        />

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Lançar" onPress={handleSave} loading={saving} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Lançamentos registrados</Text>
        {loading ? <Text style={styles.hint}>Carregando…</Text> : null}
        {!loading && list.length === 0 ? <Text style={styles.hint}>Nenhum lançamento ainda</Text> : null}

        {list.map((row) => (
          <View key={row.id} style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{row.employeeName}</Text>
                <Text style={styles.rowDetail}>{formatDay(row.day)}</Text>
                <Text style={styles.rowReason}>{row.reason}</Text>
              </View>
              <Text
                style={[styles.rowValue, { color: row.minutes >= 0 ? colors.success : colors.danger }]}
              >
                {row.minutes > 0 ? "+" : ""}
                {formatMinutes(row.minutes)}
              </Text>
              {confirmingId === row.id ? null : (
                <Pressable
                  onPress={() => setConfirmingId(row.id)}
                  style={styles.removeButton}
                  accessibilityLabel={`Remover lançamento de ${row.employeeName}`}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </Pressable>
              )}
            </View>

            {confirmingId === row.id ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>
                  Apagar este lançamento? O saldo do funcionário volta ao que era.
                </Text>
                <View style={styles.confirmButtons}>
                  <Pressable
                    onPress={() => setConfirmingId(null)}
                    disabled={removingId === row.id}
                    style={[styles.confirmButton, styles.cancelButton]}
                  >
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(row.id)}
                    disabled={removingId === row.id}
                    style={[styles.confirmButton, styles.deleteButton]}
                  >
                    <Text style={styles.deleteText}>
                      {removingId === row.id ? "Apagando…" : "Apagar"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  // Mesma largura contida das outras telas de formulário: campo esticado de ponta
  // a ponta do monitor fica difícil de ler e de mirar.
  card: { gap: 10, alignSelf: "center", width: "100%", maxWidth: 560 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  hint: { fontSize: 14, color: colors.textFaint },
  label: { fontSize: 15, color: colors.textMuted, marginTop: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.chipSelected, borderColor: colors.chipSelected },
  chipText: { fontSize: 15, color: colors.textMuted },
  chipTextOn: { color: colors.chipSelectedText, fontWeight: "600" },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  reasonInput: { minHeight: 64, textAlignVertical: "top" },
  timeRow: { flexDirection: "row", gap: 12 },
  timeField: { flex: 1, gap: 4 },
  unit: { fontSize: 14, color: colors.textMuted },
  success: { fontSize: 16, color: colors.success },
  error: { fontSize: 16, color: colors.danger },
  row: {
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  confirmBox: {
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  confirmText: { fontSize: 15, color: colors.text },
  confirmButtons: { flexDirection: "row", gap: 10 },
  confirmButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  cancelButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontSize: 16, fontWeight: "600", color: colors.text },
  deleteButton: { backgroundColor: colors.danger },
  deleteText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  rowInfo: { flex: 1, minWidth: 180, gap: 2 },
  rowName: { fontSize: 17, fontWeight: "700", color: colors.text },
  rowDetail: { fontSize: 15, color: colors.textMuted },
  rowReason: { fontSize: 14, color: colors.textFaint, fontStyle: "italic" },
  rowValue: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  removeButton: { padding: 8 },
});
