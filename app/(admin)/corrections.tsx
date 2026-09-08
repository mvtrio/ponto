import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { CorrectionRow, ReviewedCorrectionRow } from "../../components/admin/CorrectionRow";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { fetchEmployees } from "../../features/admin/adminService";
import {
  applyAdminCorrection,
  approveCorrection,
  updateCorrectionProposal,
} from "../../features/corrections/correctionService";
import {
  isValidDate,
  isValidTime,
  isoToTime,
  toIso,
  todayIsoDate,
} from "../../features/corrections/datetime";
import { usePendingCorrections, useReviewedCorrections } from "../../features/corrections/useCorrections";
import { fetchPunchesForRange } from "../../features/punches/punchService";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";
import { PUNCH_TYPE_LABELS, type ActivePunchType, type Profile, type Punch } from "../../types/domain";

const TYPE_OPTIONS: { label: string; value: ActivePunchType }[] = [
  { label: "Entrada", value: "clock_in" },
  { label: "Saída", value: "clock_out" },
];

export default function CorrectionsScreen() {
  const { profile } = useSession();
  const pending = usePendingCorrections();
  const reviewed = useReviewedCorrections();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Lançamento manual (estorno feito pelo próprio admin).
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [type, setType] = useState<ActivePunchType>("clock_in");
  const [date, setDate] = useState(todayIsoDate());
  const [time, setTime] = useState("08:00");
  const [reason, setReason] = useState("");
  const [dayPunches, setDayPunches] = useState<Punch[]>([]);
  const [originalPunchId, setOriginalPunchId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees()
      .then((list) => setEmployees(list.filter((e) => e.role === "employee")))
      .catch((err) => setFormError(err instanceof Error ? err.message : "Erro ao carregar funcionários"));
  }, []);

  // Marcações já existentes no dia escolhido: o admin escolhe corrigir uma delas
  // (estorno) ou incluir uma marcação nova.
  const loadDayPunches = useCallback(async () => {
    if (!employeeId || !isValidDate(date)) {
      setDayPunches([]);
      setOriginalPunchId(null);
      return;
    }
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    try {
      setDayPunches(await fetchPunchesForRange(employeeId, start.toISOString(), end.toISOString()));
    } catch {
      setDayPunches([]);
    }
    setOriginalPunchId(null);
  }, [employeeId, date]);

  useEffect(() => {
    loadDayPunches();
  }, [loadDayPunches]);

  async function handleApprove(id: string, proposedType: ActivePunchType, proposedDate: string, proposedTime: string) {
    setProcessingId(id);
    setReviewError(null);
    try {
      // Grava o ajuste do admin antes de aprovar; a aprovação usa o que está na proposta.
      await updateCorrectionProposal(id, proposedType, toIso(proposedDate, proposedTime));
      await approveCorrection(id, true);
      await Promise.all([pending.reload(), reviewed.reload()]);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Erro ao aprovar a correção");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: string) {
    setProcessingId(id);
    setReviewError(null);
    try {
      await approveCorrection(id, false);
      await Promise.all([pending.reload(), reviewed.reload()]);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Erro ao rejeitar a correção");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleApplyManual() {
    setFormError(null);
    setFormMessage(null);

    if (!profile) return;
    if (!employeeId) {
      setFormError("Selecione o funcionário.");
      return;
    }
    if (!isValidDate(date)) {
      setFormError("Data inválida. Use o formato AAAA-MM-DD.");
      return;
    }
    if (!isValidTime(time)) {
      setFormError("Hora inválida. Use o formato HH:MM.");
      return;
    }
    if (!reason.trim()) {
      setFormError("Descreva o motivo da correção.");
      return;
    }

    setSaving(true);
    try {
      await applyAdminCorrection({
        employeeId,
        requestedBy: profile.id,
        originalPunchId,
        proposedType: type,
        proposedOccurredAt: toIso(date, time),
        reason: reason.trim(),
      });
      setReason("");
      setFormMessage("Correção aplicada.");
      await Promise.all([loadDayPunches(), reviewed.reload()]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao aplicar a correção");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Solicitações pendentes</Text>
        <Text style={styles.hint}>
          Ajuste o tipo e o horário se necessário — a aprovação grava o valor mostrado abaixo, não
          obrigatoriamente o que foi pedido. A marcação original é preservada para auditoria.
        </Text>
        {pending.error ? <Text style={styles.error}>{pending.error}</Text> : null}
        {reviewError ? <Text style={styles.error}>{reviewError}</Text> : null}

        {pending.corrections.map((correction) => (
          <CorrectionRow
            key={correction.id}
            correction={correction}
            onApprove={handleApprove}
            onReject={handleReject}
            loading={processingId === correction.id}
          />
        ))}
        {!pending.loading && pending.corrections.length === 0 ? (
          <Text style={styles.empty}>Nenhuma correção pendente</Text>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Lançar correção</Text>
        <Text style={styles.hint}>
          Corrige uma marcação diretamente, sem depender de solicitação do funcionário.
        </Text>

        <Text style={styles.label}>Funcionário</Text>
        <View style={styles.employeeList}>
          {employees.map((employee) => {
            const selected = employee.id === employeeId;
            return (
              <Pressable
                key={employee.id}
                onPress={() => setEmployeeId(employee.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{employee.full_name}</Text>
              </Pressable>
            );
          })}
          {employees.length === 0 ? <Text style={styles.hint}>Nenhum funcionário cadastrado.</Text> : null}
        </View>

        <Text style={styles.label}>Tipo</Text>
        <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />

        <Text style={styles.label}>Data e hora corretas</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.dateInput]}
            value={date}
            onChangeText={setDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.textFaint}
          />
          <TextInput
            style={[styles.input, styles.timeInput]}
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM"
            placeholderTextColor={colors.textFaint}
          />
        </View>

        {employeeId && isValidDate(date) ? (
          <>
            <Text style={styles.label}>Marcação a corrigir</Text>
            <View style={styles.employeeList}>
              <Pressable
                onPress={() => setOriginalPunchId(null)}
                style={[styles.chip, originalPunchId === null && styles.chipSelected]}
              >
                <Text style={[styles.chipText, originalPunchId === null && styles.chipTextSelected]}>
                  Incluir nova
                </Text>
              </Pressable>
              {dayPunches.map((punch) => {
                const selected = punch.id === originalPunchId;
                return (
                  <Pressable
                    key={punch.id}
                    onPress={() => setOriginalPunchId(punch.id)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {PUNCH_TYPE_LABELS[punch.type] ?? punch.type} {isoToTime(punch.occurred_at)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {dayPunches.length === 0 ? (
              <Text style={styles.hint}>Nenhuma marcação nesse dia — a correção incluirá uma nova.</Text>
            ) : null}
          </>
        ) : null}

        <Text style={styles.label}>Motivo</Text>
        <TextInput
          style={[styles.input, styles.reasonInput]}
          value={reason}
          onChangeText={setReason}
          placeholder="Ex.: esqueceu de bater a saída"
          placeholderTextColor={colors.textFaint}
          multiline
        />

        {formMessage ? <Text style={styles.success}>{formMessage}</Text> : null}
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <Button label="Aplicar correção" onPress={handleApplyManual} loading={saving} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Últimas correções revisadas</Text>
        {reviewed.error ? <Text style={styles.error}>{reviewed.error}</Text> : null}
        {reviewed.corrections.map((correction) => (
          <ReviewedCorrectionRow key={correction.id} correction={correction} />
        ))}
        {!reviewed.loading && reviewed.corrections.length === 0 ? (
          <Text style={styles.empty}>Nenhuma correção revisada ainda</Text>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  card: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  hint: { fontSize: 12, color: colors.textFaint },
  label: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  employeeList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.chipSelected, borderColor: colors.chipSelected },
  chipText: { fontSize: 13, color: colors.textMuted },
  chipTextSelected: { color: colors.chipSelectedText, fontWeight: "600" },
  inputRow: { flexDirection: "row", gap: 8 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  dateInput: { flex: 2 },
  timeInput: { flex: 1 },
  reasonInput: { minHeight: 64, textAlignVertical: "top" },
  success: { color: colors.success },
  error: { color: colors.danger },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 8 },
});
