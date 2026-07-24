import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { fetchCompanySettings, updateCompanySettings } from "../../features/admin/adminService";

export default function SettingsScreen() {
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
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.label}>Jornada padrão diária (horas)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={standardHours}
          onChangeText={setStandardHours}
          editable={!loading}
        />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Salvar" onPress={handleSave} loading={saving} disabled={loading} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16, justifyContent: "center" },
  card: { gap: 12 },
  label: { fontSize: 14, color: "#374151" },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  success: { color: "#16a34a" },
  error: { color: "#dc2626" },
});
