import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { changeOwnPassword } from "../../features/auth/authService";
import { colors } from "../../lib/theme";

const MIN_LENGTH = 6;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleCancel() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(app)/profile");
  }

  async function handleSave() {
    setError(null);
    setMessage(null);

    if (!currentPassword) {
      setError("Informe sua senha atual.");
      return;
    }
    if (newPassword.length < MIN_LENGTH) {
      setError(`A nova senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("A confirmação não confere com a nova senha.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("A nova senha precisa ser diferente da atual.");
      return;
    }

    setSaving(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Senha alterada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar a senha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Alterar senha</Text>

        <Text style={styles.label}>Senha atual</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          autoComplete="current-password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Digite sua senha atual"
          placeholderTextColor={colors.textFaint}
        />

        <Text style={styles.label}>Nova senha</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          autoComplete="new-password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={`Mínimo de ${MIN_LENGTH} caracteres`}
          placeholderTextColor={colors.textFaint}
        />

        <Text style={styles.label}>Confirmar nova senha</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          autoComplete="new-password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repita a nova senha"
          placeholderTextColor={colors.textFaint}
        />

        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <View style={styles.action}>
            <Button label="Cancelar" variant="secondary" onPress={handleCancel} disabled={saving} />
          </View>
          <View style={styles.action}>
            <Button label="Salvar" onPress={handleSave} loading={saving} />
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16, justifyContent: "center" },
  card: { gap: 10, alignSelf: "center", width: "100%", maxWidth: 460 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 4 },
  label: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  success: { color: colors.success },
  error: { color: colors.danger },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  action: { flex: 1 },
});
