import { test } from "node:test";
import assert from "node:assert/strict";

import { weekdayName } from "./weekdayNames.ts";

test("nomeia cada dia da semana em português", () => {
  // 14/09/2026 é uma segunda-feira.
  assert.equal(weekdayName("2026-09-14"), "segunda-feira");
  assert.equal(weekdayName("2026-09-15"), "terça-feira");
  assert.equal(weekdayName("2026-09-16"), "quarta-feira");
  assert.equal(weekdayName("2026-09-17"), "quinta-feira");
  assert.equal(weekdayName("2026-09-18"), "sexta-feira");
  assert.equal(weekdayName("2026-09-19"), "sábado");
  assert.equal(weekdayName("2026-09-20"), "domingo");
});

test("data inválida não inventa dia", () => {
  assert.equal(weekdayName("2026-02-31"), null);
  assert.equal(weekdayName("2026-09"), null);
  assert.equal(weekdayName(""), null);
});
