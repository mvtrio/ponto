import { test } from "node:test";
import assert from "node:assert/strict";

import { canPunchOnDay, daysMissingClockOut, nextPunchType } from "./punchRules.ts";
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

test("fim de semana não permite marcação", () => {
  const seg_a_sex = [1, 2, 3, 4, 5];
  assert.equal(canPunchOnDay("2026-09-11", seg_a_sex), true, "sexta-feira");
  assert.equal(canPunchOnDay("2026-09-12", seg_a_sex), false, "sábado");
  assert.equal(canPunchOnDay("2026-09-13", seg_a_sex), false, "domingo");
  assert.equal(canPunchOnDay("2026-09-14", seg_a_sex), true, "segunda-feira");
});

test("escala diferente muda o que é dia de trabalho", () => {
  // Escala que inclui sábado: a regra vem de company_settings, não do código.
  assert.equal(canPunchOnDay("2026-09-12", [1, 2, 3, 4, 5, 6]), true);
});

function at(day: string, hora: string, type: PunchType, approval_status: PunchApprovalStatus = "approved"): Punch {
  return {
    ...punch(type, approval_status),
    id: `${day}-${type}-${approval_status}`,
    // 09:00 em Brasília = 12:00 UTC.
    occurred_at: `${day}T${hora}:00.000Z`,
  };
}

test("aponta o dia em que faltou bater a saída", () => {
  const rows = [at("2026-09-15", "12:00", "clock_in")];
  assert.deepEqual(daysMissingClockOut(rows, "2026-09-16"), ["2026-09-15"]);
});

test("saída aguardando aprovação já conta como registrada", () => {
  // A funcionária fez a parte dela; o que falta é a revisão do admin. Avisar
  // "você não registrou" aqui seria falso.
  const rows = [at("2026-09-15", "12:00", "clock_in"), at("2026-09-15", "21:00", "clock_out", "pending")];
  assert.deepEqual(daysMissingClockOut(rows, "2026-09-16"), []);
});

test("saída recusada volta a faltar", () => {
  const rows = [at("2026-09-15", "12:00", "clock_in"), at("2026-09-15", "21:00", "clock_out", "rejected")];
  assert.deepEqual(daysMissingClockOut(rows, "2026-09-16"), ["2026-09-15"]);
});

test("o dia de hoje não é cobrado", () => {
  const rows = [at("2026-09-16", "12:00", "clock_in")];
  assert.deepEqual(daysMissingClockOut(rows, "2026-09-16"), []);
});

test("dia completo não gera aviso, e vários dias vêm do mais recente", () => {
  const rows = [
    at("2026-09-14", "12:00", "clock_in"),
    at("2026-09-14", "21:00", "clock_out"),
    at("2026-09-11", "12:00", "clock_in"),
    at("2026-09-15", "12:00", "clock_in"),
  ];
  assert.deepEqual(daysMissingClockOut(rows, "2026-09-16"), ["2026-09-15", "2026-09-11"]);
});
