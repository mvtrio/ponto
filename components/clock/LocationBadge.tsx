import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../lib/theme";

interface LocationBadgeProps {
  status: "idle" | "capturing" | "captured" | "unavailable";
}

const LABELS: Record<LocationBadgeProps["status"], string> = {
  idle: "Localização não capturada ainda",
  capturing: "Obtendo localização…",
  captured: "Localização capturada",
  unavailable: "Localização indisponível (marcação seguirá sem coordenadas)",
};

const DOT_COLORS: Record<LocationBadgeProps["status"], string> = {
  idle: colors.textFaint,
  capturing: colors.accent,
  captured: colors.success,
  unavailable: colors.warning,
};

export function LocationBadge({ status }: LocationBadgeProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: DOT_COLORS[status] }]} />
      <Text style={styles.text}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 13, color: colors.textMuted },
});
