import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";

import { Card } from "../ui/Card";
import { SegmentedControl } from "../ui/SegmentedControl";
import { colors } from "../../lib/theme";
import type { Granularity } from "../../features/hours/indicatorsService";

const GRANULARITY_OPTIONS: { label: string; value: Granularity }[] = [
  { label: "Dia", value: "day" },
  { label: "Semana", value: "week" },
  { label: "Mês", value: "month" },
];

interface IndicatorCardProps {
  title: string;
  granularity: Granularity;
  onGranularityChange: (value: Granularity) => void;
  children: ReactNode;
}

export function IndicatorCard({ title, granularity, onGranularityChange, children }: IndicatorCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <SegmentedControl options={GRANULARITY_OPTIONS} value={granularity} onChange={onGranularityChange} />
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, flexGrow: 1, minWidth: 280 },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
});
