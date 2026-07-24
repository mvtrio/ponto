import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { MiniBarChart } from "../../components/charts/MiniBarChart";
import { MiniLineChart } from "../../components/charts/MiniLineChart";
import { DetailedPunchesTable } from "../../components/history/DetailedPunchesTable";
import { IndicatorCard } from "../../components/history/IndicatorCard";
import { PeriodFilter } from "../../components/history/PeriodFilter";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import type { Granularity } from "../../features/hours/indicatorsService";
import { useBalanceSeries, useOvertimeSeries, usePeriodOvertimeTotal } from "../../features/hours/useIndicators";
import { useDetailedDayRows } from "../../features/hours/useDetailedDayRows";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";
import { formatMinutes } from "../../types/domain";

type ViewMode = "summary" | "full";

const VIEW_OPTIONS: { label: string; value: ViewMode }[] = [
  { label: "Resumido", value: "summary" },
  { label: "Completo", value: "full" },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function BankScreen() {
  const { profile } = useSession();
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [fromDate, setFromDate] = useState(isoDaysAgo(9));
  const [toDate, setToDate] = useState(isoDaysAgo(0));
  const [balanceGranularity, setBalanceGranularity] = useState<Granularity>("day");
  const [overtimeGranularity, setOvertimeGranularity] = useState<Granularity>("day");

  const { points: balancePoints, loading: loadingBalance } = useBalanceSeries(
    profile?.id,
    fromDate,
    toDate,
    balanceGranularity
  );
  const { points: overtimePoints } = useOvertimeSeries(profile?.id, fromDate, toDate, overtimeGranularity);
  const { totalMinutes: overtimeTotal } = usePeriodOvertimeTotal(profile?.id, fromDate, toDate);
  const { rows: detailedRows, loading: loadingDetailed } = useDetailedDayRows(profile?.id, fromDate, toDate);

  const currentBalance = balancePoints.length ? balancePoints[balancePoints.length - 1].value : 0;
  const balanceColor = currentBalance >= 0 ? colors.success : colors.danger;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Central do Funcionário</Text>
        </View>
        <Text style={styles.greeting}>Olá, {profile?.full_name}</Text>
      </View>

      <View style={styles.filterRow}>
        <PeriodFilter fromDate={fromDate} toDate={toDate} onChangeFromDate={setFromDate} onChangeToDate={setToDate} />
        <View style={styles.viewToggle}>
          <SegmentedControl options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />
        </View>
      </View>

      {viewMode === "summary" ? (
        <View style={styles.cardsRow}>
          <IndicatorCard
            title="Saldo do Banco de Horas"
            granularity={balanceGranularity}
            onGranularityChange={setBalanceGranularity}
          >
            <Text style={[styles.headlineValue, { color: balanceColor }]}>
              {loadingBalance ? "…" : formatMinutes(currentBalance)}
            </Text>
            <MiniLineChart points={balancePoints} color={balanceColor} />
          </IndicatorCard>

          <IndicatorCard
            title="Horas Extras"
            granularity={overtimeGranularity}
            onGranularityChange={setOvertimeGranularity}
          >
            <View style={styles.overtimeHeadline}>
              <Ionicons name="time-outline" size={20} color={colors.success} />
              <Text style={styles.overtimeValue}>{formatMinutes(overtimeTotal)}</Text>
            </View>
            <Text style={styles.overtimeHint}>Horas Extras no Período</Text>
            <MiniBarChart points={overtimePoints} color={colors.success} />
          </IndicatorCard>
        </View>
      ) : (
        <DetailedPunchesTable rows={detailedRows} loading={loadingDetailed} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: { fontSize: 13, fontWeight: "700", color: "#1c1c1e" },
  greeting: { fontSize: 14, color: colors.textMuted },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "flex-start" },
  viewToggle: { minWidth: 180 },
  cardsRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  headlineValue: { fontSize: 32, fontWeight: "700" },
  overtimeHeadline: { flexDirection: "row", alignItems: "center", gap: 6 },
  overtimeValue: { fontSize: 24, fontWeight: "700", color: colors.success },
  overtimeHint: { fontSize: 12, color: colors.textFaint },
});
