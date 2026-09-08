import { useState } from "react";
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { SegmentedControl } from "../../../components/ui/SegmentedControl";
import { createEmployee } from "../../../features/admin/adminService";
import { colors } from "../../../lib/theme";
import type { Role } from "../../../types/domain";

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export default function NewEmployeeScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = fullName.trim().length > 0 && email.trim().length > 0 && password.length >= 6;

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await createEmployee({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        employeeCode: employeeCode.trim() || null,
        role,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar funcionário");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome do funcionário"
            placeholderTextColor={colors.textFaint}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="email@empresa.com"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Senha inicial</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.textFaint}
              value={password}
              onChangeText={setPassword}
            />
            <Button label="Gerar" variant="secondary" onPress={() => setPassword(generatePassword())} />
          </View>
          <Text style={styles.hint}>
            Compartilhe essa senha com o funcionário; ele poderá trocá-la depois.
          </Text>

          <Text style={styles.label}>Código do funcionário (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 0042"
            placeholderTextColor={colors.textFaint}
            value={employeeCode}
            onChangeText={setEmployeeCode}
          />

          <Text style={styles.label}>Cargo</Text>
          <SegmentedControl
            options={[
              { label: "Funcionário", value: "employee" },
              { label: "Admin", value: "admin" },
            ]}
            value={role}
            onChange={setRole}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Criar funcionário" onPress={handleSave} loading={saving} disabled={!canSave} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  card: { gap: 12 },
  label: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
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
  passwordRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  passwordInput: { flex: 1 },
  hint: { fontSize: 12, color: colors.textFaint, marginTop: -6 },
  error: { color: colors.danger },
});
