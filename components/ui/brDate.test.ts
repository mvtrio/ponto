import assert from "node:assert/strict";
import { test } from "node:test";

import { brToIso, isoToBr, maskBr, monthGrid } from "./brDate.ts";

test("converte entre ISO e o padrão brasileiro", () => {
  assert.equal(isoToBr("2026-11-05"), "05/11/2026");
  assert.equal(brToIso("05/11/2026"), "2026-11-05");
});

test("data inexistente ou incompleta não vira ISO", () => {
  assert.equal(brToIso("31/02/2026"), null);
  assert.equal(brToIso("05/11/20"), null);
  assert.equal(isoToBr("2026-02-31"), "");
  assert.equal(isoToBr(""), "");
});

test("máscara põe as barras sozinha e ignora o que não é dígito", () => {
  assert.equal(maskBr("05"), "05");
  assert.equal(maskBr("0511"), "05/11");
  assert.equal(maskBr("05112026"), "05/11/2026");
  assert.equal(maskBr("05/11/2026999"), "05/11/2026");
  assert.equal(maskBr("ab"), "");
});

test("grade do mês começa no domingo e fecha a última semana", () => {
  // Novembro/2026 começa num domingo e tem 30 dias.
  const nov = monthGrid(2026, 11);
  assert.deepEqual(nov[0], [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(nov[4], [29, 30, null, null, null, null, null]);
  // Outubro/2026 começa numa quinta.
  assert.deepEqual(monthGrid(2026, 10)[0], [null, null, null, null, 1, 2, 3]);
});
