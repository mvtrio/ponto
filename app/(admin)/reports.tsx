import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { fetchEmployees } from "../../features/admin/adminService";
import { exportCsv } from "../../features/export/csvExport";
import { exportPdf } from "../../features/export/pdfExport";
import { fetchDailySummaries } from "../../features/hours/hoursService";
import type { Profile } from "../../types/domain";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function ReportsScreen() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(isoDaysAgo(30));
  const [toDate, setToDate] = useState(isoDaysAgo(0));
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees()
      .then((data) => {
        setEmployees(data);
        if (data.length) setSelectedId(data[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar funcionários"));
  }, []);

  async function handleExport(format: "csv" | "pdf") {
    if (!selectedId) return;
    const employee = employees.find((e) => e.id === selectedId);
    if (!employee) return;

    setError(null);
    setExporting(true);
    try {
      const rows = await fetchDailySummaries(selectedId, fromDate, toDate);
      if (format === "csv") {
        await exportCsv(rows, employee.full_name);
      } else {
        await exportPdf(rows, employee.full_name, fromDate, toDate);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao exportar relatório");
    } finally {
      setExporting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.label}>Funcionário</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.employeeList}>
          {employees.map((e) => (
            <Text
              key={e.id}
              onPress={() => setSelectedId(e.id)}
              style={[styles.employeeChip, selectedId === e.id && styles.employeeChipSelected]}
            >
              {e.full_name}
            </Text>
          ))}
        </ScrollView>

        <Text style={styles.label}>De</Text>
        <TextInput style={styles.input} value={fromDate} onChangeText={setFromDate} placeholder="AAAA-MM-DD" />
        <Text style={styles.label}>Até</Text>
        <TextInput style={styles.input} value={toDate} onChangeText={setToDate} placeholder="AAAA-MM-DD" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <View style={styles.actionButton}>
            <Button label="Exportar CSV" variant="secondary" onPress={() => handleExport("csv")} loading={exporting} />
          </View>
          <View style={styles.actionButton}>
            <Button label="Exportar PDF" onPress={() => handleExport("pdf")} loading={exporting} />
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16 },
  card: { gap: 8 },
  label: { fontSize: 13, color: "#6b7280", marginTop: 8 },
  employeeList: { flexDirection: "row" },
  employeeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
    marginRight: 8,
    color: "#111827",
    fontSize: 13,
    overflow: "hidden",
  },
  employeeChipSelected: { backgroundColor: "#2563eb", color: "#fff" },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  error: { color: "#dc2626" },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionButton: { flex: 1 },
});
