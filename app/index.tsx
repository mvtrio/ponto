import { Redirect } from "expo-router";

import { LoadingScreen } from "../components/ui/LoadingScreen";
import { useSession } from "../features/auth/useSession";

export default function Index() {
  const { session, profile, loading } = useSession();

  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (profile?.role === "admin") return <Redirect href="/(admin)/dashboard" />;
  return <Redirect href="/(app)/clock" />;
}
