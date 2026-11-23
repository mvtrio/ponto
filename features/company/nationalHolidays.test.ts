import { test } from "node:test";
import assert from "node:assert/strict";
import { easterSunday, goodFriday, nationalHolidaysInRange } from "./nationalHolidays.ts";

test("20 de novembro é feriado nacional (Consciência Negra)", () => {
  const holidays = nationalHolidaysInRange("2026-11-01", "2026-11-30");
  const day = holidays.find((h) => h.day === "2026-11-20");
  assert.equal(day?.name, "Consciência Negra");
});

test("novembro tem os três feriados nacionais do mês", () => {
  const days = nationalHolidaysInRange("2026-11-01", "2026-11-30").map((h) => h.day);
  assert.deepEqual(days, ["2026-11-02", "2026-11-15", "2026-11-20"]);
});

test("Páscoa e Sexta-feira Santa dos próximos anos", () => {
  assert.equal(easterSunday(2026), "2026-04-05");
  assert.equal(easterSunday(2027), "2027-03-28");
  assert.equal(goodFriday(2026), "2026-04-03");
  assert.equal(goodFriday(2027), "2027-03-26");
});

test("Sexta-feira Santa entra no período, mesmo caindo em março", () => {
  const days = nationalHolidaysInRange("2027-03-01", "2027-03-31");
  assert.deepEqual(days, [{ day: "2027-03-26", name: "Sexta-feira Santa" }]);
});

test("período que cruza o ano traz os feriados dos dois anos", () => {
  const days = nationalHolidaysInRange("2026-12-20", "2027-01-05").map((h) => h.day);
  assert.deepEqual(days, ["2026-12-25", "2027-01-01"]);
});

test("Carnaval não é feriado nacional: fica a cargo do admin", () => {
  // Terça de Carnaval de 2026 = Páscoa - 47 dias.
  const days = nationalHolidaysInRange("2026-02-01", "2026-02-28").map((h) => h.day);
  assert.deepEqual(days, []);
});
