import { Redirect, Tabs } from "expo-router";

import { LoadingScreen } from "../../components/ui/LoadingScreen";
import { useSession } from "../../features/auth/useSession";

export default function AppLayout() {
  const { session, loading } = useSession();

  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="clock" options={{ title: "Bater ponto" }} />
      <Tabs.Screen name="history" options={{ title: "Histórico" }} />
      <Tabs.Screen name="bank" options={{ title: "Banco de horas" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
