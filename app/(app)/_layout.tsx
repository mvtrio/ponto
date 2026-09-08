import { Redirect, Tabs } from "expo-router";

import { LoadingScreen } from "../../components/ui/LoadingScreen";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";

export default function AppLayout() {
  const { session, loading } = useSession();

  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarPosition: "top",
        tabBarStyle: { backgroundColor: colors.surface, borderBottomColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
      }}
    >
      <Tabs.Screen name="clock" options={{ title: "Bater ponto" }} />
      <Tabs.Screen name="history" options={{ title: "Histórico" }} />
      <Tabs.Screen name="bank" options={{ title: "Banco de horas" }} />
      {/* Rota própria (não "corrections") para não colidir com a tela de correções do admin,
          que fica em /corrections — grupos entre parênteses não entram na URL. */}
      <Tabs.Screen name="request-correction" options={{ title: "Correções" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
      {/* href: null — acessível pelo Perfil, sem ocupar espaço no menu. */}
      <Tabs.Screen name="change-password" options={{ href: null, title: "Alterar senha" }} />
    </Tabs>
  );
}
