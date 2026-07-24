import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { fetchCompanySettings, updateCompanySettings } from "../../features/admin/adminService";
import { signOut } from "../../features/auth/authService";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";

export default function SettingsScreen() {
  const { profile, session } = useSession();
  const [standardHours, setStandardHours] = useState("8");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanySettings()
      .then((settings) => setStandardHours((settings.standard_daily_minutes / 60).toString()))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar configurações"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const hours = Number(standardHours.replace(",", "."));
      await updateCompanySettings(Math.round(hours * 60));
      setMessage("Configurações salvas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.label}>Jornada padrão diária (horas)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={standardHours}
          onChangeText={setStandardHours}
          editable={!loading}
          placeholderTextColor={colors.textFaint}
        />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Salvar" onPress={handleSave} loading={saving} disabled={loading} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Conectado como</Text>
        <Text style={styles.account}>{profile?.full_name || session?.user.email}</Text>
        <Button label="Sair" variant="danger" onPress={() => signOut()} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  card: { gap: 12 },
  account: { fontSize: 15, fontWeight: "600", color: colors.text },
  label: { fontSize: 14, color: colors.textMuted },
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
});
