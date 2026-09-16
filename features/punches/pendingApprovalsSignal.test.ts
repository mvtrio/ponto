import { test } from "node:test";
import assert from "node:assert/strict";

import {
  notifyPendingApprovalsChanged,
  subscribeToPendingApprovals,
} from "./pendingApprovalsSignal.ts";

test("o aviso chega a quem está inscrito", () => {
  let chamadas = 0;
  const cancelar = subscribeToPendingApprovals(() => {
    chamadas += 1;
  });

  notifyPendingApprovalsChanged();
  notifyPendingApprovalsChanged();
  assert.equal(chamadas, 2);

  cancelar();
});

test("cancelar a inscrição realmente desliga o ouvinte", () => {
  let chamadas = 0;
  const cancelar = subscribeToPendingApprovals(() => {
    chamadas += 1;
  });

  cancelar();
  notifyPendingApprovalsChanged();

  // Sem isso, cada tela remontada deixaria um ouvinte para trás consultando o banco.
  assert.equal(chamadas, 0);
});

test("vários ouvintes recebem o mesmo aviso", () => {
  const recebidos: string[] = [];
  const a = subscribeToPendingApprovals(() => recebidos.push("a"));
  const b = subscribeToPendingApprovals(() => recebidos.push("b"));

  notifyPendingApprovalsChanged();
  assert.deepEqual(recebidos.sort(), ["a", "b"]);

  a();
  b();
});

test("avisar sem ninguém inscrito não quebra", () => {
  assert.doesNotThrow(() => notifyPendingApprovalsChanged());
});
