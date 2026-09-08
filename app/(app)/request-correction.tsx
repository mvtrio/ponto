import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { proposeCorrection } from "../../features/corrections/correctionService";
import {
  formatDateTime,
  isValidDate,
  isValidTime,
  isoToTime,
  toIso,
  todayIsoDate,
} from "../../features/corrections/datetime";
import { useMyCorrections } from "../../features/corrections/useCorrections";
import { fetchPunchesForRange } from "../../features/punches/punchService";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";
import { PUNCH_TYPE_LABELS, type ActivePunchType, type CorrectionStatus, type Punch } from "../../types/domain";

const TYPE_OPTIONS: { label: string; value: ActivePunchType }[] = [
  { label: "Entrada", value: "clock_in" },
  { label: "Saída", value: "clock_out" },
];

const STATUS_LABELS: Record<CorrectionStatus, string> = {
  pending: "Aguardando aprovação",
  approved: "Aprovada",
  rejected: "Rejeitada",
};

const STATUS_COLORS: Record<CorrectionStatus, string> = {
  pending: colors.warning,
  approved: colors.success,
  rejected: colors.danger,
};

export default function EmployeeCorrectionsScreen() {
  const { profile } = useSession();
  const myCorrections = useMyCorrections(profile?.id);

  const [date, setDate] = useState(todayIsoDate());
  const [type, setType] = useState<ActivePunchType>("clock_in");
  const [time, setTime] = useState("08:00");
  const [reason, setReason] = useState("");
  const [dayPunches, setDayPunches] = useState<Punch[]>([]);
  const [originalPunchId, setOriginalPunchId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Marcações do dia escolhido: o funcionário aponta qual quer corrigir, ou pede a
  // inclusão de uma que faltou (ex.: esqueceu de bater a saída).
  const loadDayPunches = useCallback(async () => {
    if (!profile || !isValidDate(date)) {
      setDayPunches([]);
      setOriginalPunchId(null);
      return;
    }
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    try {
      setDayPunches(await fetchPunchesForRange(profile.id, start.toISOString(), end.toISOString()));
    } catch {
      setDayPunches([]);
    }
    setOriginalPunchId(null);
  }, [profile, date]);

  useEffect(() => {
    loadDayPunches();
  }, [loadDayPunches]);

  // Ao escolher uma marcação existente, o formulário já vem preenchido com ela,
  // restando ao funcionário ajustar só o que está errado.
  function selectPunch(punch: Punch | null) {
    setOriginalPunchId(punch?.id ?? null);
    if (punch) {
      setTime(isoToTime(punch.occurred_at));
      if (punch.type === "clock_in" || punch.type === "clock_out") setType(punch.type);
    }
  }

  async function handleSubmit() {
    setError(null);
    setMessage(null);

    if (!profile) return;
    if (!isValidDate(date)) {
      setError("Data inválida. Use o formato AAAA-MM-DD.");
      return;
    }
    if (!isValidTime(time)) {
      setError("Hora inválida. Use o formato HH:MM.");
      return;
    }
    if (!reason.trim()) {
      setError("Descreva o motivo da correção.");
      return;
    }

    setSaving(true);
    try {
      await proposeCorrection({
        employeeId: profile.id,
        requestedBy: profile.id,
        originalPunchId,
        proposedType: type,
        proposedOccurredAt: toIso(date, time),
        reason: reason.trim(),
      });
      setReason("");
      setMessage("Solicitação enviada. Um administrador vai analisar.");
      await myCorrections.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar a solicitação");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Solicitar correção</Text>
        <Text style={styles.hint}>
          Use quando um horário ficou errado ou faltou bater o ponto. A solicitação vai para aprovação de um
          administrador — sua marcação original é preservada.
        </Text>

        <Text style={styles.label}>Dia</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={colors.textFaint}
        />

        <Text style={styles.label}>O que corrigir</Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => selectPunch(null)}
            style={[styles.chip, originalPunchId === null && styles.chipSelected]}
          >
            <Text style={[styles.chipText, originalPunchId === null && styles.chipTextSelected]}>
              Faltou marcar
            </Text>
          </Pressable>
          {dayPunches.map((punch) => {
            const selected = punch.id === originalPunchId;
            return (
              <Pressable
                key={punch.id}
                onPress={() => selectPunch(punch)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {PUNCH_TYPE_LABELS[punch.type] ?? punch.type} {isoToTime(punch.occurred_at)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {isValidDate(date) && dayPunches.length === 0 ? (
          <Text style={styles.hint}>Nenhuma marcação nesse dia.</Text>
        ) : null}

        <Text style={styles.label}>Tipo</Text>
        <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />

        <Text style={styles.label}>Horário correto</Text>
        <TextInput
          style={styles.input}
          value={time}
          onChangeText={setTime}
          placeholder="HH:MM"
          placeholderTextColor={colors.textFaint}
        />

        <Text style={styles.label}>Motivo</Text>
        <TextInput
          style={[styles.input, styles.reasonInput]}
          value={reason}
          onChangeText={setReason}
          placeholder="Ex.: esqueci de bater a saída"
          placeholderTextColor={colors.textFaint}
          multiline
        />

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Enviar solicitação" onPress={handleSubmit} loading={saving} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Minhas solicitações</Text>
        {myCorrections.error ? <Text style={styles.error}>{myCorrections.error}</Text> : null}

        {myCorrections.corrections.map((correction) => (
          <View key={correction.id} style={styles.historyRow}>
            <View style={styles.historyMain}>
              <Text style={styles.historyTitle}>
                {PUNCH_TYPE_LABELS[correction.proposed_type] ?? correction.proposed_type} —{" "}
                {formatDateTime(correction.proposed_occurred_at)}
              </Text>
              <Text style={styles.reason}>{correction.reason}</Text>
            </View>
            <Text style={[styles.status, { color: STATUS_COLORS[correction.status] }]}>
              {STATUS_LABELS[correction.status]}
            </Text>
          </View>
        ))}
        {!myCorrections.loading && myCorrections.corrections.length === 0 ? (
          <Text style={styles.empty}>Você ainda não solicitou nenhuma correção</Text>
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  reasonInput: { minHeight: 64, textAlignVertical: "top" },
  success: { color: colors.success },
  error: { color: colors.danger },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 8 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyMain: { flex: 1, gap: 2 },
  historyTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  reason: { fontSize: 13, color: colors.textFaint, fontStyle: "italic" },
  status: { fontSize: 12, fontWeight: "700" },
});
