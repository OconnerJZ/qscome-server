import test from "node:test";
import assert from "node:assert/strict";
import { createStatsPeriod, percentage, percentageChange } from "./statsPeriod";

test("construye periodos actual y anterior sin traslaparlos", () => {
  const period = createStatsPeriod(7, new Date("2026-08-28T12:00:00Z"));
  assert.equal(period.days, 7);
  assert.equal(period.previousEnd.getTime() + 1, period.currentStart.getTime());
});

test("calcula variaciones y proporciones sin dividir entre cero", () => {
  assert.equal(percentageChange(12, 10), 20);
  assert.equal(percentageChange(5, 0), 100);
  assert.equal(percentage(2, 8), 25);
  assert.equal(percentage(2, 0), 0);
});
