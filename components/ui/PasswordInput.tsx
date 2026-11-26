import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { colors } from "../../lib/theme";

/**
 * Campo de senha com o olho para mostrar ou esconder o que foi digitado.
 *
 * Quem digita devagar, ou no celular, erra a senha sem ver — e só descobre quando o
 * sistema recusa. Deixar conferir antes de enviar evita a volta.
 */
export function PasswordInput({ style, ...props }: Omit<TextInputProps, "secureTextEntry">) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <TextInput
        {...props}
        style={[style, styles.input]}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        style={styles.eye}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"}
        hitSlop={8}
      >
        <Ionicons name={visible ? "eye-off" : "eye"} size={22} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "relative", justifyContent: "center" },
  // Espaço para o olho não cobrir o texto.
  input: { paddingRight: 48 },
  eye: {
    position: "absolute",
    right: 6,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
