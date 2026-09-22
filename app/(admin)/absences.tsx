import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ScreenGuide } from "../../components/ui/ScreenGuide";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { WeekdayLabel } from "../../components/ui/WeekdayLabel";
import { fetchEmployees } from "../../features/admin/adminService";
import { buildAbsenceDays, type AbsenceKind } from "../../features/admin/absenceInput";
import {
  createAbsences,
  deleteAbsence,
  fetchAbsences,
  type AbsenceWithName,
} from "../../features/admin/absencesService";
import { todayIsoDate } from "../../features/corrections/datetime";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";
import type { Profile } from "../../types/domain";

const KIND_OPTIONS: { label: string; value: AbsenceKind }[] = [
  { label: "Atestado", value: "atestado" },
  { label: "Folga", value: "folga" },
];

const KIND_LABEL: Record<AbsenceKind, string> = {
  atestado: "Atestado",
  folga: "Folga",
};

function formatDay(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

export default function AbsencesScreen() {
  const { profile } = useSession();

  const [employees, setEmployees] = useState<Profile[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [kind, setKind] = useState<AbsenceKind>("atestado");
  const [fromDay, setFromDay] = useState(todayIsoDate());
  const [toDay, setToDay] = useState("");
  const [notes, setNotes] = useState("");

  const [list, setList] = useState<AbsenceWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await fetchAbsences());
    } catch (err) {
      setList([]);
      setError(err instanceof Error ? err.message : "Erro ao carregar os registros");
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

    const { days, error: rangeError } = buildAbsenceDays(fromDay, toDay);
    if (rangeError) {
      setError(rangeError);
      return;
    }

    setSaving(true);
    try {
      await createAbsences({ employeeId, days, kind, notes: notes.trim(), createdBy: profile.id });
      setToDay("");
      setNotes("");
      setMessage(
        days.length === 1
          ? `${KIND_LABEL[kind]} registrado em ${formatDay(days[0])}. O dia deixa de contar como falta.`
          : `${KIND_LABEL[kind]} registrado em ${days.length} dias. Eles deixam de contar como falta.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setRemovingId(id);
    setError(null);
    setMessage(null);
    try {
      await deleteAbsence(id);
      setList((current) => current.filter((row) => row.id !== id));
      setConfirmingId(null);
    } catch (err) {
      // A linha fica: sumir com ela sem ter apagado diria que deu certo.
      setError(err instanceof Error ? err.message : "Erro ao remover o registro");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenGuide
        summary="Use esta tela quando a funcionária faltou e a ausência é justificada. Sem este registro, o sistema lança falta no dia útil sem marcação e cobra a jornada inteira em saldo devedor."
        steps={[
          "Escolha a funcionária.",
          "Escolha Atestado ou Folga.",
          "Informe a data inicial em “Do dia”.",
          "Se a ausência durou vários dias, preencha “Até o dia”. Para um dia só, deixe vazio.",
          "Se quiser, anote uma observação — onde está o atestado, quem autorizou a folga.",
          "Clique em Registrar.",
        ]}
        result="Os dias registrados deixam de ser cobrados: não viram falta e não entram em saldo devedor. É como se fossem feriado, mas valendo só para essa funcionária. Se remover o registro depois, o dia volta a ser cobrado e pode virar falta de novo."
        notFor={[
          "Fim de semana e feriado — esses já não são cobrados, não precisa registrar.",
          "Dia em que ela trabalhou e esqueceu de bater o ponto — use a tela Correções.",
          "Compensar horas trabalhadas a mais — use a tela Compensar.",
        ]}
      />

      <Card style={styles.card}>
        <Text style={styles.title}>Atestados e folgas</Text>

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

        <Text style={styles.label}>Motivo</Text>
        <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={setKind} />

        <Text style={styles.label}>Do dia</Text>
        <TextInput
          style={styles.input}
          value={fromDay}
          onChangeText={setFromDay}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={colors.textFaint}
        />
        <WeekdayLabel day={fromDay} />

        <Text style={styles.label}>Até o dia (deixe vazio para um dia só)</Text>
        <TextInput
          style={styles.input}
          value={toDay}
          onChangeText={setToDay}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={colors.textFaint}
        />
        {toDay.trim() ? <WeekdayLabel day={toDay} /> : null}

        <Text style={styles.label}>Observação (opcional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Ex.: atestado médico entregue em mãos"
          placeholderTextColor={colors.textFaint}
          multiline
        />

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Registrar" onPress={handleSave} loading={saving} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Dias registrados</Text>
        {loading ? <Text style={styles.hint}>Carregando…</Text> : null}
        {!loading && list.length === 0 ? <Text style={styles.hint}>Nenhum dia registrado ainda</Text> : null}

        {list.map((row) => (
          <View key={row.id} style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{row.employeeName}</Text>
                <Text style={styles.rowDetail}>{formatDay(row.day)}</Text>
                {row.notes ? <Text style={styles.rowNotes}>{row.notes}</Text> : null}
              </View>
              <View
                style={[
                  styles.kindBadge,
                  { backgroundColor: row.kind === "atestado" ? colors.warning : colors.chipSelected },
                ]}
              >
                <Text
                  style={[
                    styles.kindText,
                    { color: row.kind === "atestado" ? "#1c1c1e" : colors.chipSelectedText },
                  ]}
                >
                  {KIND_LABEL[row.kind]}
                </Text>
              </View>
              {confirmingId === row.id ? null : (
                <Pressable
                  onPress={() => setConfirmingId(row.id)}
                  style={styles.removeButton}
                  accessibilityLabel={`Remover ${KIND_LABEL[row.kind]} de ${row.employeeName}`}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </Pressable>
              )}
            </View>

            {confirmingId === row.id ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>
                  Remover este dia? Ele volta a ser cobrado e pode virar falta.
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
                      {removingId === row.id ? "Removendo…" : "Remover"}
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
  notesInput: { minHeight: 64, textAlignVertical: "top" },
  success: { fontSize: 16, color: colors.success },
  error: { fontSize: 16, color: colors.danger },
  row: { gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowInfo: { flex: 1, minWidth: 160, gap: 2 },
  rowName: { fontSize: 17, fontWeight: "700", color: colors.text },
  rowDetail: { fontSize: 15, color: colors.textMuted },
  rowNotes: { fontSize: 14, color: colors.textFaint, fontStyle: "italic" },
  kindBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  kindText: { fontSize: 14, fontWeight: "700" },
  removeButton: { padding: 8 },
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
});
