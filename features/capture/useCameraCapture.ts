import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

// No web, a permissão/captura de câmera pode nunca resolver (sem hardware, prompt
// bloqueado, incompatibilidade do navegador) — sem timeout, a marcação de ponto ficaria
// "processando" para sempre. No nativo isso não acontece, então só protegemos o web.
const WEB_CAPTURE_TIMEOUT_MS = 15000;

function withWebTimeout<T>(promise: Promise<T>): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), WEB_CAPTURE_TIMEOUT_MS)),
  ]);
}

/**
 * Foto é obrigatória no nativo; no web, best-effort (câmera pode não existir/permissão
 * pode ser negada ou travar em desktop — nesse caso retorna null e a marcação segue sem foto).
 */
export async function capturePhoto(): Promise<string | null> {
  try {
    const permission =
      Platform.OS === "web"
        ? await withWebTimeout(ImagePicker.requestCameraPermissionsAsync())
        : await ImagePicker.requestCameraPermissionsAsync();

    if (!permission || permission.status !== "granted") {
      if (Platform.OS === "web") return null;
      throw new Error("Permissão de câmera negada. A foto é obrigatória para bater o ponto.");
    }

    const result =
      Platform.OS === "web"
        ? await withWebTimeout(
            ImagePicker.launchCameraAsync({ quality: 0.5, base64: false, allowsEditing: false })
          )
        : await ImagePicker.launchCameraAsync({ quality: 0.5, base64: false, allowsEditing: false });

    if (!result || result.canceled || !result.assets?.length) {
      if (Platform.OS === "web") return null;
      throw new Error("Captura de foto cancelada.");
    }

    return result.assets[0].uri;
  } catch (err) {
    if (Platform.OS === "web") {
      console.warn("Falha ao capturar foto no web, seguindo sem foto:", err);
      return null;
    }
    throw err;
  }
}
