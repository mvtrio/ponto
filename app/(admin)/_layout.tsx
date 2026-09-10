import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { LoadingScreen } from "../../components/ui/LoadingScreen";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";

/** Ver a nota em app/(app)/_layout.tsx: sem tabBarIcon o menu desenha um placeholder. */
function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons
      name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)}
      size={size}
      color={color as string}
    />
  );
}

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
        tabBarPosition: "top",
        tabBarStyle: { backgroundColor: colors.surface, borderBottomColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIconStyle: { marginBottom: 2 },
        tabBarLabelStyle: { fontSize: 13, fontWeight: "600" },
        tabBarAllowFontScaling: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarLabel: "Painel", tabBarIcon: tabIcon("speedometer") }}
      />
      <Tabs.Screen
        name="employees/index"
        options={{ title: "Funcionários", tabBarLabel: "Equipe", tabBarIcon: tabIcon("people") }}
      />
      <Tabs.Screen name="employees/new" options={{ href: null, title: "Novo funcionário" }} />
      <Tabs.Screen name="employees/[id]" options={{ href: null, title: "Funcionário" }} />
      <Tabs.Screen
        name="overview"
        options={{ title: "Marcações", tabBarLabel: "Marcações", tabBarIcon: tabIcon("calendar") }}
      />
      <Tabs.Screen
        name="approvals"
        options={{ title: "Aprovações", tabBarLabel: "Aprovar", tabBarIcon: tabIcon("checkmark-circle") }}
      />
      <Tabs.Screen
        name="corrections"
        options={{ title: "Correções", tabBarLabel: "Correções", tabBarIcon: tabIcon("create") }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: "Relatórios", tabBarLabel: "Relatórios", tabBarIcon: tabIcon("document-text") }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Configurações", tabBarLabel: "Ajustes", tabBarIcon: tabIcon("settings") }}
      />
    </Tabs>
  );
}
