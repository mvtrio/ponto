import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

/**
 * Foto da marcação.
 *
 * No web não há captura: o `expo-image-picker` não acessa a câmera pelo navegador e cai
 * num seletor de arquivos — a janela do Windows que aparecia a cada batida de ponto.
 * Bater ponto tem que ser um clique e nada mais, então no web retorna null direto e a
 * marcação segue sem foto. No nativo (Android/iOS) a câmera real é usada normalmente.
 */
export async function capturePhoto(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Permissão de câmera negada. A foto é obrigatória para bater o ponto.");
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.5,
    base64: false,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.length) {
    throw new Error("Captura de foto cancelada.");
  }

  return result.assets[0].uri;
}
