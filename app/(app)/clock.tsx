import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ClockButton } from "../../components/clock/ClockButton";
import { LocationBadge } from "../../components/clock/LocationBadge";
import { PunchDateTimeSelector } from "../../components/clock/PunchDateTimeSelector";
import { PunchHistoryList } from "../../components/history/PunchHistoryList";
import { captureLocation } from "../../features/capture/useLocation";
import { capturePhoto } from "../../features/capture/useCameraCapture";
import { createPunch, fetchPunchesForDay, nextPunchType } from "../../features/punches/punchService";
import { usePunchHistory } from "../../features/punches/usePunchHistory";
import { useHourBank } from "../../features/hours/useHourBank";
import { usePeriodOvertimeTotal } from "../../features/hours/useIndicators";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";
import { appDate, appDaysAgo, appToday } from "../../lib/appDate";
import { formatMinutes, type ActivePunchType, type Punch } from "../../types/domain";

const CONFIRM_LABELS: Record<ActivePunchType, string> = {
  clock_in: "Entrada registrada! Aguardando aprovação do administrador.",
  clock_out: "Saída registrada! Aguardando aprovação do administrador.",
};

/** Janela do resumo e dos últimos registros mostrados na tela inicial. */
const WINDOW_DAYS = 30;

export default function ClockScreen() {
  const { profile } = useSession();

  // `selectedAt` nulo = acompanhando o relógio. Assim que o funcionário ajusta, o valor
  // congela no horário escolhido.
  const [selectedAt, setSelectedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());

  const [dayPunches, setDayPunches] = useState<Punch[]>([]);
  const [loadingDay, setLoadingDay] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "capturing" | "captured" | "unavailable">("idle");
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const punchAt = selectedAt ?? now;
  const selectedDay = appDate(punchAt);
  const isToday = selectedDay === appToday();

  const [fromDate, toDate] = useMemo(() => [appDaysAgo(WINDOW_DAYS - 1), appDaysAgo(0)], []);
  const { balanceMinutes, loading: loadingBalance, error: balanceError } = useHourBank(profile?.id, refreshKey);
  const { totalMinutes: overtimeTotal, error: overtimeError } = usePeriodOvertimeTotal(
    profile?.id,
    fromDate,
    toDate,
    refreshKey
  );
  const history = usePunchHistory(profile?.id, WINDOW_DAYS, refreshKey);

  // As marcações do DIA SELECIONADO decidem a próxima: se o funcionário voltar para um
  // dia em que já bateu a entrada, o botão precisa oferecer a saída daquele dia.
  const reloadDay = useCallback(async () => {
    if (!profile) return;
    setLoadingDay(true);
    setLoadError(null);
    try {
      setDayPunches(await fetchPunchesForDay(profile.id, selectedDay));
    } catch (err) {
      setDayPunches([]);
      setLoadError(
        err instanceof Error
          ? `Não foi possível carregar as marcações do dia: ${err.message}`
          : "Não foi possível carregar as marcações do dia."
      );
    } finally {
      setLoadingDay(false);
    }
  }, [profile, selectedDay]);

  useEffect(() => {
    reloadDay();
  }, [reloadDay]);

  const nextType = loadError || loadingDay ? null : nextPunchType(dayPunches);

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
        occurredAt: punchAt,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        locationAccuracyM: location?.accuracyM ?? null,
        photoUri,
        source: "mobile",
      });

      setSelectedAt(null);
      await reloadDay();
      setRefreshKey((key) => key + 1);
      setSuccessMessage(CONFIRM_LABELS[nextType]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao bater ponto");
    } finally {
      setSubmitting(false);
    }
  }

  const balance = balanceMinutes ?? 0;
  const balanceColor = balance >= 0 ? colors.success : colors.danger;
  const bankError = balanceError ?? overtimeError ?? history.error;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.greeting}>Olá, {profile?.full_name || "funcionário"}</Text>

        <PunchDateTimeSelector
          value={punchAt}
          onChange={setSelectedAt}
          isNow={selectedAt === null}
          onResetToNow={() => setSelectedAt(null)}
        />

        <View style={styles.punchButton}>
          <ClockButton
            nextType={nextType}
            onPress={handlePunch}
            loading={submitting}
            blockedLabel={
              loadError
                ? "Indisponível"
                : loadingDay
                ? "Carregando…"
                : isToday
                ? "Ponto do dia concluído"
                : "Dia já tem entrada e saída"
            }
          />
        </View>

        {loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{loadError}</Text>
            <Text style={styles.errorBoxHint}>
              O botão fica bloqueado até carregar, para não registrar uma marcação duplicada.
            </Text>
            <Button label="Tentar de novo" variant="secondary" onPress={reloadDay} />
          </View>
        ) : null}

        {!isToday && !loadError ? (
          <Text style={styles.pastNotice}>
            Registrando em um dia anterior. O administrador vê a data escolhida ao aprovar.
          </Text>
        ) : null}

        {/* No web não há captura de localização, então o aviso só confundiria. */}
        {Platform.OS === "web" ? null : <LocationBadge status={locationStatus} />}

        {lastPhotoUri ? <Image source={{ uri: lastPhotoUri }} style={styles.photoPreview} /> : null}

        {successMessage ? <Text style={styles.success}>✓ {successMessage}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Banco de horas</Text>
        <View style={styles.totalsRow}>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Saldo acumulado</Text>
            <Text style={[styles.totalValue, { color: balanceColor }]}>
              {loadingBalance ? "…" : balanceError ? "—" : formatMinutes(balance)}
            </Text>
          </View>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Horas extras ({WINDOW_DAYS} dias)</Text>
            <Text style={[styles.totalValue, { color: colors.success }]}>
              {overtimeTotal === null ? "—" : formatMinutes(overtimeTotal)}
            </Text>
          </View>
        </View>
        {bankError ? <Text style={styles.error}>{bankError}</Text> : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Últimos registros</Text>
        <PunchHistoryList punches={history.punches} loading={history.loading} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  card: { gap: 14 },
  greeting: { fontSize: 20, fontWeight: "700", color: colors.text },
  sectionTitle: { fontSize: 26, fontWeight: "700", color: colors.text },
  // Botão centralizado e estreito: não precisa ocupar a largura toda da tela.
  punchButton: { alignSelf: "center", width: "100%", maxWidth: 320 },
  pastNotice: { fontSize: 16, color: colors.warning, textAlign: "center" },
  photoPreview: { width: 96, height: 96, borderRadius: 8, alignSelf: "center" },
  error: { fontSize: 16, color: colors.danger },
  success: { fontSize: 17, color: colors.success, fontWeight: "600" },
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
  totalsRow: { flexDirection: "row", flexWrap: "wrap", gap: 32 },
  total: { gap: 4 },
  totalLabel: { fontSize: 17, color: colors.textMuted },
  totalValue: { fontSize: 44, fontWeight: "700" },
});
