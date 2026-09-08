import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { resetPasswordForEmail } from "../../features/auth/authService";
import { colors } from "../../lib/theme";

const MIN_LENGTH = 6;

/**
 * Define a nova senha direto, sem enviar link por e-mail — decisão do produto.
 *
 * Funciona com o usuário deslogado porque a senha atual autoriza a troca. Só o e-mail não
 * basta: a chave anônima não pode alterar outra conta, e um endpoint que fizesse isso sem
 * autenticação permitiria tomar a conta de qualquer usuário. Quem realmente esqueceu a
 * senha precisa do administrador.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
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

    if (!email.trim()) {
      setError("Informe o e-mail da conta.");
      return;
    }
    if (!currentPassword) {
      setError("Informe a senha atual.");
      return;
    }
    if (newPassword.length < MIN_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }

    setLoading(true);
    try {
      await resetPasswordForEmail(email, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Senha alterada com sucesso. Entre com a nova senha.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar a senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Definir nova senha</Text>

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Senha atual"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          autoCapitalize="none"
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  // Formulário estreito e centralizado: em tela larga não faz sentido esticar
  // campos e botões de ponta a ponta.
  form: { width: "100%", maxWidth: 360, gap: 12 },
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
