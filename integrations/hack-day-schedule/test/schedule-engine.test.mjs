import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../src/schedule-engine.js");

const {
  DEFAULTS,
  generateSchedule,
  normalizeOptions,
  scheduleToAttendeeText,
  scheduleToOrganizerText,
} = globalThis.HackDaySchedule;

test("the start-time minute picker only offers quarter hours", async () => {
  const html = await readFile(new URL("../src/webframe.html", import.meta.url), "utf8");
  const minuteSelect = html.match(/<select id="start-minute"[\s\S]*?<\/select>/)?.[0] || "";
  const values = [...minuteSelect.matchAll(/<option value="(\d{2})"/g)].map((match) => match[1]);

  assert.deepEqual(values, ["00", "15", "30", "45"]);
});

test("recommended defaults produce an exact six-hour schedule", () => {
  const schedule = generateSchedule(DEFAULTS);
  const minutes = schedule.blocks.reduce((total, block) => total + block.duration, 0);

  assert.equal(minutes, 360);
  assert.equal(schedule.endTime, "3:00 PM");
  assert.equal(schedule.buildMinutes, 285);
  assert.deepEqual(schedule.warnings, []);
  const food = schedule.blocks.flatMap((block) => block.concurrentItems || [])
    .find((item) => item.label === "Food available during build time");
  assert.deepEqual({ start: food.start, end: food.end }, { start: "11:45 AM", end: "12:15 PM" });
});

test("all proposed boundaries land on a quarter hour", () => {
  const schedule = generateSchedule({
    durationMinutes: 255,
    startTime: "11:08",
    teams: 7,
    serveFoodDuringBuild: true,
  });

  assert.equal(schedule.options.startTime, "11:15");
  for (const block of schedule.blocks) {
    assert.match(block.start, /:(00|15|30|45) /);
    assert.match(block.end, /:(00|15|30|45) /);
    block.concurrentItems?.forEach((item) => {
      assert.match(item.start, /:(00|15|30|45) /);
      assert.match(item.end, /:(00|15|30|45) /);
    });
  }
});

test("a four-hour event with six teams gives teams 2 hours 45 minutes to form and build", () => {
  const schedule = generateSchedule({ durationMinutes: 240, teams: 6 });

  assert.equal(schedule.buildMinutes, 165);
  assert.deepEqual(schedule.warnings, []);
});

test("required submission, winner, and gallery steps are always present", () => {
  const schedule = generateSchedule({ durationMinutes: 240, teams: 6 });
  const concurrentLabels = schedule.blocks.flatMap((block) => block.concurrentItems?.map((item) => item.label) || []);

  assert.ok(concurrentLabels.includes("Project submissions during build time"));
  assert.ok(concurrentLabels.includes("Judging and winner declaration"));
  const organizerText = scheduleToOrganizerText(schedule);
  assert.match(organizerText, /mark every MLH partner winner/i);
  assert.match(organizerText, /make the project gallery public/i);
});

test("copied attendee schedules are concise and nest overlapping activities", () => {
  const copied = scheduleToAttendeeText(generateSchedule(DEFAULTS));

  assert.match(copied, /^Hack Day Schedule\n9:00 AM–3:00 PM · 6 hours/m);
  assert.match(copied, /• 9:30 AM–2:15 PM — Build time/);
  assert.match(copied, /  ↳ 11:45 AM–12:15 PM — Food available/);
  assert.match(copied, /  ↳ 1:45–2:15 PM — Project submissions/);
  assert.match(copied, /• 2:15–2:45 PM — Project demos\n  ↳ 2:15–2:45 PM — Judging and winner declaration/);
  assert.doesNotMatch(copied, /Checkpoint:|eligible partner challenge/);
});

test("copied organizer schedules include literal checkboxes and OrganizerHQ details", () => {
  const copied = scheduleToOrganizerText(generateSchedule(DEFAULTS));

  assert.match(copied, /^Hack Day Organizer Run of Show/m);
  assert.match(copied, /☐/);
  assert.doesNotMatch(copied, /Checkpoint:/);
  assert.match(copied, /OrganizerHQ/);
  assert.match(copied, /Project submissions during build time/);
  assert.match(copied, /Judging and winner declaration/);
  assert.match(copied, /venue expects a queue\.\n\n• 9:15–9:30 AM/);
});

test("food availability happens during building and does not reduce build time", () => {
  const withFood = generateSchedule({
    durationMinutes: 420,
    serveFoodDuringBuild: true,
    includeWorkshop: true,
    teams: 8,
  });
  const withoutFood = generateSchedule({
    durationMinutes: 420,
    serveFoodDuringBuild: false,
    includeWorkshop: true,
    teams: 8,
  });
  const minutes = withFood.blocks.reduce((total, block) => total + block.duration, 0);
  const buildBlock = withFood.blocks.find((block) => block.activity.toLowerCase().includes("build time"));

  assert.equal(minutes, 420);
  assert.equal(withFood.buildMinutes, withoutFood.buildMinutes);
  assert.ok(buildBlock.concurrentItems.some((item) => item.label === "Food available during build time"));
  assert.ok(buildBlock.concurrentItems.some((item) => item.label === "Project submissions during build time"));
  assert.ok(withFood.blocks.some((block) => block.activity === "Focused workshop"));
});

test("input values are clamped to safe program limits", () => {
  assert.deepEqual(normalizeOptions({ durationMinutes: 100, teams: 99 }), {
    durationMinutes: 240,
    startTime: "09:00",
    teams: 24,
    serveFoodDuringBuild: true,
    includeWorkshop: false,
  });
});

test("short configurations surface a useful build-time warning", () => {
  const schedule = generateSchedule({
    durationMinutes: 240,
    teams: 12,
    serveFoodDuringBuild: true,
    includeWorkshop: true,
  });

  assert.ok(schedule.buildMinutes < 120);
  assert.match(schedule.warnings[0], /at least 2 hr is recommended/);
});

test("large-team guidance uses the actual available time and offers a fallback", () => {
  const schedule = generateSchedule({ durationMinutes: 360, teams: 13 });
  const guidance = schedule.warnings.join(" ");
  const organizerCopy = HackDaySchedule.scheduleToOrganizerText(schedule);
  const demos = schedule.blocks.find((block) => block.activity === "Project demos");

  assert.equal(demos.duration, 60);
  assert.match(demos.checkpoint, /about 4 minutes per team/);
  assert.match(guidance, /would need 1 hr 15 min/);
  assert.match(guidance, /science-fair-style judging/);
  assert.doesNotMatch(guidance, /preliminary|elimination/i);
  assert.match(organizerCopy, /Science-fair judging guide: https:\/\/guide\.mlh\.com\/general-information\/judging-and-submissions\/judging-plan/);
});

test("longer events can reserve up to 90 minutes for demos", () => {
  const schedule = generateSchedule({ durationMinutes: 420, teams: 18 });
  const demos = schedule.blocks.find((block) => block.activity === "Project demos");

  assert.equal(demos.duration, 90);
  assert.match(demos.checkpoint, /about 5 minutes per team/);
  assert.doesNotMatch(schedule.warnings.join(" "), /science-fair-style judging/);
});
