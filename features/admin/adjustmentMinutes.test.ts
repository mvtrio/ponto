import { test } from "node:test";
import assert from "node:assert/strict";

import { parseAdjustmentMinutes } from "./adjustmentMinutes.ts";

test("horas e minutos viram o total em minutos", () => {
  assert.deepEqual(parseAdjustmentMinutes("1", "30", "credit"), { minutes: 90, error: null });
  assert.deepEqual(parseAdjustmentMinutes("2", "", "credit"), { minutes: 120, error: null });
  assert.deepEqual(parseAdjustmentMinutes("", "45", "credit"), { minutes: 45, error: null });
});

test("débito vira número negativo", () => {
  assert.deepEqual(parseAdjustmentMinutes("1", "30", "debit"), { minutes: -90, error: null });
});

test("minuto acima de 59 é recusado em vez de virar hora silenciosamente", () => {
  // "1h90" seria 2h30 se somado à toa; melhor recusar do que lançar o que não foi pedido.
  assert.equal(parseAdjustmentMinutes("1", "90", "credit").error, "Os minutos vão de 0 a 59.");
});

test("valores inválidos não geram lançamento", () => {
  assert.equal(parseAdjustmentMinutes("abc", "0", "credit").error, "Horas inválidas.");
  assert.equal(parseAdjustmentMinutes("1.5", "0", "credit").error, "Horas inválidas.");
  assert.equal(parseAdjustmentMinutes("-2", "0", "credit").error, "Horas inválidas.");
  assert.equal(parseAdjustmentMinutes("0", "0", "credit").error, "Informe um valor maior que zero.");
});
