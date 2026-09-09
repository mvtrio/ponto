import { test } from "node:test";
import assert from "node:assert/strict";

import { addDays, appDate, appDayRange, appTime, appWeekday, startOfAppDay } from "./appDate.ts";

test("marcação do fim da tarde pertence ao dia local, não ao dia UTC", () => {
  // 09/09/2026 21:30 em Brasília = 10/09 00:30 UTC. O corte cru de ISO daria 2026-09-10.
  assert.equal(appDate("2026-09-10T00:30:00.000Z"), "2026-09-09");
  assert.equal(appTime("2026-09-10T00:30:00.000Z"), "21:30");
});

test("marcação da manhã fica no mesmo dia", () => {
  assert.equal(appDate("2026-09-09T13:48:00.000Z"), "2026-09-09");
  assert.equal(appTime("2026-09-09T13:48:00.000Z"), "10:48");
});

test("o dia local começa às 03:00 UTC", () => {
  assert.equal(startOfAppDay("2026-09-09"), "2026-09-09T03:00:00.000Z");
});

test("appDayRange cobre o dia inteiro e nada além", () => {
  const { fromIso, toIso } = appDayRange("2026-09-09");
  assert.equal(fromIso, "2026-09-09T03:00:00.000Z");
  assert.equal(toIso, "2026-09-10T03:00:00.000Z");

  // O instante anterior ao início pertence ao dia anterior.
  assert.equal(appDate(new Date(Date.parse(fromIso) - 1).toISOString()), "2026-09-08");
  // O fim é exclusivo: já é o dia seguinte.
  assert.equal(appDate(toIso), "2026-09-10");
});

test("addDays não escorrega por causa de fuso", () => {
  assert.equal(addDays("2026-09-09", 1), "2026-09-10");
  assert.equal(addDays("2026-09-09", -1), "2026-09-08");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("appWeekday usa a data, não o fuso do dispositivo", () => {
  assert.equal(appWeekday("2026-09-09"), 3); // quarta-feira
  assert.equal(appWeekday("2026-09-06"), 0); // domingo
});
