import { Redirect, Tabs } from "expo-router";

import { LoadingScreen } from "../../components/ui/LoadingScreen";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";

export default function AdminLayout() {
  const { session, profile, loading } = useSession();

  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (profile?.role !== "admin") return <Redirect href="/(app)/clock" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
      }}
    >
      <Tabs.Screen name="employees/index" options={{ title: "Funcionários" }} />
      <Tabs.Screen name="employees/new" options={{ href: null, title: "Novo funcionário" }} />
      <Tabs.Screen name="employees/[id]" options={{ href: null, title: "Funcionário" }} />
      <Tabs.Screen name="corrections" options={{ title: "Correções" }} />
      <Tabs.Screen name="reports" options={{ title: "Relatórios" }} />
      <Tabs.Screen name="settings" options={{ title: "Configurações" }} />
    </Tabs>
  );
}
