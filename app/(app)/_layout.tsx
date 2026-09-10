import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { LoadingScreen } from "../../components/ui/LoadingScreen";
import { useSession } from "../../features/auth/useSession";
import { colors } from "../../lib/theme";

/**
 * Ícone da aba. Sem `tabBarIcon` o React Navigation desenha um placeholder — era o
 * retângulo cortado que aparecia no menu. Contorno quando inativa, preenchido quando
 * ativa: a diferença de peso ajuda a enxergar qual aba está selecionada.
 */
function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons
      name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)}
      size={size}
      color={color as string}
    />
  );
}

export default function AppLayout() {
  const { session, profile, loading } = useSession();

  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/login" />;
  // O admin só administra: não bate ponto. Sem esta checagem ele veria a tela de marcação
  // ao abrir /clock direto pela URL — o redirecionamento de index.tsx só cobre a raiz.
  if (profile?.role === "admin") return <Redirect href="/(admin)/dashboard" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarPosition: "top",
        // Altura explícita: com a barra no topo, o padrão não reserva espaço para ícone
        // + rótulo e o texto saía cortado pela metade.
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          height: 76,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIconStyle: { marginBottom: 0 },
        // Rótulo maior que o padrão e sem corte: o sistema é usado por quem enxerga mal.
        tabBarLabelStyle: { fontSize: 13, fontWeight: "600", marginTop: 2, paddingBottom: 2 },
        tabBarAllowFontScaling: false,
      }}
    >
      <Tabs.Screen
        name="clock"
        options={{ title: "Bater ponto", tabBarLabel: "Ponto", tabBarIcon: tabIcon("alarm") }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: "Histórico", tabBarLabel: "Histórico", tabBarIcon: tabIcon("list") }}
      />
      {/* tabBarLabel curto porque "Banco de horas" era cortado em "Banco de hor…". */}
      <Tabs.Screen
        name="bank"
        options={{ title: "Banco de horas", tabBarLabel: "Banco", tabBarIcon: tabIcon("hourglass") }}
      />
      {/* Rota própria (não "corrections") para não colidir com a tela de correções do admin,
          que fica em /corrections — grupos entre parênteses não entram na URL. */}
      <Tabs.Screen
        name="request-correction"
        options={{ title: "Correções", tabBarLabel: "Correções", tabBarIcon: tabIcon("create") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Perfil", tabBarLabel: "Perfil", tabBarIcon: tabIcon("person-circle") }}
      />
      {/* href: null — acessível pelo Perfil, sem ocupar espaço no menu. */}
      <Tabs.Screen name="change-password" options={{ href: null, title: "Alterar senha" }} />
    </Tabs>
  );
}
