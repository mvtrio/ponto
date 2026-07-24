import { StyleSheet, Text, View } from "react-native";

interface LocationBadgeProps {
  status: "idle" | "capturing" | "captured" | "unavailable";
}

const LABELS: Record<LocationBadgeProps["status"], string> = {
  idle: "Localização não capturada ainda",
  capturing: "Obtendo localização…",
  captured: "Localização capturada",
  unavailable: "Localização indisponível (marcação seguirá sem coordenadas)",
};

const COLORS: Record<LocationBadgeProps["status"], string> = {
  idle: "#6b7280",
  capturing: "#2563eb",
  captured: "#16a34a",
  unavailable: "#d97706",
};

export function LocationBadge({ status }: LocationBadgeProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: COLORS[status] }]} />
      <Text style={styles.text}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 13, color: "#374151" },
});
