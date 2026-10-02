import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildCumulativeSeries,
  buildDailyBalanceSeries,
  buildDayComposition,
  buildMonthlyTotals,
  buildPeriodMetrics,
  monthStart,
  monthsBefore,
} from "./dashboardMetrics.ts";
import type { OverviewRow, OverviewStatus } from "./punchOverviewRules.ts";
import type { DailySummary } from "../../types/domain.ts";

function row(day: string, status: OverviewStatus): OverviewRow {
  return {
    key: `e1|${day}`,
    employeeId: "e1",
    employeeName: "Telma",
    day,
    entrada: null,
    saida: null,
    balanceMinutes: null,
    status,
  };
}

function summary(
  day: string,
  worked_minutes: number,
  absence_kind: DailySummary["absence_kind"] = null
): DailySummary {
  return {
    employee_id: "e1",
    day,
    worked_minutes,
    is_incomplete: false,
    standard_daily_minutes: 480,
    balance_minutes: absence_kind ? 0 : worked_minutes - 480,
    absence_kind,
  };
}

test("conta cada status na sua categoria", () => {
  const m = buildPeriodMetrics(
    [
      row("2026-09-01", "ok"),
      row("2026-09-02", "ok"),
      row("2026-09-03", "absent"),
      row("2026-09-04", "atestado"),
      row("2026-09-07", "folga"),
      row("2026-09-08", "incomplete"),
      row("2026-09-09", "pending"),
      row("2026-09-10", "rejected"),
    ],
    []
  );

  assert.equal(m.workedDays, 2);
  assert.equal(m.absentDays, 1);
  assert.equal(m.justifiedDays, 2);
  assert.equal(m.incompleteDays, 2); // incomplete + rejected
  assert.equal(m.pendingDays, 1);
});

test("dia justificado não entra na jornada esperada", () => {
  const m = buildPeriodMetrics([], [summary("2026-09-01", 480), summary("2026-09-02", 0, "atestado")]);
  assert.equal(m.workedMinutes, 480);
  assert.equal(m.expectedMinutes, 480);
});

test("assiduidade ignora dias justificados nas duas pontas", () => {
  // 3 presentes, 1 falta, 2 atestados: 3/4 e não 3/6.
  const m = buildPeriodMetrics(
    [
      row("2026-09-01", "ok"),
      row("2026-09-02", "ok"),
      row("2026-09-03", "ok"),
      row("2026-09-04", "absent"),
      row("2026-09-07", "atestado"),
      row("2026-09-08", "folga"),
    ],
    []
  );
  assert.equal(m.attendanceRate, 0.75);
});

test("sem dia cobrado a assiduidade é nula, não 100%", () => {
  // Um mês só de atestado não é assiduidade perfeita: não há base para afirmar nada.
  const m = buildPeriodMetrics([row("2026-09-01", "atestado"), row("2026-09-02", "pending")], []);
  assert.equal(m.attendanceRate, null);
});

test("dia incompleto conta como presente, mas não como trabalhado", () => {
  const m = buildPeriodMetrics([row("2026-09-01", "ok"), row("2026-09-02", "incomplete")], []);
  assert.equal(m.workedDays, 1);
  assert.equal(m.incompleteDays, 1);
  assert.equal(m.attendanceRate, 1);
});

test("série diária sai em ordem cronológica, com o dia do mês no rótulo", () => {
  const pontos = buildDailyBalanceSeries([
    summary("2026-09-10", 540),
    summary("2026-09-03", 420),
    summary("2026-09-07", 480),
  ]);
  assert.deepEqual(
    pontos.map((p) => p.label),
    ["03", "07", "10"]
  );
  assert.deepEqual(
    pontos.map((p) => p.value),
    [-60, 0, 60]
  );
});

test("primeiro dia do mês", () => {
  assert.equal(monthStart("2026-10-02"), "2026-10-01");
  assert.equal(monthStart("2026-01-31"), "2026-01-01");
});

test("meses atrás atravessa a virada do ano", () => {
  assert.equal(monthsBefore("2026-10-02", 0), "2026-10-01");
  assert.equal(monthsBefore("2026-10-02", 5), "2026-05-01");
  assert.equal(monthsBefore("2026-02-15", 5), "2025-09-01");
  assert.equal(monthsBefore("2026-01-10", 1), "2025-12-01");
});

test("saldo acumulado soma dia a dia, não repete o saldo do dia", () => {
  const pontos = buildCumulativeSeries([
    summary("2026-09-01", 540), // +60
    summary("2026-09-02", 420), // -60
    summary("2026-09-03", 600), // +120
  ]);
  assert.deepEqual(
    pontos.map((p) => p.value),
    [60, 0, 120]
  );
});

test("acumulado respeita a ordem cronológica mesmo recebendo embaralhado", () => {
  const pontos = buildCumulativeSeries([summary("2026-09-03", 600), summary("2026-09-01", 540)]);
  assert.deepEqual(
    pontos.map((p) => p.label),
    ["01", "03"]
  );
  assert.deepEqual(
    pontos.map((p) => p.value),
    [60, 180]
  );
});

test("totais por mês separam extras de débito", () => {
  const totais = buildMonthlyTotals([
    summary("2026-09-01", 540), // +60
    summary("2026-09-02", 420), // -60
    summary("2026-10-01", 600), // +120
  ]);
  assert.deepEqual(totais, [
    { month: "2026-09", overtimeMinutes: 60, deficitMinutes: 60 },
    { month: "2026-10", overtimeMinutes: 120, deficitMinutes: 0 },
  ]);
});

test("composição descarta as fatias zeradas", () => {
  const metrics = buildPeriodMetrics(
    [row("2026-09-01", "ok"), row("2026-09-02", "ok"), row("2026-09-03", "atestado")],
    []
  );
  const fatias = buildDayComposition(metrics);
  assert.deepEqual(
    fatias.map((f) => [f.key, f.value]),
    [
      ["worked", 2],
      ["justified", 1],
    ]
  );
});
