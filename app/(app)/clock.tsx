import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ClockButton } from "../../components/clock/ClockButton";
import { LocationBadge } from "../../components/clock/LocationBadge";
import { PunchDateTimeSelector } from "../../components/clock/PunchDateTimeSelector";
import { PunchHistoryList } from "../../components/history/PunchHistoryList";
import { captureLocation } from "../../features/capture/useLocation";
import { capturePhoto } from "../../features/capture/useCameraCapture";
import { createPunch, fetchPunchesForDay, nextPunchType } from "../../features/punches/punchService";
import { canPunchOnDay, daysMissingClockOut } from "../../features/punches/punchRules";
import { useCompanySettings } from "../../features/company/useCompanySettings";
import { usePunchHistory } from "../../features/punches/usePunchHistory";
import { useHourBank } from "../../features/hours/useHourBank";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";
import { appDate, appToday, startOfAppDay } from "../../lib/appDate";
import { weekdayName } from "../../components/ui/weekdayNames";
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
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const punchAt = selectedAt ?? now;
  const selectedDay = appDate(punchAt);
  const isToday = selectedDay === appToday();

  const {
    debitMinutes,
    overtimeMinutes,
    loading: loadingBalance,
    error: balanceError,
  } = useHourBank(profile?.id, refreshKey);
  const history = usePunchHistory(profile?.id, WINDOW_DAYS, refreshKey);
  const { settings, loading: loadingSettings, error: settingsError } = useCompanySettings();

  // Sem a escala carregada não dá para afirmar que o dia permite marcação, e supor que
  // permite deixaria passar justamente o ponto de fim de semana que a regra proíbe.
  const isWorkDay = settings ? canPunchOnDay(selectedDay, settings.work_week_days) : false;

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

  const nextType =
    loadError || loadingDay || loadingSettings || !isWorkDay ? null : nextPunchType(dayPunches);

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

  /** Recarrega tudo que a tela mostra: marcações do dia, saldo, extras e histórico. */
  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await reloadDay();
      // Os hooks do banco de horas e do histórico observam refreshKey.
      setRefreshKey((key) => key + 1);
    } finally {
      setRefreshing(false);
    }
  }

  const bankError = balanceError ?? history.error;

  // Dias passados com entrada e sem saída. Saída pendente de aprovação já conta como
  // registrada — quem precisa agir nesse caso é o admin, não ela.
  const missingClockOut = daysMissingClockOut(history.punches, appToday());

  /** Leva o seletor para o dia pendente, às 18:00, para ela só ajustar e confirmar. */
  function goToMissingDay(day: string) {
    setSelectedAt(new Date(Date.parse(startOfAppDay(day)) + 18 * 60 * 60_000));
    setSuccessMessage(null);
    setError(null);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        {/* O nome de quem está conectado agora fica no cabeçalho, em HeaderUserBar. */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={handleRefresh}
            disabled={refreshing}
            style={({ pressed }) => [styles.refreshButton, (pressed || refreshing) && styles.refreshButtonActive]}
            accessibilityRole="button"
            accessibilityLabel="Atualizar informações da tela"
          >
            {refreshing ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Ionicons name="refresh" size={26} color={colors.accent} />
            )}
            <Text style={styles.refreshText}>{refreshing ? "Atualizando…" : "Atualizar"}</Text>
          </Pressable>
        </View>

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
              loadError || settingsError
                ? "Indisponível"
                : loadingDay || loadingSettings
                ? "Carregando…"
                : !isWorkDay
                ? "Não é dia de trabalho"
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

        {missingClockOut.length > 0 ? (
          <View style={styles.missingBox}>
            <Text style={styles.missingTitle}>Saída não registrada</Text>
            {missingClockOut.map((day) => {
              const [, mm, dd] = day.split("-");
              return (
                <View key={day} style={styles.missingRow}>
                  <Text style={styles.missingItem}>
                    Você não registrou a saída de {weekdayName(day)}, {dd}/{mm}. Realize o registro.
                  </Text>
                  <Button
                    label={`Registrar saída de ${dd}/${mm}`}
                    variant="secondary"
                    onPress={() => goToMissingDay(day)}
                  />
                </View>
              );
            })}
          </View>
        ) : null}

        {!isWorkDay && !loadingSettings && !settingsError ? (
          <Text style={styles.weekendNotice}>
            Fim de semana não tem expediente — a marcação de ponto fica disponível de segunda a sexta.
          </Text>
        ) : null}

        {settingsError ? <Text style={styles.error}>{settingsError}</Text> : null}

        {isWorkDay && !isToday && !loadError ? (
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
            <Text style={styles.totalLabel}>Débito acumulado</Text>
            <Text style={[styles.totalValue, { color: colors.danger }]}>
              {loadingBalance ? "…" : debitMinutes === null ? "—" : formatMinutes(debitMinutes)}
            </Text>
          </View>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Horas extras</Text>
            <Text style={[styles.totalValue, { color: colors.success }]}>
              {loadingBalance ? "…" : overtimeMinutes === null ? "—" : formatMinutes(overtimeMinutes)}
            </Text>
          </View>
        </View>
        {/* Os dois lados andam separados até o fechamento; dizer isso evita a pergunta
            "por que não descontaram minhas extras?". */}
        <Text style={styles.bankHint}>
          As horas extras abatem o débito no fechamento do mês.
        </Text>
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
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  refreshButtonActive: { opacity: 0.6 },
  refreshText: { fontSize: 17, fontWeight: "600", color: colors.accent },
  sectionTitle: { fontSize: 26, fontWeight: "700", color: colors.text },
  // Botão centralizado e estreito: não precisa ocupar a largura toda da tela.
  punchButton: { alignSelf: "center", width: "100%", maxWidth: 320 },
  pastNotice: { fontSize: 16, color: colors.warning, textAlign: "center" },
  weekendNotice: { fontSize: 16, color: colors.textMuted, textAlign: "center" },
  missingBox: {
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.surfaceAlt,
  },
  missingTitle: { fontSize: 18, fontWeight: "700", color: colors.warning },
  missingRow: { gap: 8 },
  missingItem: { fontSize: 17, color: colors.text },
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
  bankHint: { fontSize: 15, color: colors.textFaint },
});
