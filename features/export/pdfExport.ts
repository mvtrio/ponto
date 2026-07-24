import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import type { DailySummary } from "../../types/domain";
import { formatMinutes } from "../../types/domain";

function buildHtml(rows: DailySummary[], employeeName: string, fromDate: string, toDate: string): string {
  const totalBalance = rows.reduce((sum, r) => sum + r.balance_minutes, 0);

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${row.day}</td>
          <td>${formatMinutes(row.worked_minutes)}</td>
          <td>${formatMinutes(row.standard_daily_minutes)}</td>
          <td>${formatMinutes(row.balance_minutes)}</td>
          <td>${row.is_incomplete ? "Sim" : "Não"}</td>
        </tr>`
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; }
          h1 { font-size: 18px; }
          p { color: #444; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 13px; }
          th { background: #f2f2f2; }
          .total { margin-top: 16px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Relatório de ponto — ${employeeName}</h1>
        <p>Período: ${fromDate} a ${toDate}</p>
        <table>
          <thead>
            <tr><th>Dia</th><th>Horas trabalhadas</th><th>Jornada padrão</th><th>Saldo</th><th>Incompleto</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <p class="total">Saldo total do período: ${formatMinutes(totalBalance)}</p>
      </body>
    </html>`;
}

export async function exportPdf(rows: DailySummary[], employeeName: string, fromDate: string, toDate: string) {
  const html = buildHtml(rows, employeeName, fromDate, toDate);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
  }
}
