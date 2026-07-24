import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { CorrectionRow } from "../../components/admin/CorrectionRow";
import { approveCorrection } from "../../features/corrections/correctionService";
import { usePendingCorrections } from "../../features/corrections/useCorrections";
import { colors } from "../../lib/theme";

export default function CorrectionsScreen() {
  const { corrections, loading, error, reload } = usePendingCorrections();
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function handleReview(id: string, approve: boolean) {
    setProcessingId(id);
    try {
      await approveCorrection(id, approve);
      await reload();
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={corrections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <CorrectionRow
            correction={item}
            onApprove={(id) => handleReview(id, true)}
            onReject={(id) => handleReview(id, false)}
            loading={processingId === item.id}
          />
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Nenhuma correção pendente</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  error: { color: colors.danger, padding: 16 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
});
