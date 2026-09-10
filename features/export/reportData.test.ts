import { test } from "node:test";
import assert from "node:assert/strict";

import { buildReportData } from "./reportData.ts";
import type { OverviewRow, OverviewStatus } from "../admin/punchOverviewRules.ts";

function row(
  employeeId: string,
  employeeName: string,
  day: string,
  status: OverviewStatus,
  balanceMinutes: number | null
): OverviewRow {
  return {
    key: `${employeeId}|${day}`,
    employeeId,
    employeeName,
    day,
    entrada: status === "ok" ? "08:00" : null,
    saida: status === "ok" ? "18:00" : null,
    balanceMinutes,
    status,
  };
}

test("separa extras e débito em vez de só somar o saldo", () => {
  const [r] = buildReportData([
    row("e1", "Telma", "2026-09-01", "ok", 60),
    row("e1", "Telma", "2026-09-02", "ok", -30),
    row("e1", "Telma", "2026-09-03", "ok", 15),
  ]);

  assert.equal(r.overtimeMinutes, 75);
  assert.equal(r.deficitMinutes, 30);
  assert.equal(r.balanceMinutes, 45);
  assert.equal(r.daysWorked, 3);
});

test("dias pendentes ficam fora dos totais", () => {
  const [r] = buildReportData([
    row("e1", "Telma", "2026-09-01", "ok", 60),
    row("e1", "Telma", "2026-09-02", "pending", null),
  ]);

  assert.equal(r.daysPending, 1);
  assert.equal(r.daysWorked, 1, "pendente não conta como dia completo");
  assert.equal(r.balanceMinutes, 60, "pendente não pode alterar o saldo apurado");
});

test("dia incompleto conta como incompleto e entra no saldo", () => {
  const [r] = buildReportData([row("e1", "Telma", "2026-09-01", "incomplete", -480)]);

  assert.equal(r.daysIncomplete, 1);
  assert.equal(r.daysWorked, 0);
  assert.equal(r.balanceMinutes, -480);
  assert.equal(r.deficitMinutes, 480);
});

test("agrupa por funcionário, em ordem alfabética, com dias em ordem cronológica", () => {
  const reports = buildReportData([
    row("e2", "Ana", "2026-09-02", "ok", 0),
    row("e1", "Telma", "2026-09-03", "ok", 0),
    row("e1", "Telma", "2026-09-01", "ok", 0),
  ]);

  assert.deepEqual(reports.map((r) => r.employeeName), ["Ana", "Telma"]);
  assert.deepEqual(reports[1].days.map((d) => d.day), ["2026-09-01", "2026-09-03"]);
});
