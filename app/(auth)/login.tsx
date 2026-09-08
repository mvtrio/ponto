import { useState } from "react";
import { Link } from "expo-router";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { colors } from "../../lib/theme";
import { signInWithPassword } from "../../features/auth/authService";
import { useSession } from "../../features/auth/useSession";

export default function LoginScreen() {
  const { deactivatedMessage, clearDeactivatedMessage } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    clearDeactivatedMessage();

    if (!email.trim() || !password) {
      setError("Informe e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Ponto</Text>
        <Text style={styles.subtitle}>Entre com seu e-mail e senha</Text>

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
          placeholder="Senha"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {deactivatedMessage ? <Text style={styles.error}>{deactivatedMessage}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Sem `disabled` ligado ao estado: o autofill do Chrome preenche o input do DOM
            sem disparar onChangeText, então o botão ficava travado com os campos
            visivelmente preenchidos. A validação passou para o handleSubmit. */}
        <Button label="Entrar" onPress={handleSubmit} loading={loading} />

        <Link href="/(auth)/forgot-password" style={styles.link}>
          Esqueci minha senha
        </Link>
      </View>
    </KeyboardAvoidingView>
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
  // Mesmo container estreito da tela de redefinir senha, para as duas telas de
  // autenticação ficarem consistentes em tela larga.
  form: { width: "100%", maxWidth: 360, gap: 12 },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: colors.textMuted,
    marginBottom: 16,
  },
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
  error: {
    color: colors.danger,
    textAlign: "center",
  },
  link: {
    textAlign: "center",
    color: colors.accent,
    marginTop: 8,
  },
});
