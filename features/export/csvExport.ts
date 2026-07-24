import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import type { DailySummary } from "../../types/domain";

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(rows: DailySummary[], employeeName: string): string {
  const header = ["funcionario", "dia", "minutos_trabalhados", "jornada_padrao_minutos", "saldo_minutos", "incompleto"];
  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        escapeCsvField(employeeName),
        escapeCsvField(row.day),
        escapeCsvField(row.worked_minutes),
        escapeCsvField(row.standard_daily_minutes),
        escapeCsvField(row.balance_minutes),
        escapeCsvField(row.is_incomplete ? "sim" : "nao"),
      ].join(",")
    );
  }

  return lines.join("\n");
}

export async function exportCsv(rows: DailySummary[], employeeName: string, fileName = "relatorio-ponto.csv") {
  const csv = buildCsv(rows, employeeName);

  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: "text/csv" });
  }
}
