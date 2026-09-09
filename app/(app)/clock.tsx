import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../../components/ui/Button";
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
import { appDaysAgo, appTime } from "../../lib/appDate";
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

export default function ClockScreen() {
  const { profile } = useSession();
  const [todayPunches, setTodayPunches] = useState<Punch[]>([]);
  const [loadingLast, setLoadingLast] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "capturing" | "captured" | "unavailable">("idle");
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bankRefreshKey, setBankRefreshKey] = useState(0);

  const [fromDate, toDate] = useMemo(() => [appDaysAgo(BANK_WINDOW_DAYS - 1), appDaysAgo(0)], []);

  const { balanceMinutes, loading: loadingBalance, error: balanceError } = useHourBank(
    profile?.id,
    bankRefreshKey
  );
  const { totalMinutes: overtimeTotal, error: overtimeError } = usePeriodOvertimeTotal(
    profile?.id,
    fromDate,
    toDate,
    bankRefreshKey
  );
  const { rows: bankRows, loading: loadingBank, error: bankError } = useDetailedDayRows(
    profile?.id,
    fromDate,
    toDate,
    bankRefreshKey
  );

  // Falha em qualquer uma das consultas do banco de horas precisa aparecer: um saldo
  // zerado por erro de rede seria lido como saldo real.
  const bankLoadError = bankError ?? balanceError ?? overtimeError;

  const balance = balanceMinutes ?? 0;
  const balanceColor = balance >= 0 ? colors.success : colors.danger;
  const pendingDays = bankRows.filter((row) => row.hasPending).length;

  const reloadTodayPunches = useCallback(async () => {
    if (!profile) return;
    setLoadingLast(true);
    setLoadError(null);
    try {
      setTodayPunches(await fetchTodayPunches(profile.id));
    } catch (err) {
      // Sem saber o que já foi marcado hoje, oferecer o botão é perigoso: era assim que
      // uma falha de carregamento virava marcação duplicada.
      setTodayPunches([]);
      setLoadError(
        err instanceof Error
          ? `Não foi possível carregar as marcações de hoje: ${err.message}`
          : "Não foi possível carregar as marcações de hoje."
      );
    } finally {
      setLoadingLast(false);
    }
  }, [profile]);

  useEffect(() => {
    reloadTodayPunches();
  }, [reloadTodayPunches]);

  // Enquanto o dia não carregou (ou falhou), não há próxima marcação confiável.
  const nextType = loadError || loadingLast ? null : nextPunchType(todayPunches);
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
          <ClockButton
            nextType={nextType}
            onPress={handlePunch}
            loading={submitting}
            blockedLabel={loadError ? "Indisponível" : loadingLast ? "Carregando…" : undefined}
          />
        </View>

        {loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{loadError}</Text>
            <Text style={styles.errorBoxHint}>
              O botão fica bloqueado até carregar, para não registrar uma marcação duplicada.
            </Text>
            <Button label="Tentar de novo" variant="secondary" onPress={reloadTodayPunches} />
          </View>
        ) : null}

        <Text style={styles.lastPunch}>
          {loadError
            ? "—"
            : loadingLast
            ? "Carregando última marcação…"
            : lastPunch
            ? `Última marcação hoje: ${PUNCH_LABELS[lastPunch.type as ActivePunchType] ?? lastPunch.type} às ${appTime(
                lastPunch.occurred_at
              )}`
            : "Nenhuma marcação hoje ainda"}
        </Text>
        {!loadingLast && !loadError && !nextType ? (
          <Text style={styles.dayClosed}>Entrada e saída de hoje já registradas.</Text>
        ) : null}

        {pendingToday.length > 0 ? (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingTitle}>Aguardando aprovação do administrador</Text>
            {pendingToday.map((punch) => (
              <Text key={punch.id} style={styles.pendingItem}>
                • {PUNCH_TYPE_LABELS[punch.type]} às {appTime(punch.occurred_at)}
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
              {loadingBalance ? "…" : balanceError ? "—" : formatMinutes(balance)}
            </Text>
          </View>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Horas extras no período</Text>
            <Text style={[styles.totalValue, { color: colors.success }]}>
              {overtimeTotal === null ? "—" : formatMinutes(overtimeTotal)}
            </Text>
          </View>
        </View>

        {bankLoadError ? <Text style={styles.errorBoxText}>{bankLoadError}</Text> : null}

        {pendingDays > 0 ? (
          <Text style={styles.bankPendingNote}>
            {pendingDays === 1 ? "1 dia aguarda" : `${pendingDays} dias aguardam`} aprovação do administrador e
            ainda não entra{pendingDays === 1 ? "" : "m"} no saldo.
          </Text>
        ) : null}

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
  bankPendingNote: { fontSize: 17, color: colors.warning },
  errorBox: {
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surfaceAlt,
  },
  errorBoxText: { fontSize: 16, color: colors.danger },
  errorBoxHint: { fontSize: 13, color: colors.textMuted },
});
