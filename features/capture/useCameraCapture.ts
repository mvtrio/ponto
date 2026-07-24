import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

/**
 * Foto é obrigatória no nativo; no web, best-effort (câmera pode não existir/permissão
 * pode ser negada em desktop — nesse caso retorna null e a marcação segue sem foto).
 */
export async function capturePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    if (Platform.OS === "web") return null;
    throw new Error("Permissão de câmera negada. A foto é obrigatória para bater o ponto.");
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.5,
    base64: false,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.length) {
    if (Platform.OS === "web") return null;
    throw new Error("Captura de foto cancelada.");
  }

  return result.assets[0].uri;
}
