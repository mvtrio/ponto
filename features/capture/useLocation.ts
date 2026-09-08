import { Platform } from "react-native";
import * as Location from "expo-location";

export interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
}

/**
 * Localização da marcação.
 *
 * No web não há captura: pedir a permissão abre o popup de localização do Chrome, e bater
 * ponto tem que ser um clique e nada mais — mesma decisão já tomada para a foto. Retorna
 * null direto e a marcação é gravada sem localização. No nativo (Android/iOS), onde o GPS
 * é o ponto do recurso, a captura segue normal.
 *
 * Best-effort no nativo: nunca lança erro e nunca trava. O timeout cobre também o pedido
 * de permissão, não só a obtenção da posição — um prompt deixado sem resposta pendurava o
 * await para sempre e a marcação nunca chegava a ser gravada.
 */
export async function captureLocation(timeoutMs = 8000): Promise<CapturedLocation | null> {
  if (Platform.OS === "web") return null;

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
