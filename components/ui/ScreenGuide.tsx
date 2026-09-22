import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "./Card";
import { colors } from "../../lib/theme";

export interface ScreenGuideProps {
  /** O que a tela faz, em uma frase. */
  summary: string;
  /** Passo a passo, na ordem em que o admin preenche. */
  steps: string[];
  /** O que muda no sistema depois de gravar. */
  result: string;
  /** Situações parecidas que pertencem a outra tela, com o destino. */
  notFor?: string[];
}

/**
 * Resumo de uso no topo da tela.
 *
 * Começa aberto: quem chega pela primeira vez precisa ler, e quem já sabe fecha uma vez.
 * O estado não é guardado de propósito — são telas de uso esporádico (uma vez por mês, no
 * caso do fechamento), e voltar a elas depois de semanas é justamente quando a explicação
 * faz falta de novo.
 */
export function ScreenGuide({ summary, steps, result, notFor }: ScreenGuideProps) {
  const [open, setOpen] = useState(true);

  return (
    <Card style={styles.card}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.header}>
        <Ionicons name="help-circle-outline" size={24} color={colors.accent} />
        <Text style={styles.title}>Como usar esta tela</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={22}
          color={colors.textMuted}
        />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          <Text style={styles.summary}>{summary}</Text>

          <View style={styles.steps}>
            {steps.map((step, index) => (
              <View key={step} style={styles.step}>
                <View style={styles.bullet}>
                  <Text style={styles.bulletText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.resultBox}>
            <Ionicons name="arrow-forward-circle-outline" size={20} color={colors.success} />
            <Text style={styles.resultText}>{result}</Text>
          </View>

          {notFor && notFor.length > 0 ? (
            <View style={styles.notForBox}>
              <Text style={styles.notForTitle}>Esta tela não serve para:</Text>
              {notFor.map((item) => (
                <Text key={item} style={styles.notForItem}>
                  • {item}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: "center", width: "100%", maxWidth: 560, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text },
  body: { gap: 14 },
  summary: { fontSize: 16, color: colors.text, lineHeight: 23 },
  steps: { gap: 10 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.chipSelected,
    alignItems: "center",
    justifyContent: "center",
  },
  bulletText: { fontSize: 13, fontWeight: "700", color: colors.chipSelectedText },
  stepText: { flex: 1, fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  resultBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
  notForBox: { gap: 4 },
  notForTitle: { fontSize: 15, fontWeight: "600", color: colors.textMuted },
  notForItem: { fontSize: 15, color: colors.textFaint, lineHeight: 22 },
});
