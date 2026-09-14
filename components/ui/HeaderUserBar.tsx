import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { signOut } from "../../features/auth/authService";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";

/**
 * Nome de quem está conectado e o botão de sair, no cabeçalho.
 *
 * Fica no `headerRight` do navegador de abas, então acompanha todas as telas — de
 * funcionário e de admin — em vez de existir só dentro do Perfil e das Configurações.
 */
export function HeaderUserBar() {
  const { profile } = useSession();
  const [leaving, setLeaving] = useState(false);

  async function handleSignOut() {
    setLeaving(true);
    try {
      await signOut();
    } finally {
      // O SessionProvider derruba a sessão e o layout redireciona para o login; se algo
      // falhar, liberar o botão é melhor que deixá-lo travado para sempre.
      setLeaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.identity}>
        <Ionicons name="person-circle" size={26} color={colors.textMuted} />
        <Text style={styles.name} numberOfLines={1}>
          {profile?.full_name ?? "—"}
        </Text>
      </View>

      <Pressable
        onPress={handleSignOut}
        disabled={leaving}
        style={({ pressed }) => [styles.button, (pressed || leaving) && styles.buttonActive]}
        accessibilityRole="button"
        accessibilityLabel="Sair do sistema"
      >
        {leaving ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Ionicons name="log-out-outline" size={22} color={colors.accentText} />
        )}
        <Text style={styles.buttonLabel}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 14, paddingRight: 16 },
  identity: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  name: { fontSize: 17, fontWeight: "600", color: colors.text, maxWidth: 220 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.danger,
  },
  buttonActive: { opacity: 0.7 },
  buttonLabel: { fontSize: 16, fontWeight: "700", color: colors.accentText },
});
