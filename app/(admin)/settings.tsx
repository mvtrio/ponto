import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { fetchCompanySettings, updateCompanySettings } from "../../features/admin/adminService";
import { signOut, updateOwnFullName, updateOwnPassword } from "../../features/auth/authService";
import { useSession } from "../../features/auth/useSession";
import { addHoliday, deleteHoliday, fetchCustomHolidays, type Holiday } from "../../features/company/holidaysService";
import { colors } from "../../lib/theme";

export default function SettingsScreen() {
  const { profile, session } = useSession();
  const [standardHours, setStandardHours] = useState("8");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [holidayError, setHolidayError] = useState<string | null>(null);

  function loadHolidays() {
    setLoadingHolidays(true);
    fetchCustomHolidays()
      .then(setHolidays)
      .catch((err) => setHolidayError(err instanceof Error ? err.message : "Erro ao carregar feriados"))
      .finally(() => setLoadingHolidays(false));
  }

  useEffect(() => {
    loadHolidays();
  }, []);

  useEffect(() => {
    fetchCompanySettings()
      .then((settings) => setStandardHours((settings.standard_daily_minutes / 60).toString()))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar configurações"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

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

  async function handleSaveName() {
    setNameError(null);
    setNameMessage(null);
    setSavingName(true);
    try {
      await updateOwnFullName(fullName.trim());
      setNameMessage("Nome atualizado.");
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Erro ao salvar nome");
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword.length < 6) {
      setPasswordError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }
    setSavingPassword(true);
    try {
      await updateOwnPassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Senha alterada.");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Erro ao alterar senha");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleAddHoliday() {
    setHolidayError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newHolidayDate)) {
      setHolidayError("Data inválida. Use o formato AAAA-MM-DD.");
      return;
    }
    if (!newHolidayName.trim()) {
      setHolidayError("Informe o nome do feriado.");
      return;
    }
    setSavingHoliday(true);
    try {
      await addHoliday(newHolidayDate, newHolidayName.trim());
      setNewHolidayDate("");
      setNewHolidayName("");
      loadHolidays();
    } catch (err) {
      setHolidayError(err instanceof Error ? err.message : "Erro ao adicionar feriado");
    } finally {
      setSavingHoliday(false);
    }
  }

  async function handleDeleteHoliday(day: string) {
    setHolidayError(null);
    try {
      await deleteHoliday(day);
      loadHolidays();
    } catch (err) {
      setHolidayError(err instanceof Error ? err.message : "Erro ao remover feriado");
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
        <Button label="Salvar" onPress={handleSave} loading={loading} disabled={loading} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Feriados</Text>
        <Text style={styles.hint}>
          Feriados nacionais de data fixa (Ano Novo, Tiradentes, Dia do Trabalho, Independência, etc.) já são
          reconhecidos automaticamente. Cadastre aqui só feriados móveis (Carnaval, Páscoa) ou regionais.
        </Text>

        {holidays.map((h) => (
          <View key={h.day} style={styles.holidayRow}>
            <Text style={styles.holidayText}>
              {h.day} — {h.name}
            </Text>
            <Pressable onPress={() => handleDeleteHoliday(h.day)}>
              <Text style={styles.holidayRemove}>Remover</Text>
            </Pressable>
          </View>
        ))}
        {!loadingHolidays && holidays.length === 0 ? (
          <Text style={styles.hint}>Nenhum feriado adicional cadastrado.</Text>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Data (AAAA-MM-DD)"
          placeholderTextColor={colors.textFaint}
          value={newHolidayDate}
          onChangeText={setNewHolidayDate}
        />
        <TextInput
          style={styles.input}
          placeholder="Nome do feriado"
          placeholderTextColor={colors.textFaint}
          value={newHolidayName}
          onChangeText={setNewHolidayName}
        />
        {holidayError ? <Text style={styles.error}>{holidayError}</Text> : null}
        <Button label="Adicionar feriado" variant="secondary" onPress={handleAddHoliday} loading={savingHoliday} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Conectado como</Text>
        <Text style={styles.account}>{session?.user.email}</Text>

        <Text style={styles.label}>Meu nome</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholderTextColor={colors.textFaint}
        />
        {nameMessage ? <Text style={styles.success}>{nameMessage}</Text> : null}
        {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
        <Button label="Salvar nome" variant="secondary" onPress={handleSaveName} loading={savingName} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Alterar minha senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Nova senha (mínimo 6 caracteres)"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirmar nova senha"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {passwordMessage ? <Text style={styles.success}>{passwordMessage}</Text> : null}
        {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
        <Button
          label="Alterar senha"
          variant="secondary"
          onPress={handleChangePassword}
          loading={savingPassword}
          disabled={!newPassword || !confirmPassword}
        />
      </Card>

      <Card style={styles.card}>
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
  hint: { fontSize: 12, color: colors.textFaint },
  holidayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  holidayText: { fontSize: 14, color: colors.text },
  holidayRemove: { fontSize: 13, color: colors.danger },
});
