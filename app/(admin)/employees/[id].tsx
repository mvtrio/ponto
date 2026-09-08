import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";

import { DaySummaryCard } from "../../../components/history/DaySummaryCard";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { SegmentedControl } from "../../../components/ui/SegmentedControl";
import {
  deleteEmployee,
  fetchEmployeeById,
  resetEmployeePassword,
  updateEmployee,
} from "../../../features/admin/adminService";
import { useDailySummaries } from "../../../features/hours/useDailySummary";
import { useHourBank } from "../../../features/hours/useHourBank";
import { colors } from "../../../lib/theme";
import type { Role } from "../../../types/domain";
import { formatMinutes } from "../../../types/domain";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fromDate = isoDaysAgo(30);
  const toDate = isoDaysAgo(0);
  const { summaries, loading, error } = useDailySummaries(id, fromDate, toDate);
  const { balanceMinutes } = useHourBank(id);

  const [fullName, setFullName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [active, setActive] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEmployeeById(id)
      .then((profile) => {
        if (cancelled) return;
        setFullName(profile.full_name);
        setEmployeeCode(profile.employee_code ?? "");
        setRole(profile.role);
        setActive(profile.active);
      })
      .catch((err) => !cancelled && setSaveError(err instanceof Error ? err.message : "Erro ao carregar perfil"))
      .finally(() => !cancelled && setLoadingProfile(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSave(nextActive: boolean) {
    setSaveError(null);
    setSaveMessage(null);
    setSaving(true);
    try {
      await updateEmployee(id, {
        fullName: fullName.trim(),
        employeeCode: employeeCode.trim() || null,
        role,
        active: nextActive,
      });
      setActive(nextActive);
      setSaveMessage("Dados salvos.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
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
    setResettingPassword(true);
    try {
      await resetEmployeePassword(id, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Senha redefinida.");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Erro ao redefinir senha");
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteEmployee(id);
      router.back();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Erro ao excluir funcionário");
      setDeleting(false);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={summaries}
        keyExtractor={(item) => item.day}
        renderItem={({ item }) => <DaySummaryCard summary={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.balanceLabel}>Banco de horas</Text>
              <Text
                style={[
                  styles.balanceValue,
                  { color: (balanceMinutes ?? 0) >= 0 ? colors.success : colors.danger },
                ]}
              >
                {balanceMinutes !== null ? formatMinutes(balanceMinutes) : "—"}
              </Text>
            </View>

            <Card style={styles.card}>
              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                editable={!loadingProfile}
                placeholderTextColor={colors.textFaint}
              />

              <Text style={styles.label}>Código do funcionário</Text>
              <TextInput
                style={styles.input}
                value={employeeCode}
                onChangeText={setEmployeeCode}
                editable={!loadingProfile}
                placeholderTextColor={colors.textFaint}
                placeholder="Opcional"
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

              {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
              {saveMessage ? <Text style={styles.success}>{saveMessage}</Text> : null}

              <Button label="Salvar" onPress={() => handleSave(active)} loading={saving} disabled={loadingProfile} />
              {active ? (
                <Button
                  label="Desativar funcionário"
                  variant="danger"
                  onPress={() => handleSave(false)}
                  disabled={saving || loadingProfile}
                />
              ) : (
                <Button
                  label="Reativar funcionário"
                  variant="secondary"
                  onPress={() => handleSave(true)}
                  disabled={saving || loadingProfile}
                />
              )}
            </Card>

            <Card style={styles.card}>
              <Text style={styles.label}>Redefinir senha</Text>
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
                label="Redefinir senha"
                variant="secondary"
                onPress={handleResetPassword}
                loading={resettingPassword}
                disabled={!newPassword || !confirmPassword}
              />
            </Card>

            <Card style={styles.card}>
              <Text style={styles.label}>Zona de risco</Text>
              {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
              {confirmingDelete ? (
                <>
                  <Text style={styles.confirmText}>
                    Tem certeza? Isso apaga a conta e todo o histórico de {fullName || "este funcionário"}{" "}
                    permanentemente. Não dá para desfazer.
                  </Text>
                  <Button
                    label="Confirmar exclusão"
                    variant="danger"
                    onPress={handleDelete}
                    loading={deleting}
                  />
                  <Button
                    label="Cancelar"
                    variant="secondary"
                    onPress={() => setConfirmingDelete(false)}
                    disabled={deleting}
                  />
                </>
              ) : (
                <Button
                  label="Excluir funcionário"
                  variant="danger"
                  onPress={() => setConfirmingDelete(true)}
                  disabled={loadingProfile}
                />
              )}
            </Card>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Text style={styles.sectionTitle}>Últimos 30 dias</Text>
          </>
        }
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Sem registros nos últimos 30 dias</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 16, backgroundColor: colors.surface, alignItems: "center", gap: 4, marginBottom: 16 },
  balanceLabel: { fontSize: 12, color: colors.textMuted },
  balanceValue: { fontSize: 24, fontWeight: "700" },
  list: { padding: 16, paddingTop: 0 },
  card: { gap: 12, marginBottom: 16 },
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
  sectionTitle: { fontSize: 14, fontWeight: "600", color: colors.textMuted, marginBottom: 8 },
  confirmText: { fontSize: 13, color: colors.textMuted },
  error: { color: colors.danger, padding: 16 },
  success: { color: colors.success },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
});
