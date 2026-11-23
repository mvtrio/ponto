import { test } from "node:test";
import assert from "node:assert/strict";

import { buildOverviewRows } from "./punchOverviewRules.ts";
import type { DailySummary, Punch, PunchApprovalStatus, PunchType } from "../../types/domain.ts";

const NAMES = new Map([["e1", "Telma"], ["e2", "Ana"]]);

function punch(
  employee_id: string,
  type: PunchType,
  occurred_at: string,
  approval_status: PunchApprovalStatus = "approved"
): Punch {
  return {
    id: `${employee_id}-${type}-${occurred_at}`,
    employee_id,
    type,
    occurred_at,
    created_at: occurred_at,
    latitude: null,
    longitude: null,
    location_accuracy_m: null,
    photo_path: null,
    source: "mobile",
    is_corrected: false,
    superseded_by: null,
    approval_status,
    approved_by: null,
    approved_at: null,
  };
}

function summary(
  employee_id: string,
  day: string,
  balance_minutes: number,
  absence_kind: DailySummary["absence_kind"] = null
): DailySummary {
  return {
    employee_id,
    day,
    worked_minutes: 480 + balance_minutes,
    is_incomplete: false,
    standard_daily_minutes: 480,
    balance_minutes,
    absence_kind,
  };
}

test("dia com atestado aparece como atestado, não como falta", () => {
  // A regressão que motivou isto: o dia justificado sumia do quadro e do relatório.
  const rows = buildOverviewRows([], [summary("e1", "2026-09-29", 0, "atestado")], NAMES);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "atestado");
  assert.equal(rows[0].balanceMinutes, 0);
});

test("folga justificada tem status próprio, separado de falta", () => {
  const rows = buildOverviewRows([], [summary("e1", "2026-09-29", 0, "folga")], NAMES);
  assert.equal(rows[0].status, "folga");
});

test("dia liberado tem status próprio e carrega o desconto da jornada", () => {
  const rows = buildOverviewRows([], [summary("e1", "2026-09-30", -480, "liberado")], NAMES);
  assert.equal(rows[0].status, "liberado");
  assert.equal(rows[0].balanceMinutes, -480);
});

test("observação da ausência acompanha a linha do dia", () => {
  const rows = buildOverviewRows(
    [],
    [summary("e1", "2026-09-30", -480, "liberado"), summary("e1", "2026-09-18", -480)],
    NAMES,
    new Map([["e1|2026-09-30", "Saiu para o velório do tio"]])
  );
  assert.equal(rows.find((r) => r.day === "2026-09-30")?.notes, "Saiu para o velório do tio");
  assert.equal(rows.find((r) => r.day === "2026-09-18")?.notes, null);
});

test("dia útil sem marcação e sem justificativa continua sendo falta", () => {
  const rows = buildOverviewRows([], [summary("e1", "2026-09-18", -480)], NAMES);
  assert.equal(rows[0].status, "absent");
});

test("dia com par aprovado fica completo e mostra o saldo", () => {
  const rows = buildOverviewRows(
    [
      punch("e1", "clock_in", "2026-09-09T11:00:00.000Z"),
      punch("e1", "clock_out", "2026-09-09T21:00:00.000Z"),
    ],
    [summary("e1", "2026-09-09", 60)],
    NAMES
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "ok");
  assert.equal(rows[0].employeeName, "Telma");
  assert.equal(rows[0].entrada, "08:00");
  assert.equal(rows[0].saida, "18:00");
  assert.equal(rows[0].balanceMinutes, 60);
});

test("pendente domina e não exibe saldo", () => {
  const rows = buildOverviewRows(
    [
      punch("e1", "clock_in", "2026-09-09T11:00:00.000Z", "approved"),
      punch("e1", "clock_out", "2026-09-09T21:00:00.000Z", "pending"),
    ],
    [summary("e1", "2026-09-09", 60)],
    NAMES
  );

  assert.equal(rows[0].status, "pending");
  assert.equal(rows[0].balanceMinutes, null, "saldo pendente não vale, não pode virar número");
});

test("sem saída o dia fica incompleto", () => {
  const rows = buildOverviewRows([punch("e1", "clock_in", "2026-09-09T11:00:00.000Z")], [], NAMES);
  assert.equal(rows[0].status, "incomplete");
  assert.equal(rows[0].saida, null);
});

