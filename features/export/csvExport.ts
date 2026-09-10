import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { formatMinutes } from "../../types/domain";
import type { EmployeeReport } from "./reportData";
import type { OverviewStatus } from "../admin/punchOverviewRules";

const STATUS_LABEL: Record<OverviewStatus, string> = {
  ok: "Completo",
  incomplete: "Incompleto",
  pending: "Aguardando",
  rejected: "Recusada",
  absent: "Falta",
};

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Uma linha por funcionário/dia, com entrada e saída — o CSV antes trazia só totais
 * diários, sem os horários, que é justamente o que se quer conferir numa planilha.
 */
export function buildCsv(reports: EmployeeReport[]): string {
  const header = ["funcionario", "dia", "entrada", "saida", "saldo_minutos", "saldo", "situacao"];
  const lines = [header.join(",")];

  for (const report of reports) {
    for (const day of report.days) {
      lines.push(
        [
          escapeCsvField(report.employeeName),
          escapeCsvField(day.day),
          escapeCsvField(day.entrada ?? ""),
          escapeCsvField(day.saida ?? ""),
          escapeCsvField(day.balanceMinutes ?? ""),
          escapeCsvField(day.balanceMinutes === null ? "" : formatMinutes(day.balanceMinutes)),
          escapeCsvField(STATUS_LABEL[day.status]),
        ].join(",")
      );
    }
  }

  return lines.join("\n");
}

export async function exportCsv(reports: EmployeeReport[], fileName = "relatorio-ponto.csv") {
  const csv = buildCsv(reports);

  if (Platform.OS === "web") {
    // BOM para o Excel abrir os acentos corretamente.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "text/csv" });
  }
}
