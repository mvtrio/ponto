import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../lib/theme";

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDate(now: Date): string {
  return `${WEEKDAYS[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]} de ${now.getFullYear()}`;
}

/** Relógio da hora atual, atualizado a cada segundo. */
export function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.time}>
        {pad(now.getHours())}:{pad(now.getMinutes())}
        <Text style={styles.seconds}>:{pad(now.getSeconds())}</Text>
      </Text>
      <Text style={styles.date}>{formatDate(now)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 4, paddingVertical: 8 },
  time: { fontSize: 56, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  seconds: { fontSize: 28, color: colors.textMuted },
  date: { fontSize: 14, color: colors.textMuted },
});
