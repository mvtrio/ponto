import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CumulativeBalanceChart } from "../../components/charts/CumulativeBalanceChart";
import { DailyBalanceChart } from "../../components/charts/DailyBalanceChart";
import { DonutChart } from "../../components/charts/DonutChart";
import { MonthlyTotalsChart } from "../../components/charts/MonthlyTotalsChart";
import { ProgressBar } from "../../components/charts/ProgressBar";
import { Card } from "../../components/ui/Card";
import { fetchDashboardData, type DashboardData } from "../../features/admin/dashboardService";
import { colors } from "../../lib/theme";
import { formatMinutes } from "../../types/domain";

function formatPercent(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

const SLICE_COLOR: Record<string, string> = {
  worked: colors.success,
  absent: colors.danger,
  justified: colors.accent,
  incomplete: colors.warning,
  pending: "#9b8cff",
};

const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function shortMonth(month: string): string {
  return MONTH_SHORT[Number(month.slice(5, 7)) - 1] ?? month;
}

/** Cartão de pendência: só aparece em destaque quando há algo a fazer. */
function ActionCard({
  icon,
  label,
  count,
  href,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  href: string;
  tone: string;
}) {
  const active = count > 0;
  const color = active ? tone : colors.textFaint;

  return (
    <Pressable
      style={[styles.actionCard, active && { borderColor: color }]}
      onPress={() => router.push(href as never)}
    >
      <Ionicons name={icon} size={26} color={color} />
      <Text style={[styles.actionCount, { color }]}>{count}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        setLoading(true);
        setError(null);
        try {
          const result = await fetchDashboardData();
          if (!cancelled) setData(result);
        } catch (err) {
          // Zera o painel em vez de manter números velhos na tela: um indicador
          // desatualizado sem aviso é pior que um painel vazio com erro.
          if (!cancelled) {
            setData(null);
            setError(err instanceof Error ? err.message : "Erro ao carregar o painel");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      load();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Carregando o painel…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
        <Text style={styles.error}>{error ?? "Não foi possível carregar o painel."}</Text>
      </View>
    );
  }

  const { metrics } = data;
  const closingPending = data.unclosedEmployees.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Precisa da sua atenção</Text>
        <View style={styles.actionRow}>
          <ActionCard
            icon="time-outline"
            label="Pontos a aprovar"
            count={data.pendingApprovals}
            href="/(admin)/approvals"
            tone={colors.warning}
          />
          <ActionCard
            icon="alert-circle-outline"
            label="Dias incompletos"
            count={metrics.incompleteDays}
            href="/(admin)/overview"
            tone={colors.warning}
          />
          <ActionCard
            icon="close-circle-outline"
            label={`Faltas em ${data.monthLabel.split("/")[0].toLowerCase()}`}
            count={metrics.absentDays}
            href="/(admin)/overview"
            tone={colors.danger}
          />
          <ActionCard
            icon="lock-closed-outline"
            label={`${data.previousMonthLabel} a fechar`}
            count={closingPending}
            href="/(admin)/closing"
            tone={colors.accent}
          />
        </View>
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Banco de horas acumulado</Text>
        <View style={styles.bigRow}>
          <View style={styles.bigBox}>
            <Text style={styles.bigLabel}>Débito</Text>
            <Text style={[styles.bigValue, { color: colors.danger }]}>
              {formatMinutes(data.totalDebitMinutes)}
            </Text>
          </View>
          <View style={styles.bigBox}>
            <Text style={styles.bigLabel}>Horas extras</Text>
            <Text style={[styles.bigValue, { color: colors.success }]}>
              {formatMinutes(data.totalOvertimeMinutes)}
            </Text>
          </View>
        </View>
        <Text style={styles.hint}>
          Os dois lados só se encontram no fechamento do mês.
        </Text>

        {data.employees.map((employee) => (
          <Pressable
            key={employee.id}
            style={styles.employeeRow}
            onPress={() => router.push(`/(admin)/employees/${employee.id}`)}
          >
            <Text style={styles.employeeName}>{employee.fullName}</Text>
            <Text style={[styles.employeeValue, { color: colors.danger }]}>
              {employee.debitMinutes === null ? "—" : formatMinutes(employee.debitMinutes)}
            </Text>
            <Text style={[styles.employeeValue, { color: colors.success }]}>
              {employee.overtimeMinutes === null ? "—" : formatMinutes(employee.overtimeMinutes)}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
          </Pressable>
        ))}
        {data.employees.length === 0 ? (
          <Text style={styles.hint}>Nenhum funcionário ativo</Text>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>{data.monthLabel}</Text>
        <View style={styles.metricsGrid}>
          <Metric label="Dias trabalhados" value={String(metrics.workedDays)} color={colors.success} />
          <Metric label="Faltas" value={String(metrics.absentDays)} color={colors.danger} />
          <Metric label="Atestado/folga" value={String(metrics.justifiedDays)} color={colors.accent} />
          <Metric label="Aguardando" value={String(metrics.pendingDays)} color={colors.warning} />
          <Metric label="Horas trabalhadas" value={formatMinutes(metrics.workedMinutes)} />
          <Metric label="Jornada prevista" value={formatMinutes(metrics.expectedMinutes)} />
          <Metric
            label="Assiduidade"
            value={formatPercent(metrics.attendanceRate)}
            color={
              metrics.attendanceRate === null
                ? undefined
                : metrics.attendanceRate >= 1
                  ? colors.success
                  : colors.warning
            }
          />
        </View>
        <Text style={styles.hint}>
          Assiduidade: dias presentes sobre os dias cobrados. Atestado e folga ficam de fora da
          conta, porque não são cobrados.
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Jornada cumprida em {data.monthLabel}</Text>
        <ProgressBar
          workedMinutes={metrics.workedMinutes}
          expectedMinutes={metrics.expectedMinutes}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Composição dos dias em {data.monthLabel}</Text>
        <DonutChart
          centerLabel="dias"
          slices={data.composition.map((slice) => ({
            ...slice,
            color: SLICE_COLOR[slice.key] ?? colors.textMuted,
          }))}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Trajetória do saldo em {data.monthLabel}</Text>
        <CumulativeBalanceChart points={data.cumulativeSeries} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Saldo por dia em {data.monthLabel}</Text>
        <DailyBalanceChart points={data.dailySeries} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Extras e débito por mês</Text>
        <MonthlyTotalsChart
          months={data.monthlyTotals.map((m) => ({
            label: shortMonth(m.month),
            overtimeMinutes: m.overtimeMinutes,
            deficitMinutes: m.deficitMinutes,
          }))}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  block: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: {
    flex: 1,
    minWidth: 150,
    gap: 4,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  actionCount: { fontSize: 30, fontWeight: "700", fontVariant: ["tabular-nums"] },
  actionLabel: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
  card: { gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  bigRow: { flexDirection: "row", gap: 12 },
  bigBox: {
    flex: 1,
    gap: 2,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bigLabel: { fontSize: 14, color: colors.textMuted },
  bigValue: { fontSize: 30, fontWeight: "700", fontVariant: ["tabular-nums"] },
  employeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  employeeName: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  employeeValue: { fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"], minWidth: 70, textAlign: "right" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metric: {
    minWidth: 130,
    flexGrow: 1,
    gap: 2,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: { fontSize: 13, color: colors.textMuted },
  metricValue: { fontSize: 22, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  hint: { fontSize: 14, color: colors.textFaint },
  error: { fontSize: 16, color: colors.danger, textAlign: "center" },
});
