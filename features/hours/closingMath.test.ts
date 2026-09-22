import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyOvertimeToDebit,
  isValidMonth,
  monthEnd,
  monthLabel,
  previousMonthStart,
} from "./closingMath.ts";

test("último dia do mês, inclusive fevereiro bissexto", () => {
  assert.equal(monthEnd("2026-08"), "2026-08-31");
  assert.equal(monthEnd("2026-09"), "2026-09-30");
  assert.equal(monthEnd("2026-02"), "2026-02-28");
  assert.equal(monthEnd("2024-02"), "2024-02-29");
  assert.equal(monthEnd("2026-12"), "2026-12-31");
});

test("mês pela metade falha alto, sem gerar data inválida", () => {
  // O campo passa por estes valores enquanto alguém digita. Antes disso a data saía
  // inválida e só estourava no toISOString, derrubando a tela.
  for (const parcial of ["2026-0", "2026", "", "2026-13", "2026-00", "abc"]) {
    assert.throws(() => monthEnd(parcial), /Mês inválido/, `deveria recusar "${parcial}"`);
  }
});

test("isValidMonth separa mês completo de digitação pela metade", () => {
  assert.equal(isValidMonth("2026-09"), true);
  assert.equal(isValidMonth("2026-12"), true);
  assert.equal(isValidMonth("2026-0"), false);
  assert.equal(isValidMonth("2026-13"), false);
  assert.equal(isValidMonth("2026-00"), false);
  assert.equal(isValidMonth(""), false);
});

test("extras menores que o débito: abatem tudo que podem e o resto do débito segue", () => {
  // O caso real de setembro/2026: 8h30 devidas, 7h44 de extras.
  const r = applyOvertimeToDebit({ debitMinutes: 510, overtimeMinutes: 464 });
  assert.equal(r.appliedMinutes, 464);
  assert.equal(r.carryDebitMinutes, 46);
  assert.equal(r.carryCreditMinutes, 0);
});

test("extras maiores que o débito: débito zera e a sobra vira crédito", () => {
  const r = applyOvertimeToDebit({ debitMinutes: 510, overtimeMinutes: 600 });
  assert.equal(r.appliedMinutes, 510);
  assert.equal(r.carryDebitMinutes, 0);
  assert.equal(r.carryCreditMinutes, 90);
});

test("nunca sobra dos dois lados ao mesmo tempo", () => {
  for (const [debit, overtime] of [
    [0, 0],
    [100, 0],
    [0, 100],
    [300, 300],
    [510, 464],
    [464, 510],
  ]) {
    const r = applyOvertimeToDebit({ debitMinutes: debit, overtimeMinutes: overtime });
    assert.equal(
      r.carryDebitMinutes === 0 || r.carryCreditMinutes === 0,
      true,
      `sobrou dos dois lados com ${debit}/${overtime}`
    );
  }
});

test("o que entra é conservado: nada some no fechamento", () => {
  const r = applyOvertimeToDebit({ debitMinutes: 510, overtimeMinutes: 464 });
  assert.equal(r.appliedMinutes + r.carryDebitMinutes, 510);
  assert.equal(r.appliedMinutes + r.carryCreditMinutes, 464);
});

test("empate zera os dois lados", () => {
  const r = applyOvertimeToDebit({ debitMinutes: 480, overtimeMinutes: 480 });
  assert.equal(r.appliedMinutes, 480);
  assert.equal(r.carryDebitMinutes, 0);
  assert.equal(r.carryCreditMinutes, 0);
});

test("valores negativos não invertem o sentido do abatimento", () => {
  const r = applyOvertimeToDebit({ debitMinutes: -100, overtimeMinutes: 60 });
  assert.equal(r.appliedMinutes, 0);
  assert.equal(r.carryDebitMinutes, 0);
  assert.equal(r.carryCreditMinutes, 60);
});

test("rótulo do mês em português", () => {
  assert.equal(monthLabel("2026-09-01"), "Setembro/2026");
  assert.equal(monthLabel("2026-03-15"), "Março/2026");
});

test("mês anterior atravessa a virada do ano", () => {
  assert.equal(previousMonthStart("2026-09-22"), "2026-08-01");
  assert.equal(previousMonthStart("2026-01-05"), "2025-12-01");
});
