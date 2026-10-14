import { test } from "node:test";
import assert from "node:assert/strict";

import { formatMinutes, formatMinutesAsWorkDays } from "./domain.ts";

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

test("débito em dias de trabalho junta os dias cheios e a sobra", () => {
  // Jornada de 8h: 19h = dois dias cheios e 3h.
  assert.equal(formatMinutesAsWorkDays(19 * 60, 480), "2 dias e 3h00");
  assert.equal(formatMinutesAsWorkDays(8 * 60 + 90, 480), "1 dia e 1h30");
  assert.equal(formatMinutesAsWorkDays(485, 480), "1 dia e 0h05");
});

test("dia exato não mostra sobra, e um dia é singular", () => {
  assert.equal(formatMinutesAsWorkDays(480, 480), "1 dia");
  assert.equal(formatMinutesAsWorkDays(960, 480), "2 dias");
});

test("abaixo de um dia não repete as horas que já estão na tela", () => {
  assert.equal(formatMinutesAsWorkDays(1, 480), "menos de 1 dia");
  assert.equal(formatMinutesAsWorkDays(479, 480), "menos de 1 dia");
});

test("sem débito ou sem jornada não há o que converter", () => {
  assert.equal(formatMinutesAsWorkDays(0, 480), null);
  assert.equal(formatMinutesAsWorkDays(-480, 480), null);
  assert.equal(formatMinutesAsWorkDays(480, 0), null);
});
