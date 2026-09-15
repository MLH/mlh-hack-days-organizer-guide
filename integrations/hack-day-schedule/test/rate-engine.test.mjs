import test from "node:test";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

await import("../src/rate-engine.js");

const { RATE_DATA, calculateAllowance, findRate, formatUSD } = globalThis.HackDayRates;

test("the rate finder includes every reviewed country", () => {
  assert.equal(RATE_DATA.length, 124);
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


test("the guide retains the dynamic reimbursement rate finder", async () => {
  const guide = await readFile(new URL("../../../reimbursements.md", import.meta.url), "utf8");
  assert.match(guide, /```hack-day-reimbursement-rate\n```/);
  assert.doesNotMatch(guide, /\| Country \| Per Hacker/);
});

test("approved additions and retained rates are present, and Russia is removed", () => {
  for (const [country, rate] of [
    ["Zimbabwe", 2.95], ["Taiwan", 2.98], ["Philippines", 2.36],
    ["The Gambia", 1.75], ["Botswana", 2.60], ["Armenia", 2.62],
    ["Andorra", 4.58], ["Bosnia and Herzegovina", 2.62], ["Latvia", 3.73],
    ["Liechtenstein", 7.68], ["Moldova", 2.84], ["Monaco", 5.27],
    ["Montenegro", 2.73], ["San Marino", 5.29], ["Ukraine", 2.03],
    ["Vatican City", 4.63], ["Madagascar", 3.39],
  ]) assert.equal(findRate(country)?.perHacker, rate, country);
  assert.equal(findRate("Russia"), null);
  assert.equal(calculateAllowance("Russia", 50), null);
  assert.equal(calculateAllowance("Rwanda", 50).maximum, 94.50);
});
