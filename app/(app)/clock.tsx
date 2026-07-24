import { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { Card } from "../../components/ui/Card";
import { ClockButton } from "../../components/clock/ClockButton";
import { LocationBadge } from "../../components/clock/LocationBadge";
import { captureLocation } from "../../features/capture/useLocation";
import { capturePhoto } from "../../features/capture/useCameraCapture";
import { createPunch, fetchLastPunchToday, nextPunchType } from "../../features/punches/punchService";
import { useSession } from "../../features/auth/useSession";
import type { Punch, PunchType } from "../../types/domain";

export default function ClockScreen() {
  const { profile } = useSession();
  const [lastPunch, setLastPunch] = useState<Punch | null>(null);
  const [loadingLast, setLoadingLast] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "capturing" | "captured" | "unavailable">("idle");
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao bater ponto");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ClockButton nextType={nextType} onPress={handlePunch} loading={submitting} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16, justifyContent: "center" },
  card: { gap: 16 },
  greeting: { fontSize: 20, fontWeight: "700", color: "#111827" },
  lastPunch: { fontSize: 14, color: "#6b7280" },
  photoPreview: { width: 96, height: 96, borderRadius: 8, alignSelf: "center" },
  error: { color: "#dc2626" },
});
