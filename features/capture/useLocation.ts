import * as Location from "expo-location";

export interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
}

/**
 * Best-effort: nunca lança erro. Falha de GPS não deve bloquear a marcação de ponto,
 * apenas resulta em location = null (sinalizado na UI).
 */
export async function captureLocation(timeoutMs = 8000): Promise<CapturedLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const result = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);

    if (!result) return null;

    return {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
      accuracyM: result.coords.accuracy,
    };
  } catch (err) {
    console.warn("Falha ao obter localização:", err);
    return null;
  }
}
