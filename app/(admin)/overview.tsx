import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  fetchPunchOverview,
  type OverviewRow,
  type OverviewStatus,
  type PunchOverview,
} from "../../features/admin/punchOverviewService";
import { isValidDate } from "../../features/corrections/datetime";
import { appDaysAgo } from "../../lib/appDate";
import { colors } from "../../lib/theme";
import { formatMinutes } from "../../types/domain";

const STATUS_META: Record<
  OverviewStatus,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  ok: { label: "Completo", color: colors.success, icon: "checkmark-circle" },
  pending: { label: "Aguardando", color: colors.warning, icon: "time" },
  incomplete: { label: "Incompleto", color: colors.warning, icon: "warning" },
  rejected: { label: "Recusada", color: colors.danger, icon: "close-circle" },
  absent: { label: "Falta", color: colors.danger, icon: "close-circle" },
};

const COL = { status: 150, employee: 260, day: 150, time: 120, balance: 130 };

function Cell({ width, children, color, bold }: {
  width: number;
  children: React.ReactNode;
  color?: string;
  bold?: boolean;
}) {
  return (
    <View style={[styles.cell, { width }]}>
      <Text style={[styles.cellText, color ? { color } : null, bold ? styles.bold : null]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

function formatDay(day: string): string {
  const [, mm, dd] = day.split("-");
  return `${dd}/${mm}`;
}

export default function OverviewScreen() {
  const [fromDate, setFromDate] = useState(appDaysAgo(29));
  const [toDate, setToDate] = useState(appDaysAgo(0));
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null);
  const [data, setData] = useState<PunchOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      setError("Informe datas válidas no formato AAAA-MM-DD.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPunchOverview(fromDate, toDate));
    } catch (err) {
      // Sem engolir: uma tabela vazia por falha não pode parecer período sem marcações.
      setData(null);
      setError(err instanceof Error ? err.message : "Erro ao carregar as marcações");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const rows: OverviewRow[] = (data?.rows ?? []).filter(
    (row) => !employeeFilter || row.employeeId === employeeFilter
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Acompanhamento de marcações</Text>
          {data && data.pendingCount > 0 ? (
            <Text style={styles.pendingBadge}>
              {data.pendingCount} aguardando aprovação
            </Text>
          ) : null}
        </View>

        <View style={styles.filters}>
          <View style={styles.dateField}>
            <Text style={styles.label}>De</Text>
            <TextInput
              style={styles.input}
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.textFaint}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.label}>Até</Text>
            <TextInput
              style={styles.input}
              value={toDate}
              onChangeText={setToDate}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.textFaint}
            />
          </View>
          <View style={styles.reloadField}>
            <Button label="Atualizar" variant="secondary" onPress={load} loading={loading} />
          </View>
        </View>

        {data && data.employees.length > 1 ? (
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setEmployeeFilter(null)}
              style={[styles.chip, employeeFilter === null && styles.chipSelected]}
            >
              <Text style={[styles.chipText, employeeFilter === null && styles.chipTextSelected]}>Todos</Text>
            </Pressable>
            {data.employees.map((employee) => {
              const selected = employee.id === employeeFilter;
              return (
                <Pressable
                  key={employee.id}
                  onPress={() => setEmployeeFilter(employee.id)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{employee.name}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHeader}>
              <Cell width={COL.status}>Status</Cell>
              <Cell width={COL.employee}>Funcionário</Cell>
              <Cell width={COL.day}>Dia</Cell>
              <Cell width={COL.time}>Entrada</Cell>
              <Cell width={COL.time}>Saída</Cell>
              <Cell width={COL.balance}>Saldo</Cell>
            </View>

            {rows.map((row) => {
              const meta = STATUS_META[row.status];
              return (
                <View key={row.key} style={styles.row}>
                  <View style={[styles.cell, { width: COL.status, flexDirection: "row", gap: 8 }]}>
                    <Ionicons name={meta.icon} size={24} color={meta.color} />
                    <Text style={[styles.cellText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Cell width={COL.employee} color={colors.text}>
                    {row.employeeName}
                  </Cell>
                  <Cell width={COL.day} color={colors.text}>
                    {formatDay(row.day)}
                  </Cell>
                  <Cell width={COL.time} color={colors.text}>
                    {row.entrada ?? "—"}
                  </Cell>
                  <Cell width={COL.time} color={colors.text}>
                    {row.saida ?? "—"}
                  </Cell>
                  <Cell
                    width={COL.balance}
                    color={
                      row.balanceMinutes === null
                        ? colors.textFaint
                        : row.balanceMinutes >= 0
                        ? colors.success
                        : colors.danger
                    }
                    bold
                  >
                    {row.balanceMinutes === null ? "—" : formatMinutes(row.balanceMinutes)}
                  </Cell>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {!loading && !error && rows.length === 0 ? (
          <Text style={styles.empty}>Nenhuma marcação no período</Text>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  card: { gap: 14 },
  headerRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  pendingBadge: { fontSize: 16, fontWeight: "700", color: colors.warning },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "flex-end" },
  dateField: { gap: 4, minWidth: 170 },
  reloadField: { minWidth: 170 },
  label: { fontSize: 14, color: colors.textMuted },
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.chipSelected, borderColor: colors.chipSelected },
  chipText: { fontSize: 15, color: colors.textMuted },
  chipTextSelected: { color: colors.chipSelectedText, fontWeight: "600" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 16,
  },
  cell: { paddingHorizontal: 8, justifyContent: "center" },
  cellText: { fontSize: 18, color: colors.textMuted },
  bold: { fontWeight: "700" },
  error: { fontSize: 16, color: colors.danger },
  empty: { textAlign: "center", fontSize: 18, color: colors.textMuted, marginTop: 16 },
});
