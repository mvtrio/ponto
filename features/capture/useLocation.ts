import * as Location from "expo-location";

export interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
}

/**
 * Best-effort: nunca lança erro e nunca trava. Falha de GPS não deve bloquear a marcação
 * de ponto, apenas resulta em location = null (sinalizado na UI).
 *
 * O timeout cobre TAMBÉM o pedido de permissão, não só a obtenção da posição. No
 * navegador, `requestForegroundPermissionsAsync` abre o popup de localização do Chrome e
 * só resolve quando o usuário responde — se ele ignorar ou deixar o popup de lado, o
 * await ficava pendurado para sempre e a marcação nunca chegava a ser gravada.
 */
export async function captureLocation(timeoutMs = 8000): Promise<CapturedLocation | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));

  async function locate(): Promise<CapturedLocation | null> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
      accuracyM: result.coords.accuracy,
    };
  }

  try {
    return await Promise.race([locate(), timeout]);
  } catch (err) {
    console.warn("Falha ao obter localização:", err);
    return null;
  }
}
