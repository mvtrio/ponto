import { test } from "node:test";
import assert from "node:assert/strict";

import { nextPunchType } from "./punchRules.ts";
import type { Punch, PunchApprovalStatus, PunchType } from "../../types/domain.ts";

function punch(type: PunchType, approval_status: PunchApprovalStatus = "pending"): Punch {
  return {
    id: `${type}-${approval_status}`,
    employee_id: "e1",
    type,
    occurred_at: "2026-09-09T13:00:00.000Z",
    created_at: "2026-09-09T13:00:00.000Z",
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

test("dia vazio começa pela entrada", () => {
  assert.equal(nextPunchType([]), "clock_in");
});

test("depois da entrada vem a saída", () => {
  assert.equal(nextPunchType([punch("clock_in")]), "clock_out");
});

test("com entrada e saída o dia está encerrado", () => {
  assert.equal(nextPunchType([punch("clock_in"), punch("clock_out")]), null);
});

test("pendente de aprovação já ocupa a vaga do dia", () => {
  // Não esperar a aprovação para bloquear: senão o funcionário bate várias entradas
  // enquanto o admin não revisa.
  assert.equal(nextPunchType([punch("clock_in", "pending")]), "clock_out");
});

test("marcação rejeitada libera a vaga de novo", () => {
  assert.equal(nextPunchType([punch("clock_in", "rejected")]), "clock_in");
  assert.equal(nextPunchType([punch("clock_in", "approved"), punch("clock_out", "rejected")]), "clock_out");
});

test("intervalos legados não interferem na decisão", () => {
  const rows = [punch("break_start", "approved"), punch("break_end", "approved")];
  assert.equal(nextPunchType(rows), "clock_in");
});
