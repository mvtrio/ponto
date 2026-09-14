import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Card } from "../ui/Card";
import { WeekdayLabel } from "../ui/WeekdayLabel";
import { colors } from "../../lib/theme";

interface PeriodFilterProps {
  fromDate: string;
  toDate: string;
  onChangeFromDate: (value: string) => void;
  onChangeToDate: (value: string) => void;
}

export function PeriodFilter({ fromDate, toDate, onChangeFromDate, onChangeToDate }: PeriodFilterProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>Filtrar</Text>
      <View style={styles.row}>
        <Text style={styles.hint}>Insira o período</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
      </View>
      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <TextInput
            style={styles.dateInput}
            value={fromDate}
            onChangeText={onChangeFromDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.textFaint}
          />
          <WeekdayLabel day={fromDate} style={styles.weekday} />
        </View>
        <Text style={styles.dash}>—</Text>
        <View style={styles.dateField}>
          <TextInput
            style={styles.dateInput}
            value={toDate}
            onChangeText={onChangeToDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.textFaint}
          />
          <WeekdayLabel day={toDate} style={styles.weekday} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, flexGrow: 1, minWidth: 260 },
  label: { fontSize: 15, fontWeight: "700", color: colors.text },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hint: { fontSize: 12, color: colors.textFaint },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateField: { flex: 1, gap: 4 },
  weekday: { fontSize: 17 },
  dateInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  dash: { color: colors.textFaint },
});
