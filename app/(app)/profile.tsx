import { StyleSheet, Text, View } from "react-native";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { signOut } from "../../features/auth/authService";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";

export default function ProfileScreen() {
  const { profile, session } = useSession();

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.name}>{profile?.full_name}</Text>
        <Text style={styles.email}>{session?.user.email}</Text>
        <Text style={styles.role}>Papel: {profile?.role === "admin" ? "Administrador" : "Funcionário"}</Text>
      </Card>
      <Button label="Sair" variant="danger" onPress={() => signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16, gap: 16, justifyContent: "center" },
  card: { gap: 4, alignItems: "center" },
  name: { fontSize: 20, fontWeight: "700", color: colors.text },
  email: { fontSize: 14, color: colors.textMuted },
  role: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
});
