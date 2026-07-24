import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../../lib/theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
}

const BACKGROUND = {
  primary: colors.accent,
  secondary: colors.secondaryButton,
  danger: colors.danger,
};

const TEXT_COLOR = {
  primary: colors.accentText,
  secondary: colors.secondaryButtonText,
  danger: colors.accentText,
};

export function Button({ label, onPress, variant = "primary", disabled, loading }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: BACKGROUND[variant], opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={TEXT_COLOR[variant]} />
      ) : (
        <Text style={[styles.label, { color: TEXT_COLOR[variant] }]}>{label}</Text>
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
