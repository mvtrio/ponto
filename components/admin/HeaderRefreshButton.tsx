import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet } from "react-native";

import { colors } from "../../lib/theme";

/**
 * Recarrega a tela atual, ao lado do sino no cabeçalho do admin.
 *
 * O app não mantém conexão aberta com o banco: o que o admin vê é o que foi lido quando a
 * tela abriu. Depois de aprovar um ponto em outro dispositivo, ou de mexer no SQL do
 * Supabase, os números só mudam quando alguém manda ler de novo — e até aqui esse "de
 * novo" era o F5 do navegador, que não existe no celular.
 *
 * Na web é literalmente um reload do documento. No nativo não há documento para
 * recarregar, então o botão reentra na rota atual, o que refaz a consulta das telas que
 * carregam no foco.
 */
export function HeaderRefreshButton() {
  const router = useRouter();
  const pathname = usePathname();

  function handlePress() {
    if (Platform.OS === "web") {
      window.location.reload();
      return;
    }
    router.replace(pathname as never);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Recarregar a tela"
    >
      <Ionicons name="refresh" size={24} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: 6 },
  pressed: { opacity: 0.6 },
});
