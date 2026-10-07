import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { monthLabel, nextMonthOf } from "../../features/hours/closingMath";
import type { MonthClosing } from "../../features/hours/closingService";
import { colors } from "../../lib/theme";
import { formatMinutes } from "../../types/domain";

function formatDay(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Extrato de um mês fechado, na ordem em que a conta acontece.
 *
 * A funcionária vê o saldo do dia a dia o mês inteiro, mas o abatimento acontece uma vez
 * só e sem ela presente. Sem este extrato, o débito simplesmente encolhe de um mês para
 * o outro e ela não tem como conferir por quê — que é justamente a hora em que um
 * controle de ponto precisa ser verificável.
 */
export function ClosingStatement({ closing }: { closing: MonthClosing }) {
  const sobra = closing.carry_debit_minutes > 0 || closing.carry_credit_minutes > 0;
  const seguinte = monthLabel(nextMonthOf(closing.month));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.month}>{monthLabel(closing.month)}</Text>
        <View style={styles.badge}>
          <Ionicons name="lock-closed" size={14} color={colors.chipSelectedText} />
          <Text style={styles.badgeText}>Fechado</Text>
        </View>
      </View>
      <Text style={styles.period}>
        Período apurado: {formatDay(closing.from_day)} a {formatDay(closing.to_day)}
      </Text>

      <View style={styles.rows}>
        <View style={styles.row}>
          <Text style={styles.label}>Débito acumulado</Text>
          <Text style={[styles.value, { color: colors.danger }]}>
            {formatMinutes(closing.debit_minutes)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Horas extras acumuladas</Text>
          <Text style={[styles.value, { color: colors.success }]}>
            {formatMinutes(closing.overtime_minutes)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.labelStrong}>Horas extras usadas para abater o débito</Text>
          <Text style={[styles.value, styles.valueStrong]}>
            − {formatMinutes(closing.applied_minutes)}
          </Text>
        </View>

        <View style={styles.divider} />

        {closing.carry_debit_minutes > 0 ? (
          <View style={styles.row}>
            <Text style={styles.labelStrong}>Débito que passou para {seguinte}</Text>
            <Text style={[styles.value, styles.valueStrong, { color: colors.danger }]}>
              {formatMinutes(closing.carry_debit_minutes)}
            </Text>
          </View>
        ) : null}

        {closing.carry_credit_minutes > 0 ? (
          <View style={styles.row}>
            <Text style={styles.labelStrong}>Crédito que passou para {seguinte}</Text>
            <Text style={[styles.value, styles.valueStrong, { color: colors.success }]}>
              {formatMinutes(closing.carry_credit_minutes)}
            </Text>
          </View>
        ) : null}

        {!sobra ? (
          <View style={styles.row}>
            <Text style={styles.labelStrong}>Saldo que passou para {seguinte}</Text>
            <Text style={[styles.value, styles.valueStrong, { color: colors.success }]}>
              zerado
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.explanation}>
        {closing.applied_minutes === 0
          ? "Não havia horas extras para abater neste mês."
          : closing.carry_debit_minutes > 0
            ? `Suas ${formatMinutes(closing.overtime_minutes)} de horas extras foram descontadas do débito de ${formatMinutes(closing.debit_minutes)}. O que restou seguiu para ${seguinte}.`
            : `Suas horas extras cobriram todo o débito de ${formatMinutes(closing.debit_minutes)}.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  month: { flex: 1, fontSize: 22, fontWeight: "700", color: colors.text },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.chipSelected,
  },
  badgeText: { fontSize: 13, fontWeight: "700", color: colors.chipSelectedText },
  period: { fontSize: 14, color: colors.textFaint },
  rows: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { flex: 1, fontSize: 16, color: colors.textMuted },
  labelStrong: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  value: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  valueStrong: { fontSize: 22, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border },
  explanation: { fontSize: 15, color: colors.textFaint, lineHeight: 22 },
});
