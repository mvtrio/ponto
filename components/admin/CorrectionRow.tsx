import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { SegmentedControl } from "../ui/SegmentedControl";
import {
  formatDateTime,
  isValidDate,
  isValidTime,
  isoToDate,
  isoToTime,
} from "../../features/corrections/datetime";
import { colors } from "../../lib/theme";
import type { ActivePunchType, CorrectionStatus } from "../../types/domain";
import type { DetailedCorrection } from "../../features/corrections/correctionService";

const TYPE_OPTIONS: { label: string; value: ActivePunchType }[] = [
  { label: "Entrada", value: "clock_in" },
  { label: "Saída", value: "clock_out" },
];

export const TYPE_LABELS: Record<string, string> = {
  clock_in: "Entrada",
  clock_out: "Saída",
  break_start: "Início do intervalo",
  break_end: "Fim do intervalo",
};

const STATUS_LABELS: Record<CorrectionStatus, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
};

interface CorrectionRowProps {
  correction: DetailedCorrection;
  /** `(id, type, date, time)` — o admin pode ajustar a proposta antes de aprovar. */
  onApprove: (id: string, type: ActivePunchType, date: string, time: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}

export function CorrectionRow({ correction, onApprove, onReject, loading }: CorrectionRowProps) {
  const [type, setType] = useState<ActivePunchType>(
    correction.proposed_type === "clock_out" ? "clock_out" : "clock_in"
  );
  const [date, setDate] = useState(isoToDate(correction.proposed_occurred_at));
  const [time, setTime] = useState(isoToTime(correction.proposed_occurred_at));

  const dateValid = isValidDate(date);
  const timeValid = isValidTime(time);
  const canApprove = dateValid && timeValid;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.employee}>{correction.employeeName}</Text>
        <Text style={styles.requested}>Solicitado por {correction.requesterName}</Text>
      </View>

      {correction.originalOccurredAt ? (
        <Text style={styles.detail}>
          Marcação original: <Text style={styles.strike}>{formatDateTime(correction.originalOccurredAt)}</Text>
        </Text>
      ) : (
        <Text style={styles.detail}>Sem marcação original — será incluída uma nova.</Text>
      )}

      <Text style={styles.detail}>Pedido em {formatDateTime(correction.created_at)}</Text>
      <Text style={styles.reason}>Motivo: {correction.reason}</Text>

      <Text style={styles.label}>Tipo</Text>
      <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />

      <Text style={styles.label}>Horário corrigido</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, styles.dateInput, !dateValid && styles.inputInvalid]}
          value={date}
          onChangeText={setDate}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={colors.textFaint}
        />
        <TextInput
          style={[styles.input, styles.timeInput, !timeValid && styles.inputInvalid]}
          value={time}
          onChangeText={setTime}
          placeholder="HH:MM"
          placeholderTextColor={colors.textFaint}
        />
      </View>
      {!canApprove ? <Text style={styles.error}>Informe data (AAAA-MM-DD) e hora (HH:MM) válidas.</Text> : null}

      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <Button label="Rejeitar" variant="secondary" onPress={() => onReject(correction.id)} loading={loading} />
        </View>
        <View style={styles.actionButton}>
          <Button
            label="Aprovar correção"
            onPress={() => onApprove(correction.id, type, date, time)}
            loading={loading}
            disabled={!canApprove}
          />
        </View>
      </View>
    </Card>
  );
}

/** Mesma correção, já revisada: só leitura, para o histórico. */
export function ReviewedCorrectionRow({ correction }: { correction: DetailedCorrection }) {
  const approved = correction.status === "approved";
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyMain}>
        <Text style={styles.historyEmployee}>{correction.employeeName}</Text>
        <Text style={styles.detail}>
          {TYPE_LABELS[correction.proposed_type] ?? correction.proposed_type} —{" "}
          {formatDateTime(correction.proposed_occurred_at)}
        </Text>
        <Text style={styles.reason}>{correction.reason}</Text>
      </View>
      <Text style={[styles.status, { color: approved ? colors.success : colors.danger }]}>
        {STATUS_LABELS[correction.status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, marginBottom: 12 },
  header: { gap: 2 },
  employee: { fontSize: 16, fontWeight: "700", color: colors.text },
  requested: { fontSize: 12, color: colors.textFaint },
  detail: { fontSize: 13, color: colors.textMuted },
  strike: { textDecorationLine: "line-through" },
  reason: { fontSize: 13, color: colors.textFaint, fontStyle: "italic" },
  label: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  inputRow: { flexDirection: "row", gap: 8 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  dateInput: { flex: 2 },
  timeInput: { flex: 1 },
  inputInvalid: { borderColor: colors.danger },
  error: { fontSize: 12, color: colors.danger },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionButton: { flex: 1 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyMain: { flex: 1, gap: 2 },
  historyEmployee: { fontSize: 14, fontWeight: "600", color: colors.text },
  status: { fontSize: 12, fontWeight: "700" },
});
