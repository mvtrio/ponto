import assert from "node:assert/strict";
import { test } from "node:test";

import { buildAbsenceDays } from "./absenceInput.ts";

test("fim vazio registra um único dia", () => {
  const { days, error } = buildAbsenceDays("2026-09-18", "");
  assert.equal(error, null);
  assert.deepEqual(days, ["2026-09-18"]);
});

test("intervalo expande todos os dias, inclusive as pontas", () => {
  const { days, error } = buildAbsenceDays("2026-09-18", "2026-09-21");
  assert.equal(error, null);
  assert.deepEqual(days, ["2026-09-18", "2026-09-19", "2026-09-20", "2026-09-21"]);
});

test("atravessa a virada do mês sem pular dia", () => {
  const { days } = buildAbsenceDays("2026-09-29", "2026-10-02");
  assert.deepEqual(days, ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
});

test("fim anterior ao início é recusado", () => {
  const { days, error } = buildAbsenceDays("2026-09-20", "2026-09-18");
  assert.equal(days.length, 0);
  assert.match(error ?? "", /anterior/);
});

test("data inexistente é recusada", () => {
  assert.match(buildAbsenceDays("2026-02-30", "").error ?? "", /inválida/);
  assert.match(buildAbsenceDays("18/09/2026", "").error ?? "", /inválida/);
});

test("intervalo absurdo é recusado em vez de gerar milhares de linhas", () => {
  const { days, error } = buildAbsenceDays("2026-09-18", "2030-09-18");
  assert.equal(days.length, 0);
  assert.match(error ?? "", /muito longo/);
});
