import { test } from "node:test";
import assert from "node:assert/strict";

import { buildOverviewRows } from "./punchOverviewRules.ts";
import type { DailySummary, Punch, PunchApprovalStatus, PunchType } from "../../types/domain.ts";

const NAMES = new Map([["e1", "Telma"], ["e2", "Ana"]]);

function punch(
  employee_id: string,
  type: PunchType,
  occurred_at: string,
  approval_status: PunchApprovalStatus = "approved"
): Punch {
  return {
    id: `${employee_id}-${type}-${occurred_at}`,
    employee_id,
    type,
    occurred_at,
    created_at: occurred_at,
    latitude: null,
    longitude: null,
    location_accuracy_m: null,
    photo_path: null,
    source: "mobile",
    is_corrected: false,
    superseded_by: null,
    approval_status,
    approved_by: null,
    approved_at: null,
  };
}

function summary(employee_id: string, day: string, balance_minutes: number): DailySummary {
  return {
    employee_id,
    day,
    worked_minutes: 480 + balance_minutes,
    is_incomplete: false,
    standard_daily_minutes: 480,
    balance_minutes,
  };
}

test("dia com par aprovado fica completo e mostra o saldo", () => {
  const rows = buildOverviewRows(
    [
      punch("e1", "clock_in", "2026-09-09T11:00:00.000Z"),
      punch("e1", "clock_out", "2026-09-09T21:00:00.000Z"),
    ],
    [summary("e1", "2026-09-09", 60)],
    NAMES
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "ok");
  assert.equal(rows[0].employeeName, "Telma");
  assert.equal(rows[0].entrada, "08:00");
  assert.equal(rows[0].saida, "18:00");
  assert.equal(rows[0].balanceMinutes, 60);
});

test("pendente domina e não exibe saldo", () => {
  const rows = buildOverviewRows(
    [
      punch("e1", "clock_in", "2026-09-09T11:00:00.000Z", "approved"),
      punch("e1", "clock_out", "2026-09-09T21:00:00.000Z", "pending"),
    ],
    [summary("e1", "2026-09-09", 60)],
    NAMES
  );

  assert.equal(rows[0].status, "pending");
  assert.equal(rows[0].balanceMinutes, null, "saldo pendente não vale, não pode virar número");
});

test("sem saída o dia fica incompleto", () => {
  const rows = buildOverviewRows([punch("e1", "clock_in", "2026-09-09T11:00:00.000Z")], [], NAMES);
  assert.equal(rows[0].status, "incomplete");
  assert.equal(rows[0].saida, null);
});

test("recusada só vira status do dia quando não sobra marcação válida", () => {
  const soRecusada = buildOverviewRows(
    [punch("e1", "clock_in", "2026-09-09T11:00:00.000Z", "rejected")],
    [],
    NAMES
  );
  assert.equal(soRecusada[0].status, "rejected");
  assert.equal(soRecusada[0].entrada, null, "marcação recusada não ocupa a coluna de entrada");

  const recusadaComValida = buildOverviewRows(
    [
      punch("e1", "clock_in", "2026-09-09T11:00:00.000Z", "approved"),
      punch("e1", "clock_out", "2026-09-09T20:00:00.000Z", "rejected"),
    ],
    [],
    NAMES
  );
  assert.equal(recusadaComValida[0].status, "incomplete");
  assert.equal(recusadaComValida[0].entrada, "08:00");
});

test("marcação da noite não escorrega para o dia seguinte", () => {
  // 21:30 em Brasília = 00:30 UTC do dia seguinte.
  const rows = buildOverviewRows([punch("e1", "clock_out", "2026-09-10T00:30:00.000Z")], [], NAMES);
  assert.equal(rows[0].day, "2026-09-09");
});

test("ordena por dia mais recente e depois por nome", () => {
  const rows = buildOverviewRows(
    [
      punch("e2", "clock_in", "2026-09-09T11:00:00.000Z"),
      punch("e1", "clock_in", "2026-09-09T11:00:00.000Z"),
      punch("e1", "clock_in", "2026-09-10T11:00:00.000Z"),
    ],
    [],
    NAMES
  );

  assert.deepEqual(
    rows.map((r) => `${r.day} ${r.employeeName}`),
    ["2026-09-10 Telma", "2026-09-09 Ana", "2026-09-09 Telma"]
  );
});
