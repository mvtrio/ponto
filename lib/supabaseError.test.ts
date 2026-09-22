import assert from "node:assert/strict";
import { test } from "node:test";

import { asError } from "./supabaseError.ts";

test("preserva a mensagem do PostgrestError, que não é instância de Error", () => {
  // A forma real de um erro de RPC do Supabase: objeto simples.
  const postgrest = {
    message: "O mês ainda não terminou.",
    code: "P0001",
    details: null,
    hint: null,
  };
  assert.equal(asError(postgrest, "Erro ao fechar").message, "O mês ainda não terminou.");
});

test("um Error de verdade passa intacto", () => {
  const original = new Error("falha de rede");
  assert.equal(asError(original, "Erro"), original);
});

test("cai no texto padrão quando não há nada aproveitável", () => {
  assert.equal(asError(null, "Erro ao fechar").message, "Erro ao fechar");
  assert.equal(asError({}, "Erro ao fechar").message, "Erro ao fechar");
  assert.equal(asError("", "Erro ao fechar").message, "Erro ao fechar");
});

test("usa hint ou details quando message vem vazio", () => {
  assert.equal(asError({ hint: "reabra o mês anterior" }, "x").message, "reabra o mês anterior");
  assert.equal(asError({ details: "chave duplicada" }, "x").message, "chave duplicada");
});
