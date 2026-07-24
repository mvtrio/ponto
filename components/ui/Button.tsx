import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
}

const COLORS = {
  primary: "#2563eb",
  secondary: "#e5e7eb",
  danger: "#dc2626",
};

export function Button({ label, onPress, variant = "primary", disabled, loading }: ButtonProps) {
  const isTextDark = variant === "secondary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: COLORS[variant], opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isTextDark ? "#111827" : "#fff"} />
      ) : (
        <Text style={[styles.label, { color: isTextDark ? "#111827" : "#fff" }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
});
