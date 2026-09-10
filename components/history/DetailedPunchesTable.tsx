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
  absent: { name: "close-circle", color: colors.danger },
};

// Dimensões generosas: a tabela é lida no dia a dia por quem enxerga mal, então
// texto grande e linhas altas valem mais que caber tudo sem rolar.
const COLUMN_WIDTH = 130;
const DATA_COLUMN_WIDTH = 330;
const STATUS_COLUMN_WIDTH = 90;
const TIME_COLUMNS = [
  { key: "entrada", header: "Entrada" },
  { key: "saida", header: "Saída" },
] as const;

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
          <Cell width={STATUS_COLUMN_WIDTH}>Status</Cell>
          <Cell width={DATA_COLUMN_WIDTH}>Data</Cell>
          {TIME_COLUMNS.map(({ header }) => (
            <Cell key={header} width={COLUMN_WIDTH}>
              {header}
            </Cell>
          ))}
          <Cell width={COLUMN_WIDTH}>Saldo</Cell>
        </View>

        {rows.map((row) => {
          const icon = STATUS_ICON[row.status];
          const isFolga = row.status === "folga";
          const isAbsent = row.status === "absent";
          const isHoliday = row.status === "holiday";
          const timeColor =
            isFolga || isHoliday
              ? colors.textFaint
              : isAbsent
              ? colors.danger
              : row.status === "warning"
              ? colors.warning
              : colors.text;
          const balanceColor = (row.balanceMinutes ?? 0) >= 0 ? colors.success : colors.warning;

          return (
            <View key={row.day} style={styles.row}>
              <View style={[styles.cell, { width: STATUS_COLUMN_WIDTH, alignItems: "center" }]}>
                <Ionicons name={icon.name} size={28} color={icon.color} />
              </View>
              <Cell width={DATA_COLUMN_WIDTH}>
                {row.label}
                {isHoliday && row.holidayName ? ` · ${row.holidayName}` : ""}
              </Cell>
              {TIME_COLUMNS.map(({ key }) => (
                <Cell key={key} width={COLUMN_WIDTH} color={timeColor}>
                  {isFolga ? "FOLGA" : isHoliday ? "FERIADO" : isAbsent ? "FALTA" : row[key] ?? "—"}
                </Cell>
              ))}
              {row.hasPending ? (
                <Cell width={COLUMN_WIDTH} color={colors.warning}>
                  aguardando
                </Cell>
              ) : row.hasRejected ? (
                <Cell width={COLUMN_WIDTH} color={colors.danger}>
                  recusada
                </Cell>
              ) : (
                <Cell width={COLUMN_WIDTH} color={balanceColor} bold>
                  {row.balanceMinutes && row.balanceMinutes !== 0 ? formatMinutes(row.balanceMinutes) : ""}
                </Cell>
              )}
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
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 18,
  },
  cell: { paddingHorizontal: 8, justifyContent: "center" },
  cellText: { fontSize: 20, color: colors.textMuted },
  cellTextBold: { fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textMuted, fontSize: 18, marginTop: 24, padding: 16 },
});
