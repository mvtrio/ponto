import { test } from "node:test";
import assert from "node:assert/strict";

import { formatMinutes } from "./domain.ts";

test("formata horas e minutos com dois dígitos", () => {
  assert.equal(formatMinutes(0), "0h00");
  assert.equal(formatMinutes(5), "0h05");
  assert.equal(formatMinutes(60), "1h00");
  assert.equal(formatMinutes(485), "8h05");
});

test("saldo negativo mantém o sinal e não vira minuto negativo", () => {
  assert.equal(formatMinutes(-5), "-0h05");
  assert.equal(formatMinutes(-485), "-8h05");
  assert.equal(formatMinutes(-960), "-16h00");
});
