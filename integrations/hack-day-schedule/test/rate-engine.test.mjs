import test from "node:test";
import assert from "node:assert/strict";

await import("../src/rate-engine.js");

const { RATE_DATA, calculateAllowance, findRate, formatUSD } = globalThis.HackDayRates;

test("the rate finder includes every reviewed country", () => {
  assert.equal(RATE_DATA.length, 78);
  assert.equal(findRate("United States").perHacker, 7);
  assert.equal(findRate("united kingdom").perHacker, 6.08);
});

test("allowances use verified check-ins and cap at 50", () => {
  assert.deepEqual(calculateAllowance("United States", 30), {
    country: "United States",
    perHacker: 7,
    checkedIn: 30,
    allowance: 210,
    maximum: 350,
  });
  assert.equal(calculateAllowance("United Kingdom", 75).allowance, 304);
});

test("unknown countries return no estimate", () => {
  assert.equal(calculateAllowance("Not listed", 30), null);
  assert.equal(formatUSD(84.5), "$84.50");
});
