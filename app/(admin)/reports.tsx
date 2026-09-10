import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ReportPreview } from "../../components/admin/ReportPreview";
import { fetchPunchOverview } from "../../features/admin/punchOverviewService";
import { isValidDate } from "../../features/corrections/datetime";
import { exportCsv } from "../../features/export/csvExport";
import { exportPdf } from "../../features/export/pdfExport";
import { buildReportData, type EmployeeReport } from "../../features/export/reportData";
import { appDaysAgo } from "../../lib/appDate";
import { colors } from "../../lib/theme";

const ALL = "__todos__";

export default function ReportsScreen() {
  const [fromDate, setFromDate] = useState(appDaysAgo(30));
  const [toDate, setToDate] = useState(appDaysAgo(0));
  const [selectedId, setSelectedId] = useState<string>(ALL);
  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      setError("Informe datas válidas no formato AAAA-MM-DD.");
      return;
    }
    setLoading(true);
    setError(null);
    fetchPunchOverview(fromDate, toDate)
      .then((overview) => {
        if (!cancelled) setReports(buildReportData(overview.rows));
      })
      .catch((err) => {
        if (!cancelled) {
          setReports([]);
          setError(err instanceof Error ? err.message : "Erro ao carregar o relatório");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate]);

  const selected = selectedId === ALL ? reports : reports.filter((r) => r.employeeId === selectedId);

  async function handleExport(format: "csv" | "pdf") {
    setError(null);
    setExporting(true);
    try {
      if (format === "csv") await exportCsv(selected);
      else await exportPdf(selected, fromDate, toDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao exportar relatório");
    } finally {
      setExporting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.title}>Relatórios</Text>

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
        </View>

        <Text style={styles.label}>Funcionário</Text>
        <View style={styles.chipRow}>
          <Pressable onPress={() => setSelectedId(ALL)} style={[styles.chip, selectedId === ALL && styles.chipOn]}>
            <Text style={[styles.chipText, selectedId === ALL && styles.chipTextOn]}>Todos</Text>
          </Pressable>
          {reports.map((r) => (
            <Pressable
              key={r.employeeId}
              onPress={() => setSelectedId(r.employeeId)}
              style={[styles.chip, selectedId === r.employeeId && styles.chipOn]}
            >
              <Text style={[styles.chipText, selectedId === r.employeeId && styles.chipTextOn]}>
                {r.employeeName}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <View style={styles.actionButton}>
            <Button
              label="Exportar CSV"
              variant="secondary"
              onPress={() => handleExport("csv")}
              loading={exporting}
              disabled={loading || selected.length === 0}
            />
          </View>
          <View style={styles.actionButton}>
            <Button
              label="Exportar PDF"
              onPress={() => handleExport("pdf")}
              loading={exporting}
              disabled={loading || selected.length === 0}
            />
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>
          {selectedId === ALL ? "Relatório de todos os funcionários" : "Relatório"}
        </Text>
        <Text style={styles.muted}>
          É exatamente o conteúdo que sai no PDF e no CSV — a exportação não traz nada a mais.
        </Text>

        {loading ? <Text style={styles.muted}>Carregando…</Text> : null}
        {!loading && selected.length === 0 ? (
          <Text style={styles.muted}>Sem marcações no período</Text>
        ) : null}

        {!loading && selected.length > 0 ? <ReportPreview reports={selected} /> : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  card: { gap: 12 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  dateField: { gap: 4, minWidth: 180 },
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
  chipOn: { backgroundColor: colors.chipSelected, borderColor: colors.chipSelected },
  chipText: { fontSize: 15, color: colors.textMuted },
  chipTextOn: { color: colors.chipSelectedText, fontWeight: "600" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  actionButton: { flex: 1, minWidth: 180 },
  error: { fontSize: 16, color: colors.danger },
  muted: { fontSize: 16, color: colors.textMuted },
});
