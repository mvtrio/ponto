import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../../components/ui/Card";
import { ClockButton } from "../../components/clock/ClockButton";
import { LiveClock } from "../../components/clock/LiveClock";
import { LocationBadge } from "../../components/clock/LocationBadge";
import { DetailedPunchesTable } from "../../components/history/DetailedPunchesTable";
import { captureLocation } from "../../features/capture/useLocation";
import { capturePhoto } from "../../features/capture/useCameraCapture";
import { createPunch, fetchTodayPunches, nextPunchType } from "../../features/punches/punchService";
import { useDetailedDayRows } from "../../features/hours/useDetailedDayRows";
import { useHourBank } from "../../features/hours/useHourBank";
import { usePeriodOvertimeTotal } from "../../features/hours/useIndicators";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";
import {
  PUNCH_TYPE_LABELS,
  formatMinutes,
  type ActivePunchType,
  type Punch,
} from "../../types/domain";

const CONFIRM_LABELS: Record<ActivePunchType, string> = {
  clock_in: "Entrada registrada! Aguardando aprovação do administrador.",
  clock_out: "Saída registrada! Aguardando aprovação do administrador.",
};

const PUNCH_LABELS: Record<ActivePunchType, string> = {
  clock_in: "Entrada",
  clock_out: "Saída",
};

/** Janela padrão do banco de horas exibido na tela inicial do funcionário. */
const BANK_WINDOW_DAYS = 30;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ClockScreen() {
  const { profile } = useSession();
  const [todayPunches, setTodayPunches] = useState<Punch[]>([]);
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

  const reloadTodayPunches = useCallback(async () => {
    if (!profile) return;
    setLoadingLast(true);
    try {
      setTodayPunches(await fetchTodayPunches(profile.id));
    } finally {
      setLoadingLast(false);
    }
  }, [profile]);

  useEffect(() => {
    reloadTodayPunches();
  }, [reloadTodayPunches]);

  const nextType = nextPunchType(todayPunches);
  const lastPunch = todayPunches.length ? todayPunches[todayPunches.length - 1] : null;
  const pendingToday = todayPunches.filter((p) => p.approval_status === "pending");

  async function handlePunch() {
    if (!profile || !nextType) return;
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

      await reloadTodayPunches();
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

        <LiveClock />

        <View style={styles.punchButton}>
          <ClockButton nextType={nextType} onPress={handlePunch} loading={submitting} />
        </View>

        <Text style={styles.lastPunch}>
          {loadingLast
            ? "Carregando última marcação…"
            : lastPunch
            ? `Última marcação hoje: ${PUNCH_LABELS[lastPunch.type as ActivePunchType] ?? lastPunch.type} às ${formatTime(
                lastPunch.occurred_at
              )}`
            : "Nenhuma marcação hoje ainda"}
        </Text>
        {!loadingLast && !nextType ? (
          <Text style={styles.dayClosed}>Entrada e saída de hoje já registradas.</Text>
        ) : null}

        {pendingToday.length > 0 ? (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingTitle}>Aguardando aprovação do administrador</Text>
            {pendingToday.map((punch) => (
              <Text key={punch.id} style={styles.pendingItem}>
                • {PUNCH_TYPE_LABELS[punch.type]} às {formatTime(punch.occurred_at)}
              </Text>
            ))}
            <Text style={styles.pendingHint}>
              Estas marcações só entram no banco de horas depois de aprovadas.
            </Text>
          </View>
        ) : null}

        {/* No web não há captura de localização, então o aviso só confundiria. */}
        {Platform.OS === "web" ? null : <LocationBadge status={locationStatus} />}

        {lastPhotoUri ? <Image source={{ uri: lastPhotoUri }} style={styles.photoPreview} /> : null}

        {successMessage ? <Text style={styles.success}>✓ {successMessage}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
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
  // Botão centralizado e estreito: não precisa ocupar a largura toda da tela.
  punchButton: { alignSelf: "center", width: "100%", maxWidth: 260 },
  lastPunch: { fontSize: 14, color: colors.textMuted },
  dayClosed: { fontSize: 13, color: colors.success },
  pendingBox: {
    gap: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.surfaceAlt,
  },
  pendingTitle: { fontSize: 16, fontWeight: "700", color: colors.warning },
  pendingItem: { fontSize: 16, color: colors.text },
  pendingHint: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  photoPreview: { width: 96, height: 96, borderRadius: 8, alignSelf: "center" },
  error: { color: colors.danger },
  success: { color: colors.success, fontWeight: "600" },
  bankCard: { gap: 16 },
  bankHeader: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline" },
  bankTitle: { fontSize: 26, fontWeight: "700", color: colors.text },
  bankPeriod: { fontSize: 16, color: colors.textFaint },
  totalsRow: { flexDirection: "row", flexWrap: "wrap", gap: 32 },
  total: { gap: 4 },
  totalLabel: { fontSize: 17, color: colors.textMuted },
  totalValue: { fontSize: 44, fontWeight: "700" },
  bankLoading: { fontSize: 18, color: colors.textMuted },
});