test("recusada só vira status do dia quando não sobra marcação válida", () => {
  const soRecusada = buildOverviewRows(
    [punch("e1", "clock_in", "2026-09-09T11:00:00.000Z", "rejected")],
    [],
    NAMES
  );
  assert.equal(soRecusada[0].status, "rejected");
  assert.equal(soRecusada[0].entrada, null, "marcação recusada não ocupa a coluna de entrada");

  const recusadaComValida = buildOverviewRows(
    [
      punch("e1", "clock_in", "2026-09-09T11:00:00.000Z", "approved"),
      punch("e1", "clock_out", "2026-09-09T20:00:00.000Z", "rejected"),
    ],
    [],
    NAMES
  );
  assert.equal(recusadaComValida[0].status, "incomplete");
  assert.equal(recusadaComValida[0].entrada, "08:00");
});

test("marcação da noite não escorrega para o dia seguinte", () => {
  // 21:30 em Brasília = 00:30 UTC do dia seguinte.
  const rows = buildOverviewRows([punch("e1", "clock_out", "2026-09-10T00:30:00.000Z")], [], NAMES);
  assert.equal(rows[0].day, "2026-09-09");
});

test("feriado ganha linha própria, em vez de sumir do meio da sequência", () => {
  // A regressão que motivou isto: 20/11 (Consciência Negra) não vinha do resumo diário,
  // que só cobre dia útil, e o quadro mostrava 19/11 logo abaixo de 23/11.
  const rows = buildOverviewRows(
    [],
    [summary("e1", "2026-11-19", -480), summary("e1", "2026-11-23", 0)],
    NAMES,
    new Map(),
    ["2026-11-20"]
  );

  const feriado = rows.find((r) => r.day === "2026-11-20");
  assert.ok(feriado, "o feriado tem que aparecer no quadro");
  assert.equal(feriado.status, "feriado");
  assert.equal(feriado.employeeName, "Telma");
  assert.equal(feriado.entrada, null);
  assert.equal(feriado.saida, null);
  assert.equal(feriado.balanceMinutes, null, "feriado não é cobrado: saldo não pode virar número");
});

test("feriado trabalhado mantém a linha real, com horário e saldo", () => {
  const rows = buildOverviewRows(
    [
      punch("e1", "clock_in", "2026-11-20T11:00:00.000Z"),
      punch("e1", "clock_out", "2026-11-20T21:00:00.000Z"),
    ],
    [summary("e1", "2026-11-20", 60)],
    NAMES,
    new Map(),
    ["2026-11-20"]
  );

  assert.equal(rows.length, 1, "não pode nascer uma segunda linha para o mesmo dia");
  assert.equal(rows[0].status, "ok");
  assert.equal(rows[0].entrada, "08:00");
  assert.equal(rows[0].balanceMinutes, 60);
});

test("feriado em fim de semana não vira linha", () => {
  // 15/11/2026 é domingo: sábado e domingo não aparecem no quadro, e um feriado neles
  // criaria um dia solto sem par.
  const rows = buildOverviewRows([], [summary("e1", "2026-11-13", 0)], NAMES, new Map(), ["2026-11-15"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].day, "2026-11-13");
});

test("feriado anterior ao primeiro dia da pessoa no período não é inventado", () => {
  const rows = buildOverviewRows([], [summary("e1", "2026-11-19", -480)], NAMES, new Map(), ["2026-11-02"]);
  assert.equal(rows.length, 1, "antes do primeiro dia acompanhado não há o que noticiar");
});

test("feriado de uma pessoa não inventa linha para quem não está no período", () => {
  const rows = buildOverviewRows([], [summary("e1", "2026-11-19", -480)], NAMES, new Map(), ["2026-11-20"]);
  assert.deepEqual(
    rows.map((r) => `${r.employeeName} ${r.day}`),
    ["Telma 2026-11-20", "Telma 2026-11-19"],
    "Ana não tem nada no período: não pode aparecer só por causa do feriado"
  );
});

test("ordena por dia mais recente e depois por nome", () => {
  const rows = buildOverviewRows(
    [
      punch("e2", "clock_in", "2026-09-09T11:00:00.000Z"),
      punch("e1", "clock_in", "2026-09-09T11:00:00.000Z"),
      punch("e1", "clock_in", "2026-09-10T11:00:00.000Z"),
    ],
    [],
    NAMES
  );

  assert.deepEqual(
    rows.map((r) => `${r.day} ${r.employeeName}`),
    ["2026-09-10 Telma", "2026-09-09 Ana", "2026-09-09 Telma"]
  );
});
