import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { countPendingPunches } from "../../features/punches/punchService";
import { colors } from "../../lib/theme";

/** De quanto em quanto tempo o sino reconsulta a contagem. */
const POLL_MS = 60_000;

/**
 * Sino de marcações aguardando aprovação, no cabeçalho do admin.
 *
 * Quando o funcionário encerra o ponto, a marcação entra como pendente e o número
 * aparece aqui — sem isso o admin só descobriria abrindo a aba Aprovações por conta
 * própria. Tocar no sino leva direto para lá.
 *
 * A contagem é reconsultada periodicamente: o app não mantém conexão aberta com o banco,
 * então sem essa releitura o aviso só mudaria ao recarregar a página.
 */
export function PendingApprovalsBell() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setCount(await countPendingPunches());
      setFailed(false);
    } catch {
      // Falha de rede não pode virar "nenhuma pendência": some com o número em vez de
      // afirmar que está tudo aprovado.
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const hasPending = !failed && count > 0;

  return (
    <Pressable
      onPress={() => router.push("/(admin)/approvals")}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={
        hasPending
          ? `${count} marcação(ões) aguardando aprovação. Abrir aprovações.`
          : "Nenhuma marcação aguardando aprovação"
      }
    >
      <Ionicons
        name={hasPending ? "notifications" : "notifications-outline"}
        size={26}
        color={hasPending ? colors.warning : colors.textMuted}
      />
      {hasPending ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: 6 },
  pressed: { opacity: 0.6 },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: colors.accentText },
});
