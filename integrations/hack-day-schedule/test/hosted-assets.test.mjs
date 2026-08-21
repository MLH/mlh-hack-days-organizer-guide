import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scheduleHtml = await readFile(new URL("../src/webframe.html", import.meta.url), "utf8");
const rateHtml = await readFile(new URL("../src/rate-webframe.html", import.meta.url), "utf8");
const integrationSource = await readFile(new URL("../src/index.tsx", import.meta.url), "utf8");

test("webframes load scripts through the GitBook public content endpoint", () => {
  assert.match(scheduleHtml, /src="\?asset=schedule-engine"/);
  assert.match(rateHtml, /src="\?asset=rate-engine"/);
  assert.doesNotMatch(scheduleHtml, /src="\.\//);
  assert.doesNotMatch(rateHtml, /src="\.\//);
});

test("the integration serves both hosted script assets", () => {
  assert.match(integrationSource, /searchParams\.get\('asset'\) === 'schedule-engine'/);
  assert.match(integrationSource, /searchParams\.get\('asset'\) === 'rate-engine'/);
});
