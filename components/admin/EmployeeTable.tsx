import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../lib/theme";
import { formatMinutes } from "../../types/domain";

export interface EmployeeRow {
  id: string;
  fullName: string;
  active: boolean;
  balanceMinutes: number | null;
}

export function EmployeeTable({ rows, onPress }: { rows: EmployeeRow[]; onPress: (id: string) => void }) {
  return (
    <View>
      {rows.map((row) => (
        <Pressable key={row.id} style={styles.row} onPress={() => onPress(row.id)}>
          <View style={styles.info}>
            <Text style={styles.name}>{row.fullName}</Text>
            {!row.active ? <Text style={styles.inactive}>inativo</Text> : null}
          </View>
          <Text
            style={[
              styles.balance,
              { color: (row.balanceMinutes ?? 0) >= 0 ? colors.success : colors.danger },
            ]}
          >
            {row.balanceMinutes !== null ? formatMinutes(row.balanceMinutes) : "—"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  info: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  inactive: { fontSize: 11, color: colors.warning },
  balance: { fontSize: 15, fontWeight: "700" },
});
