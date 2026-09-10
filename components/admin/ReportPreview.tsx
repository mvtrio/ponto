import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { appWeekday } from "../../lib/appDate";
import { colors } from "../../lib/theme";
import { formatMinutes } from "../../types/domain";
import type { OverviewStatus } from "../../features/admin/punchOverviewRules";
import type { EmployeeReport } from "../../features/export/reportData";

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const STATUS_META: Record<
  OverviewStatus,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  ok: { label: "Completo", color: colors.success, icon: "checkmark-circle" },
  pending: { label: "Aguardando", color: colors.warning, icon: "time" },
  incomplete: { label: "Incompleto", color: colors.warning, icon: "warning" },
  rejected: { label: "Recusada", color: colors.danger, icon: "close-circle" },
};

function formatDay(day: string): string {
  const [, mm, dd] = day.split("-");
  return `${dd}/${mm} (${WEEKDAYS_SHORT[appWeekday(day)]})`;
}

function signed(minutes: number): string {
  return minutes > 0 ? `+${formatMinutes(minutes)}` : formatMinutes(minutes);
}

function Totals({ report }: { report: EmployeeReport }) {
  return (
    <View style={styles.totalsRow}>
      <View style={styles.total}>
        <Text style={styles.totalLabel}>Completos</Text>
        <Text style={styles.totalValue}>{report.daysWorked}</Text>
      </View>
      <View style={styles.total}>
        <Text style={styles.totalLabel}>Incompletos</Text>
        <Text style={[styles.totalValue, report.daysIncomplete > 0 && { color: colors.warning }]}>
          {report.daysIncomplete}
        </Text>
      </View>
      <View style={styles.total}>
        <Text style={styles.totalLabel}>Aguardando</Text>
        <Text style={[styles.totalValue, report.daysPending > 0 && { color: colors.warning }]}>
          {report.daysPending}
        </Text>
      </View>
      <View style={styles.total}>
        <Text style={styles.totalLabel}>Extras</Text>
        <Text style={[styles.totalValue, { color: colors.success }]}>
          {formatMinutes(report.overtimeMinutes)}
        </Text>
      </View>
      <View style={styles.total}>
        <Text style={styles.totalLabel}>Débito</Text>
        <Text style={[styles.totalValue, { color: colors.danger }]}>
          {formatMinutes(report.deficitMinutes)}
        </Text>
      </View>
      <View style={styles.total}>
        <Text style={styles.totalLabel}>Saldo</Text>
        <Text
          style={[
            styles.totalValue,
            styles.totalStrong,
            { color: report.balanceMinutes >= 0 ? colors.success : colors.danger },
          ]}
        >
          {signed(report.balanceMinutes)}
        </Text>
      </View>
    </View>
  );
}

/**
 * Mesmo conteúdo do relatório exportado, na tela: totais por funcionário e o dia a dia
 * com entrada, saída, saldo e situação.
 *
 * As linhas de dia usam layout que quebra em vez de tabela de largura fixa — a tela do
 * admin também é aberta no celular, e obrigar a rolar para o lado só para ler o horário
 * foi justamente a reclamação que motivou refazer a tela do funcionário.
 */
export function ReportPreview({ reports }: { reports: EmployeeReport[] }) {
  return (
    <View style={styles.container}>
      {reports.map((report) => (
        <View key={report.employeeId} style={styles.employeeBlock}>
          <Text style={styles.employeeName}>{report.employeeName}</Text>
          <Totals report={report} />

          <View style={styles.dayList}>
            {report.days.map((day) => {
              const meta = STATUS_META[day.status];
              return (
                <View key={day.key} style={styles.dayRow}>
                  <View style={styles.dayLeft}>
                    <Ionicons name={meta.icon} size={22} color={meta.color} />
                    <Text style={styles.dayLabel}>{formatDay(day.day)}</Text>
                  </View>

                  <Text style={styles.dayTimes}>
                    {day.entrada ?? "—"} <Text style={styles.arrow}>→</Text> {day.saida ?? "—"}
                  </Text>

                  <View style={styles.dayRight}>
                    <Text
                      style={[
                        styles.dayBalance,
                        {
                          color:
                            day.balanceMinutes === null
                              ? colors.textFaint
                              : day.balanceMinutes >= 0
                              ? colors.success
                              : colors.danger,
                        },
                      ]}
                    >
                      {day.balanceMinutes === null ? "—" : signed(day.balanceMinutes)}
                    </Text>
                    <Text style={[styles.dayStatus, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
              );
            })}

            {report.days.length === 0 ? (
              <Text style={styles.empty}>Sem marcações no período</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 24 },
  employeeBlock: { gap: 10 },
  employeeName: { fontSize: 20, fontWeight: "700", color: colors.text },
  totalsRow: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  total: { gap: 2, minWidth: 96 },
  totalLabel: { fontSize: 14, color: colors.textMuted },
  totalValue: { fontSize: 20, fontWeight: "600", color: colors.text },
  totalStrong: { fontSize: 22, fontWeight: "700" },
  dayList: { marginTop: 4 },
  dayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayLeft: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 150 },
  dayLabel: { fontSize: 17, color: colors.text },
  dayTimes: { fontSize: 17, color: colors.text, fontVariant: ["tabular-nums"] },
  arrow: { color: colors.textFaint },
  dayRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  dayBalance: { fontSize: 17, fontWeight: "700", fontVariant: ["tabular-nums"] },
  dayStatus: { fontSize: 15, minWidth: 96, textAlign: "right" },
  empty: { fontSize: 16, color: colors.textMuted, paddingVertical: 12 },
});
