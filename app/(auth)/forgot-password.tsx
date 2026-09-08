import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { updateOwnPassword } from "../../features/auth/authService";
import { colors } from "../../lib/theme";

const MIN_LENGTH = 6;

/**
 * Define a nova senha direto, sem pedir e-mail — decisão do produto.
 *
 * ATENÇÃO: esta tela não identifica o usuário. Ela troca a senha de QUEM ESTIVER com
 * sessão ativa (o fluxo de recuperação do Supabase abre uma sessão ao clicar no link do
 * e-mail; um usuário já logado também tem). Sem sessão não há como saber de quem é a
 * senha, e a operação falha — é o que a mensagem de erro explica.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(auth)/login");
  }

  async function handleSave() {
    setError(null);
    setMessage(null);

    if (newPassword.length < MIN_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }

    setLoading(true);
    try {
      await updateOwnPassword(newPassword);
      setNewPassword("");
      setMessage("Senha alterada com sucesso.");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      // Sem sessão o Supabase responde "Auth session missing"; traduzimos para algo
      // acionável em vez de repassar o erro cru.
      setError(
        /session/i.test(raw)
          ? "Não há sessão ativa para identificar a conta. Peça ao administrador para redefinir sua senha."
          : raw || "Erro ao alterar a senha"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Definir nova senha</Text>

      <TextInput
        style={styles.input}
        placeholder="Nova senha"
        placeholderTextColor={colors.textFaint}
        secureTextEntry
        autoCapitalize="none"
        value={newPassword}
        onChangeText={setNewPassword}
      />

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <View style={styles.action}>
          <Button label="Cancelar" variant="secondary" onPress={handleCancel} disabled={loading} />
        </View>
        <View style={styles.action}>
          <Button label="Salvar" onPress={handleSave} loading={loading} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.background, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 16, color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  success: { color: colors.success, textAlign: "center" },
  error: { color: colors.danger, textAlign: "center" },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  action: { flex: 1 },
});
