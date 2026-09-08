import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "../../lib/theme";
import { formatMinutes } from "../../types/domain";
import type { DetailedDayRow } from "../../features/hours/detailedDayRows";

const STATUS_ICON: Record<DetailedDayRow["status"], { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  ok: { name: "checkmark-circle", color: colors.success },
  warning: { name: "warning", color: colors.warning },
  folga: { name: "checkmark-circle", color: colors.success },
  holiday: { name: "flag", color: colors.accent },
};

const COLUMN_WIDTH = 90;
const DATA_COLUMN_WIDTH = 150;
const TIME_COLUMNS = ["entrada1", "saida1", "entrada2", "saida2", "entrada3", "saida3"] as const;
const TIME_HEADERS = ["Entrada 1", "Saída 1", "Entrada 2", "Saída 2", "Entrada 3", "Saída 3"];

function Cell({
  children,
  width,
  color,
  bold,
}: {
  children: React.ReactNode;
  width: number;
  color?: string;
  bold?: boolean;
}) {
  return (
    <View style={[styles.cell, { width }]}>
      <Text
        style={[styles.cellText, color ? { color } : null, bold ? styles.cellTextBold : null]}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

export function DetailedPunchesTable({ rows, loading }: { rows: DetailedDayRow[]; loading: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={styles.headerRow}>
          <Cell width={44}>Status</Cell>
          <Cell width={DATA_COLUMN_WIDTH}>Data</Cell>
          {TIME_HEADERS.map((header) => (
            <Cell key={header} width={COLUMN_WIDTH}>
              {header}
            </Cell>
          ))}
          <Cell width={COLUMN_WIDTH}>Saldo</Cell>
        </View>

        {rows.map((row) => {
          const icon = STATUS_ICON[row.status];
          const isFolga = row.status === "folga";
          const isHoliday = row.status === "holiday";
          const timeColor =
            isFolga || isHoliday ? colors.textFaint : row.status === "warning" ? colors.warning : colors.text;
          const balanceColor = (row.balanceMinutes ?? 0) >= 0 ? colors.success : colors.warning;

          return (
            <View key={row.day} style={styles.row}>
              <View style={[styles.cell, { width: 44, alignItems: "center" }]}>
                <Ionicons name={icon.name} size={18} color={icon.color} />
              </View>
              <Cell width={DATA_COLUMN_WIDTH}>
                {row.label}
                {isHoliday && row.holidayName ? ` · ${row.holidayName}` : ""}
              </Cell>
              {TIME_COLUMNS.map((key) => (
                <Cell key={key} width={COLUMN_WIDTH} color={timeColor}>
                  {isFolga ? "FOLGA" : isHoliday ? "FERIADO" : row[key] ?? "—"}
                </Cell>
              ))}
              <Cell width={COLUMN_WIDTH} color={balanceColor} bold>
                {row.balanceMinutes && row.balanceMinutes !== 0 ? formatMinutes(row.balanceMinutes) : ""}
              </Cell>
            </View>
          );
        })}

        {!loading && rows.length === 0 ? <Text style={styles.empty}>Nenhum registro no período</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
  },
  cell: { paddingHorizontal: 6, justifyContent: "center" },
  cellText: { fontSize: 12, color: colors.textMuted },
  cellTextBold: { fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 24, padding: 16 },
});
