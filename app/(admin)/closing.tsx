import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { fetchEmployees } from "../../features/admin/adminService";
import {
  applyOvertimeToDebit,
  isValidMonth,
  monthEnd,
  monthLabel,
  previousMonthStart,
  type HourBankState,
} from "../../features/hours/closingMath";
import {
  closeMonth,
  fetchClosings,
  fetchHourBankState,
  reopenMonth,
  type ClosingWithName,
} from "../../features/hours/closingService";
import { useSession } from "../../features/auth/useSession";
import { appToday } from "../../lib/appDate";
import { colors } from "../../lib/theme";
import { formatMinutes, type Profile } from "../../types/domain";

export default function ClosingScreen() {
  const { profile } = useSession();

  const [employees, setEmployees] = useState<Profile[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [month, setMonth] = useState(previousMonthStart(appToday()).slice(0, 7));

  // Dois estados diferentes de propósito: `state` é hoje, `closingState` é como estava no
  // último dia do mês a fechar. Confundir os dois faria a prévia prometer um resultado
  // que o fechamento não entregaria.
  const [state, setState] = useState<HourBankState | null>(null);
  const [closingState, setClosingState] = useState<HourBankState | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [list, setList] = useState<ClosingWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await fetchClosings());
    } catch (err) {
      setList([]);
      setError(err instanceof Error ? err.message : "Erro ao carregar os fechamentos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetchEmployees()
      .then((all) => {
        const onlyEmployees = all.filter((e) => e.role === "employee");
        setEmployees(onlyEmployees);
        if (onlyEmployees.length === 1) setEmployeeId(onlyEmployees[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar funcionários"));
  }, [load]);

  // A prévia é o próprio cálculo do fechamento, rodado antes de gravar: o admin vê
  // exatamente o que vai acontecer.
  const refreshState = useCallback(async (id: string, asOf: string | null) => {
    setState(null);
    setClosingState(null);
    setStateError(null);
    try {
      const [today, atClose] = await Promise.all([
        fetchHourBankState(id),
        asOf ? fetchHourBankState(id, asOf) : Promise.resolve(null),
      ]);
      setState(today);
      setClosingState(atClose);
    } catch (err) {
      setStateError(err instanceof Error ? err.message : "Erro ao apurar o banco de horas");
    }
  }, []);

  // Um único ponto de verdade sobre o mês estar completo: tudo que depende dele — prévia,
  // rótulo, apuração — passa por aqui em vez de repetir a checagem.
  const validMonth = isValidMonth(month) ? month : null;

  useEffect(() => {
    if (employeeId) refreshState(employeeId, validMonth ? monthEnd(validMonth) : null);
  }, [employeeId, validMonth, refreshState, list]);

  const preview = closingState ? applyOvertimeToDebit(closingState) : null;

  async function handleClose() {
    setError(null);
    setMessage(null);

    if (!profile || !employeeId) {
      setError("Selecione o funcionário.");
      return;
    }
    if (!validMonth) {
      setError("Mês inválido. Use o formato AAAA-MM.");
      return;
    }

    setClosing(true);
    try {
      await closeMonth(employeeId, `${validMonth}-01`);
      setMessage(`${monthLabel(`${validMonth}-01`)} fechado.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fechar o mês");
    } finally {
      setClosing(false);
    }
  }

  async function handleReopen(id: string) {
    setReopeningId(id);
    setError(null);
    setMessage(null);
    try {
      await reopenMonth(id);
      setConfirmingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reabrir o mês");
    } finally {
      setReopeningId(null);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.title}>Fechamento do mês</Text>
        <Text style={styles.hint}>
          No fechamento as horas extras abatem o débito acumulado. O que sobrar de um dos lados segue
          para o mês seguinte.
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

        <Text style={styles.label}>Mês a fechar</Text>
        <TextInput
          style={styles.input}
          value={month}
          onChangeText={setMonth}
          placeholder="AAAA-MM"
          placeholderTextColor={colors.textFaint}
        />
        <Text style={styles.hint}>
          {validMonth
            ? `Só é possível fechar um mês que já terminou — ${monthLabel(`${validMonth}-01`)}.`
            : "Informe o mês no formato AAAA-MM."}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Situação atual</Text>
        {stateError ? <Text style={styles.error}>{stateError}</Text> : null}
        {!employeeId ? <Text style={styles.hint}>Selecione o funcionário acima.</Text> : null}
        {employeeId && !state && !stateError ? <Text style={styles.hint}>Apurando…</Text> : null}

        {state ? (
          <View style={styles.stateRow}>
            <View style={styles.stateBox}>
              <Text style={styles.stateLabel}>Débito acumulado hoje</Text>
              <Text style={[styles.stateValue, { color: colors.danger }]}>
                {formatMinutes(state.debitMinutes)}
              </Text>
            </View>
            <View style={styles.stateBox}>
              <Text style={styles.stateLabel}>Horas extras hoje</Text>
              <Text style={[styles.stateValue, { color: colors.success }]}>
                {formatMinutes(state.overtimeMinutes)}
              </Text>
            </View>
          </View>
        ) : null}

        {validMonth && closingState && preview ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Se fechar {monthLabel(`${validMonth}-01`)}</Text>
            {/* A base é o saldo no último dia do mês, e não o de hoje: dizer isso evita
                que a diferença entre os dois números pareça erro. */}
            <Text style={styles.previewBasis}>
              Apurado até {monthEnd(validMonth).split("-").reverse().join("/")} — débito{" "}
              {formatMinutes(closingState.debitMinutes)}, extras{" "}
              {formatMinutes(closingState.overtimeMinutes)}.
            </Text>
            <View style={styles.previewLine}>
              <Text style={styles.previewLabel}>Extras usadas para abater</Text>
              <Text style={styles.previewValue}>{formatMinutes(preview.appliedMinutes)}</Text>
            </View>
            <View style={styles.previewLine}>
              <Text style={styles.previewLabel}>Débito que segue para o mês seguinte</Text>
              <Text style={[styles.previewValue, { color: colors.danger }]}>
                {formatMinutes(preview.carryDebitMinutes)}
              </Text>
            </View>
            <View style={styles.previewLine}>
              <Text style={styles.previewLabel}>Crédito que segue para o mês seguinte</Text>
              <Text style={[styles.previewValue, { color: colors.success }]}>
                {formatMinutes(preview.carryCreditMinutes)}
              </Text>
            </View>
          </View>
        ) : null}

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Fechar o mês" onPress={handleClose} loading={closing} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Meses fechados</Text>
        {loading ? <Text style={styles.hint}>Carregando…</Text> : null}
        {!loading && list.length === 0 ? <Text style={styles.hint}>Nenhum mês fechado ainda</Text> : null}

        {list.map((row) => (
          <View key={row.id} style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{monthLabel(row.month)}</Text>
                <Text style={styles.rowDetail}>{row.employeeName}</Text>
                <Text style={styles.rowDetail}>
                  Débito {formatMinutes(row.debit_minutes)} · Extras {formatMinutes(row.overtime_minutes)} ·
                  Abatido {formatMinutes(row.applied_minutes)}
                </Text>
                <Text style={styles.rowCarry}>
                  Seguiu:{" "}
                  {row.carry_debit_minutes > 0
                    ? `${formatMinutes(row.carry_debit_minutes)} de débito`
                    : row.carry_credit_minutes > 0
                      ? `${formatMinutes(row.carry_credit_minutes)} de crédito`
                      : "nada, zerou"}
                </Text>
              </View>
              {confirmingId === row.id ? null : (
                <Pressable
                  onPress={() => setConfirmingId(row.id)}
                  style={styles.removeButton}
                  accessibilityLabel={`Reabrir ${monthLabel(row.month)}`}
                >
                  <Ionicons name="lock-open-outline" size={22} color={colors.warning} />
                </Pressable>
              )}
            </View>

            {confirmingId === row.id ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>
                  Reabrir {monthLabel(row.month)}? O abatimento é desfeito e os dias voltam à apuração
                  normal.
                </Text>
                <View style={styles.confirmButtons}>
                  <Pressable
                    onPress={() => setConfirmingId(null)}
                    disabled={reopeningId === row.id}
                    style={[styles.confirmButton, styles.cancelButton]}
                  >
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleReopen(row.id)}
                    disabled={reopeningId === row.id}
                    style={[styles.confirmButton, styles.reopenButton]}
                  >
                    <Text style={styles.reopenText}>
                      {reopeningId === row.id ? "Reabrindo…" : "Reabrir"}
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
  stateRow: { flexDirection: "row", gap: 12 },
  stateBox: {
    flex: 1,
    gap: 4,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stateLabel: { fontSize: 14, color: colors.textMuted },
  stateValue: { fontSize: 28, fontWeight: "700", fontVariant: ["tabular-nums"] },
  previewBox: {
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  previewBasis: { fontSize: 14, color: colors.textFaint },
  previewLine: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  previewLabel: { flex: 1, fontSize: 15, color: colors.textMuted },
  previewValue: { fontSize: 17, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  success: { fontSize: 16, color: colors.success },
  error: { fontSize: 16, color: colors.danger },
  row: { gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowInfo: { flex: 1, minWidth: 180, gap: 2 },
  rowName: { fontSize: 18, fontWeight: "700", color: colors.text },
  rowDetail: { fontSize: 14, color: colors.textMuted },
  rowCarry: { fontSize: 14, color: colors.textFaint, fontStyle: "italic" },
  removeButton: { padding: 8 },
  confirmBox: {
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  confirmText: { fontSize: 15, color: colors.text },
  confirmButtons: { flexDirection: "row", gap: 10 },
  confirmButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  cancelButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontSize: 16, fontWeight: "600", color: colors.text },
  reopenButton: { backgroundColor: colors.warning },
  reopenText: { fontSize: 16, fontWeight: "700", color: "#1c1c1e" },
});
