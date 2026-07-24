import { StyleSheet, Text, View } from "react-native";

import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { colors } from "../../lib/theme";
import type { Correction } from "../../types/domain";

interface CorrectionRowProps {
  correction: Correction;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}

export function CorrectionRow({ correction, onApprove, onReject, loading }: CorrectionRowProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.type}>{correction.proposed_type}</Text>
      <Text style={styles.detail}>
        Novo horário: {new Date(correction.proposed_occurred_at).toLocaleString()}
      </Text>
      <Text style={styles.reason}>Motivo: {correction.reason}</Text>
      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <Button label="Rejeitar" variant="secondary" onPress={() => onReject(correction.id)} loading={loading} />
        </View>
        <View style={styles.actionButton}>
          <Button label="Aprovar" onPress={() => onApprove(correction.id)} loading={loading} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, marginBottom: 8 },
  type: { fontSize: 14, fontWeight: "700", color: colors.text, textTransform: "uppercase" },
  detail: { fontSize: 13, color: colors.textMuted },
  reason: { fontSize: 13, color: colors.textFaint, fontStyle: "italic" },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionButton: { flex: 1 },
});
