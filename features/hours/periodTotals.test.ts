import { test } from "node:test";
import assert from "node:assert/strict";

import { sumPeriodTotals } from "./periodTotals.ts";
import type { DailySummary } from "../../types/domain.ts";

function day(balance_minutes: number): DailySummary {
  return {
    employee_id: "e1",
    day: "2026-09-01",
    worked_minutes: 480 + balance_minutes,
    is_incomplete: false,
    standard_daily_minutes: 480,
    balance_minutes,
  };
}

test("separa o que é extra do que é débito", () => {
  const totais = sumPeriodTotals([day(60), day(-30), day(15)]);
  assert.equal(totais.overtimeMinutes, 75);
  assert.equal(totais.deficitMinutes, 30);
});

test("o débito é positivo, não um número negativo", () => {
  // A tela mostra "Débito 8h00", não "Débito -8h00".
  assert.equal(sumPeriodTotals([day(-480)]).deficitMinutes, 480);
});

test("dia zerado não conta para nenhum dos dois", () => {
  const totais = sumPeriodTotals([day(0), day(0)]);
  assert.deepEqual(totais, { overtimeMinutes: 0, deficitMinutes: 0 });
});

test("período vazio devolve zeros em vez de quebrar", () => {
  assert.deepEqual(sumPeriodTotals([]), { overtimeMinutes: 0, deficitMinutes: 0 });
});
