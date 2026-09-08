import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../../components/ui/Card";
import { ClockButton } from "../../components/clock/ClockButton";
import { LocationBadge } from "../../components/clock/LocationBadge";
import { DetailedPunchesTable } from "../../components/history/DetailedPunchesTable";
import { captureLocation } from "../../features/capture/useLocation";
import { capturePhoto } from "../../features/capture/useCameraCapture";
import { createPunch, fetchLastPunchToday, nextPunchType } from "../../features/punches/punchService";
import { useDetailedDayRows } from "../../features/hours/useDetailedDayRows";
import { useHourBank } from "../../features/hours/useHourBank";
import { usePeriodOvertimeTotal } from "../../features/hours/useIndicators";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";
import { formatMinutes, type Punch, type PunchType } from "../../types/domain";

const CONFIRM_LABELS: Record<PunchType, string> = {
  clock_in: "Entrada registrada com sucesso!",
  break_start: "Início do intervalo registrado!",
  break_end: "Fim do intervalo registrado!",
  clock_out: "Saída registrada com sucesso!",
};

/** Janela padrão do banco de horas exibido na tela inicial do funcionário. */
const BANK_WINDOW_DAYS = 30;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function ClockScreen() {
  const { profile } = useSession();
  const [lastPunch, setLastPunch] = useState<Punch | null>(null);
  const [loadingLast, setLoadingLast] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "capturing" | "captured" | "unavailable">("idle");
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bankRefreshKey, setBankRefreshKey] = useState(0);

  const [fromDate, toDate] = useMemo(() => [isoDaysAgo(BANK_WINDOW_DAYS - 1), isoDaysAgo(0)], []);

  const { balanceMinutes, loading: loadingBalance } = useHourBank(profile?.id, bankRefreshKey);
  const { totalMinutes: overtimeTotal } = usePeriodOvertimeTotal(profile?.id, fromDate, toDate, bankRefreshKey);
  const { rows: bankRows, loading: loadingBank } = useDetailedDayRows(
    profile?.id,
    fromDate,
    toDate,
    bankRefreshKey
  );

  const balance = balanceMinutes ?? 0;
  const balanceColor = balance >= 0 ? colors.success : colors.danger;

  const reloadLastPunch = useCallback(async () => {
    if (!profile) return;
    setLoadingLast(true);
    try {
      const punch = await fetchLastPunchToday(profile.id);
      setLastPunch(punch);
    } finally {
      setLoadingLast(false);
    }
  }, [profile]);

  useEffect(() => {
    reloadLastPunch();
  }, [reloadLastPunch]);

  const nextType: PunchType = nextPunchType(lastPunch?.type ?? null);

  async function handlePunch() {
    if (!profile) return;
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    setLocationStatus("capturing");
    try {
      const location = await captureLocation();
      setLocationStatus(location ? "captured" : "unavailable");

      const photoUri = await capturePhoto();
      setLastPhotoUri(photoUri);

      await createPunch({
        employeeId: profile.id,
        type: nextType,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        locationAccuracyM: location?.accuracyM ?? null,
        photoUri,
        source: "mobile",
      });

      await reloadLastPunch();
      setBankRefreshKey((key) => key + 1);
      setSuccessMessage(CONFIRM_LABELS[nextType]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao bater ponto");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.greeting}>Olá, {profile?.full_name || "funcionário"}</Text>
        <Text style={styles.lastPunch}>
          {loadingLast
            ? "Carregando última marcação…"
            : lastPunch
            ? `Última marcação hoje: ${lastPunch.type} às ${new Date(lastPunch.occurred_at).toLocaleTimeString()}`
            : "Nenhuma marcação hoje ainda"}
        </Text>

        <LocationBadge status={locationStatus} />

        {lastPhotoUri ? <Image source={{ uri: lastPhotoUri }} style={styles.photoPreview} /> : null}

        {successMessage ? <Text style={styles.success}>✓ {successMessage}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ClockButton nextType={nextType} onPress={handlePunch} loading={submitting} />
      </Card>

      <Card style={styles.bankCard}>
        <View style={styles.bankHeader}>
          <Text style={styles.bankTitle}>Banco de horas</Text>
          <Text style={styles.bankPeriod}>Últimos {BANK_WINDOW_DAYS} dias</Text>
        </View>

        <View style={styles.totalsRow}>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Saldo acumulado</Text>
            <Text style={[styles.totalValue, { color: balanceColor }]}>
              {loadingBalance ? "…" : formatMinutes(balance)}
            </Text>
          </View>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Horas extras no período</Text>
            <Text style={[styles.totalValue, { color: colors.success }]}>{formatMinutes(overtimeTotal)}</Text>
          </View>
        </View>

        {loadingBank ? (
          <Text style={styles.bankLoading}>Carregando banco de horas…</Text>
        ) : (
          <DetailedPunchesTable rows={bankRows} loading={loadingBank} />
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  card: { gap: 16 },
  greeting: { fontSize: 20, fontWeight: "700", color: colors.text },
  lastPunch: { fontSize: 14, color: colors.textMuted },
  photoPreview: { width: 96, height: 96, borderRadius: 8, alignSelf: "center" },
  error: { color: colors.danger },
  success: { color: colors.success, fontWeight: "600" },
  bankCard: { gap: 16 },
  bankHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  bankTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  bankPeriod: { fontSize: 12, color: colors.textFaint },
  totalsRow: { flexDirection: "row", flexWrap: "wrap", gap: 24 },
  total: { gap: 2 },
  totalLabel: { fontSize: 12, color: colors.textMuted },
  totalValue: { fontSize: 26, fontWeight: "700" },
  bankLoading: { color: colors.textMuted },
});
