import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { appDate, appTime } from "../../lib/appDate";
import { colors } from "../../lib/theme";
import { PUNCH_TYPE_LABELS, type Punch, type PunchApprovalStatus } from "../../types/domain";

const STATUS_META: Record<
  PunchApprovalStatus,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  approved: { label: "Aceita", color: colors.success, icon: "thumbs-up" },
  pending: { label: "Aguardando", color: colors.warning, icon: "time" },
  rejected: { label: "Recusada", color: colors.danger, icon: "close-circle" },
};

/**
 * Últimos registros em lista vertical: cada marcação em uma linha, com data, hora e
 * status. Substitui a tabela larga, que obrigava a rolar a tela para o lado só para ver
 * o essencial — e essa tela é usada por quem enxerga mal.
 */
export function PunchHistoryList({ punches, loading }: { punches: Punch[]; loading: boolean }) {
  if (!loading && punches.length === 0) {
    return <Text style={styles.empty}>Nenhum registro ainda</Text>;
  }

  return (
    <View>
      {punches.map((punch) => {
        const meta = STATUS_META[punch.approval_status];
        const [, mm, dd] = appDate(punch.occurred_at).split("-");
        return (
          <View key={punch.id} style={styles.row}>
            <View style={styles.left}>
              <Ionicons name="document-text-outline" size={26} color={colors.textMuted} />
              <Text style={styles.when}>
                {dd}/{mm} - {appTime(punch.occurred_at)}
              </Text>
              <Text style={styles.type}>{PUNCH_TYPE_LABELS[punch.type]}</Text>
            </View>
            <View style={styles.right}>
              <Text style={[styles.status, { color: meta.color }]}>{meta.label}</Text>
              <Ionicons name={meta.icon} size={26} color={meta.color} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  when: { fontSize: 20, color: colors.text, fontVariant: ["tabular-nums"] },
  type: { fontSize: 16, color: colors.textFaint },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  status: { fontSize: 18, fontWeight: "600" },
  empty: { textAlign: "center", fontSize: 18, color: colors.textMuted, paddingVertical: 24 },
});
