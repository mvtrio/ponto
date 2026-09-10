import { appWeekday } from "../../lib/appDate.ts";
import { formatMinutes } from "../../types/domain.ts";
import type { EmployeeReport } from "./reportData.ts";
import type { OverviewStatus } from "../admin/punchOverviewRules.ts";

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const STATUS_LABEL: Record<OverviewStatus, string> = {
  ok: "Completo",
  incomplete: "Incompleto",
  pending: "Aguardando",
  rejected: "Recusada",
  absent: "Falta",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDayLong(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y} (${WEEKDAYS_SHORT[appWeekday(day)]})`;
}

function formatPeriod(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

function signed(minutes: number): string {
  return minutes > 0 ? `+${formatMinutes(minutes)}` : formatMinutes(minutes);
}

/**
 * Relatório de ponto em HTML, pronto para virar PDF.
 *
 * Mostra o que o relatório anterior não mostrava: entrada e saída de cada dia. Traz
 * primeiro um resumo com todos os funcionários e depois o detalhamento de cada um, para
 * a folha ser útil tanto para conferência rápida quanto para auditoria dia a dia.
 */
export function buildReportHtml(
  reports: EmployeeReport[],
  fromDate: string,
  toDate: string,
  generatedAt: Date
): string {
  const periodo = `${formatPeriod(fromDate)} a ${formatPeriod(toDate)}`;
  const geradoEm = `${formatPeriod(generatedAt.toISOString().slice(0, 10))}`;

  const resumo = reports
    .map(
      (r) => `
        <tr>
          <td class="name">${escapeHtml(r.employeeName)}</td>
          <td class="num">${r.daysWorked}</td>
          <td class="num ${r.daysAbsent > 0 ? "neg" : ""}">${r.daysAbsent}</td>
          <td class="num">${r.daysIncomplete}</td>
          <td class="num">${r.daysPending}</td>
          <td class="num pos">${formatMinutes(r.overtimeMinutes)}</td>
          <td class="num neg">${formatMinutes(r.deficitMinutes)}</td>
          <td class="num ${r.balanceMinutes >= 0 ? "pos" : "neg"}"><strong>${signed(r.balanceMinutes)}</strong></td>
        </tr>`
    )
    .join("");

  const detalhes = reports
    .map((r) => {
      const linhas = r.days
        .map(
          (day) => `
            <tr class="${day.status}">
              <td>${formatDayLong(day.day)}</td>
              <td class="num">${day.entrada ?? "—"}</td>
              <td class="num">${day.saida ?? "—"}</td>
              <td class="num ${
                day.balanceMinutes === null ? "" : day.balanceMinutes >= 0 ? "pos" : "neg"
              }">${day.balanceMinutes === null ? "—" : signed(day.balanceMinutes)}</td>
              <td>${STATUS_LABEL[day.status]}</td>
            </tr>`
        )
        .join("");

      return `
        <section>
          <h2>${escapeHtml(r.employeeName)}</h2>
          <p class="sub">
            ${r.daysWorked} ${r.daysWorked === 1 ? "dia completo" : "dias completos"} ·
            ${r.daysAbsent} falta(s) ·
            ${r.daysIncomplete} incompleto(s) ·
            ${r.daysPending} aguardando aprovação ·
            saldo do período <strong class="${r.balanceMinutes >= 0 ? "pos" : "neg"}">${signed(
        r.balanceMinutes
      )}</strong>
          </p>
          <table>
            <thead>
              <tr><th>Dia</th><th class="num">Entrada</th><th class="num">Saída</th><th class="num">Saldo</th><th>Situação</th></tr>
            </thead>
            <tbody>${linhas || '<tr><td colspan="5" class="empty">Sem marcações no período</td></tr>'}</tbody>
          </table>
        </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Relatório de ponto — ${periodo}</title>
    <style>
      @page { size: A4; margin: 16mm; }
      * { box-sizing: border-box; }
      /* Largura de folha também na tela: aberto no navegador antes de imprimir, o
         relatório precisa parecer o documento que vai sair, não uma tabela esticada. */
      body {
        font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
        color: #111;
        margin: 0 auto;
        max-width: 178mm;
        padding: 12mm 0;
      }
      @media print { body { max-width: none; padding: 0; } }
      header { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 18px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      .meta { font-size: 12px; color: #555; }
      h2 { font-size: 15px; margin: 0 0 4px; }
      .sub { font-size: 12px; color: #555; margin: 0 0 8px; }
      section { margin-top: 20px; page-break-inside: avoid; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border-bottom: 1px solid #ddd; padding: 6px 8px; font-size: 12px; text-align: left; }
      th { background: #f4f4f4; border-bottom: 1px solid #999; font-weight: 600; }
      td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
      td.name { font-weight: 600; }
      .pos { color: #0a7c3f; }
      .neg { color: #b3261e; }
      tr.pending td { background: #fff8e1; }
      tr.rejected td, tr.absent td { background: #fdecea; color: #7a1c15; }
      tr.incomplete td { background: #fffbf0; }
      .empty { text-align: center; color: #777; font-style: italic; }
      footer { margin-top: 24px; font-size: 11px; color: #777; border-top: 1px solid #ddd; padding-top: 8px; }
    </style>
  </head>
  <body>
    <header>
      <h1>Relatório de ponto</h1>
      <div class="meta">Período: ${periodo} · Emitido em ${geradoEm}</div>
    </header>

    <section>
      <h2>Resumo geral</h2>
      <table>
        <thead>
          <tr>
            <th>Funcionário</th>
            <th class="num">Dias completos</th>
            <th class="num">Faltas</th>
            <th class="num">Incompletos</th>
            <th class="num">Aguardando</th>
            <th class="num">Horas extras</th>
            <th class="num">Débito</th>
            <th class="num">Saldo</th>
          </tr>
        </thead>
        <tbody>${resumo || '<tr><td colspan="8" class="empty">Sem marcações no período</td></tr>'}</tbody>
      </table>
    </section>

    ${detalhes}

    <footer>
      Dias aguardando aprovação não entram nos totais. O intervalo é descontado
      automaticamente dos dias com entrada e saída registradas.
    </footer>
  </body>
</html>`;
}
