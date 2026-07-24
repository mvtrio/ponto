import { Redirect, Stack } from "expo-router";

import { LoadingScreen } from "../../components/ui/LoadingScreen";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";

export default function AuthLayout() {
  const { session, loading } = useSession();

  if (loading) return <LoadingScreen />;
  if (session) return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
  );
}
