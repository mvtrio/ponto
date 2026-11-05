import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { appToday } from "../../lib/appDate";
import { colors } from "../../lib/theme";
import { brToIso, isoFromParts, isoToBr, maskBr, monthGrid, MONTH_NAMES, WEEKDAY_INITIALS } from "./brDate";

interface DateFieldProps {
  /** Data em AAAA-MM-DD (ou o texto incompleto que a pessoa está digitando). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Estilo do contêiner (largura, flex). */
  style?: StyleProp<ViewStyle>;
  /** Estilo da caixa de texto, para casar com os outros campos da tela. */
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * Campo de data no padrão brasileiro com atalho de calendário.
 *
 * Mostra DD/MM/AAAA e entrega AAAA-MM-DD a quem usa: as telas e o banco continuam
 * falando ISO. Enquanto a data está incompleta, entrega o texto como está — as
 * validações das telas o recusam, como recusavam antes.
 */
export function DateField({ value, onChange, placeholder = "DD/MM/AAAA", style, inputStyle }: DateFieldProps) {
  const [text, setText] = useState(() => isoToBr(value));
  const [open, setOpen] = useState(false);

  // A tela também muda o valor (botões de período, limpar após salvar): acompanha.
  useEffect(() => {
    const br = isoToBr(value);
    if (br) setText((current) => (current === br ? current : br));
    else if (value === "") setText("");
  }, [value]);

  function handleText(raw: string) {
    const masked = maskBr(raw);
    setText(masked);
    if (masked === "") onChange("");
    else onChange(brToIso(masked) ?? masked);
  }

  function handlePick(iso: string) {
    setText(isoToBr(iso));
    onChange(iso);
    setOpen(false);
  }

  return (
    <View style={[styles.wrapper, style]}>
      <TextInput
        style={[styles.input, inputStyle, styles.inputWithButton]}
        value={text}
        onChangeText={handleText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType="number-pad"
        maxLength={10}
      />
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.calendarButton}
        accessibilityRole="button"
        accessibilityLabel="Abrir calendário"
        hitSlop={8}
      >
        <Ionicons name="calendar" size={22} color={colors.accent} />
      </Pressable>

      {open ? (
        <CalendarModal selected={brToIso(text)} onPick={handlePick} onClose={() => setOpen(false)} />
      ) : null}
    </View>
  );
}

function CalendarModal({
  selected,
  onPick,
  onClose,
}: {
  selected: string | null;
  onPick: (iso: string) => void;
  onClose: () => void;
}) {
  const today = appToday();
  const start = selected ?? today;
  const [year, setYear] = useState(Number(start.slice(0, 4)));
  const [month, setMonth] = useState(Number(start.slice(5, 7)));

  function shift(delta: number) {
    const index = year * 12 + (month - 1) + delta;
    setYear(Math.floor(index / 12));
    setMonth((index % 12) + 1);
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Toque dentro do calendário não fecha: só o fundo fecha. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Pressable onPress={() => shift(-1)} style={styles.navButton} accessibilityLabel="Mês anterior">
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.monthTitle}>
              {MONTH_NAMES[month - 1]} de {year}
            </Text>
            <Pressable onPress={() => shift(1)} style={styles.navButton} accessibilityLabel="Próximo mês">
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.week}>
            {WEEKDAY_INITIALS.map((initial, i) => (
              <Text key={i} style={[styles.cell, styles.weekdayInitial]}>
                {initial}
              </Text>
            ))}
          </View>

          {monthGrid(year, month).map((week, w) => (
            <View key={w} style={styles.week}>
              {week.map((day, i) => {
                if (day === null) return <View key={i} style={styles.cell} />;
                const iso = isoFromParts(year, month, day);
                const isSelected = iso === selected;
                const isToday = iso === today;
                return (
                  <Pressable
                    key={i}
                    onPress={() => onPick(iso)}
                    style={[styles.cell, styles.dayCell, isToday && styles.todayCell, isSelected && styles.selectedCell]}
                    accessibilityLabel={isoToBr(iso)}
                  >
                    <Text style={[styles.dayText, isSelected && styles.selectedText]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.footer}>
            <Pressable onPress={() => onPick(today)} style={styles.footerButton}>
              <Text style={styles.footerAccent}>Hoje</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.footerButton}>
              <Text style={styles.footerText}>Fechar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CELL = 44;

const styles = StyleSheet.create({
  wrapper: { position: "relative", justifyContent: "center" },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  // Espaço para o botão do calendário não cobrir o texto.
  inputWithButton: { paddingRight: 48 },
  calendarButton: {
    position: "absolute",
    right: 6,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  navButton: { width: CELL, height: CELL, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  monthTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  week: { flexDirection: "row" },
  cell: { width: CELL, height: CELL, alignItems: "center", justifyContent: "center", textAlign: "center" },
  weekdayInitial: { fontSize: 14, fontWeight: "700", color: colors.textMuted, lineHeight: CELL },
  dayCell: { borderRadius: 999 },
  todayCell: { borderWidth: 1, borderColor: colors.accent },
  selectedCell: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayText: { fontSize: 16, color: colors.text },
  selectedText: { color: colors.accentText, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  footerButton: { paddingVertical: 10, paddingHorizontal: 12 },
  footerAccent: { fontSize: 16, fontWeight: "700", color: colors.accent },
  footerText: { fontSize: 16, color: colors.textMuted },
});
