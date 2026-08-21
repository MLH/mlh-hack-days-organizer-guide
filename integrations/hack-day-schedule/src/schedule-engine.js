const DEFAULTS = Object.freeze({
  durationMinutes: 360,
  startTime: "09:00",
  teams: 6,
  serveFoodDuringBuild: true,
  includeWorkshop: false,
});

const MINIMUM_BUILD_MINUTES = 120;
const SCIENCE_FAIR_GUIDE_URL = "https://guide.mlh.com/general-information/judging-and-submissions/judging-plan";

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

function parseClock(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value));
  if (!match) return 9 * 60;
  const hours = clamp(Number(match[1]), 0, 23);
  const minutes = clamp(Number(match[2]), 0, 59);
  return (hours * 60) + minutes;
}

function formatInputClock(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function roundClockToQuarter(value) {
  return formatInputClock(roundToStep(parseClock(value), 15));
}

function formatClock(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function normalizeOptions(options = {}) {
  return {
    durationMinutes: roundToStep(
      clamp(Number(options.durationMinutes ?? DEFAULTS.durationMinutes), 240, 720),
      15,
    ),
    startTime: /^\d{2}:\d{2}$/.test(String(options.startTime ?? DEFAULTS.startTime))
      ? roundClockToQuarter(String(options.startTime ?? DEFAULTS.startTime))
      : DEFAULTS.startTime,
    teams: Math.round(clamp(Number(options.teams ?? DEFAULTS.teams), 2, 24)),
    serveFoodDuringBuild: Boolean(options.serveFoodDuringBuild ?? DEFAULTS.serveFoodDuringBuild),
    includeWorkshop: Boolean(options.includeWorkshop ?? DEFAULTS.includeWorkshop),
  };
}

function generateSchedule(rawOptions = {}) {
  const options = normalizeOptions(rawOptions);
  const desiredDemoMinutes = Math.ceil((options.teams * 5) / 15) * 15;
  const maximumDemoMinutes = options.durationMinutes >= 420 ? 90 : 60;
  const demoMinutes = clamp(desiredDemoMinutes, 30, maximumDemoMinutes);
  const fixedMinutes = 15 + 15 + demoMinutes + 15
    + (options.includeWorkshop ? 30 : 0);
  const buildMinutes = options.durationMinutes - fixedMinutes;
  const start = parseClock(options.startTime);
  let cursor = start;
  const blocks = [];

  const addBlock = (duration, activity, checkpoint) => {
    const blockStart = cursor;
    cursor += duration;
    const block = {
      start: formatClock(blockStart),
      end: formatClock(cursor),
      duration,
      activity,
      checkpoint,
    };
    blocks.push(block);
    return block;
  };

  addBlock(15, "Doors open and OrganizerHQ check-in", "Confirm every attendee is checked in. Open doors earlier outside the published schedule if your venue expects a queue.");
  addBlock(15, "Welcome and opening remarks", "Cover the Code of Conduct, schedule, partner challenges, submission URL, and deadline.");

  if (options.includeWorkshop) {
    addBlock(30, "Focused workshop", "Teach one practical skill participants can apply immediately.");
  }

  const buildStart = cursor;
  const buildBlock = addBlock(buildMinutes, "Build time", "Includes team formation and idea alignment. Help teams choose a realistic scope, then give reminders 60 and 30 minutes before submissions close.");
  buildBlock.concurrentItems = [];

  if (options.serveFoodDuringBuild) {
    const foodDuration = Math.min(30, buildMinutes);
    const latestFoodStart = Math.max(0, buildMinutes - foodDuration);
    const eventMidpoint = start + (options.durationMinutes / 2);
    const idealFoodStart = roundToStep(eventMidpoint - buildStart - (foodDuration / 2), 15);
    const foodOffset = clamp(idealFoodStart, 0, latestFoodStart);
    buildBlock.concurrentItems.push({
      contextLabel: "During build time",
      label: "Food available during build time",
      start: formatClock(buildStart + foodOffset),
      end: formatClock(buildStart + foodOffset + foodDuration),
      note: "Make a meal or snacks available while keeping the build space open so teams can eat without stopping work.",
    });
  }

  const submissionDuration = Math.min(30, buildMinutes);
  buildBlock.concurrentItems.push({
    contextLabel: "During build time",
    label: "Project submissions during build time",
    start: formatClock(buildStart + buildMinutes - submissionDuration),
    end: formatClock(buildStart + buildMinutes),
    note: "Teams can keep building while one member submits in OrganizerHQ and selects each eligible partner challenge. Verify every submission before demos begin.",
  });

  const availableMinutesPerTeam = Math.max(1, Math.floor(demoMinutes / options.teams));
  const demoBlock = addBlock(demoMinutes, "Project demos", `Share ${formatDuration(demoMinutes)} across ${options.teams} teams—about ${availableMinutesPerTeam} minutes per team, including transitions. Judges should score each project as it is presented.`);
  demoBlock.concurrentItems = [{
    contextLabel: "During project demos",
    label: "Judging and winner declaration",
    start: demoBlock.start,
    end: demoBlock.end,
    note: "Judge projects as they are presented, then mark every MLH partner winner and make the project gallery public before closing.",
  }];
  addBlock(15, "Closing ceremony and group photo", "Announce winners after the saved results and public gallery have been checked, then explain any follow-up.");

  const warnings = [];
  if (buildMinutes < MINIMUM_BUILD_MINUTES) {
    warnings.push(`This gives teams only ${formatDuration(buildMinutes)} to form teams and build. Increase the event length, remove the workshop, or shorten demos; at least 2 hr is recommended.`);
  }
  if (options.durationMinutes > 360) {
    warnings.push("MLH recommends a focused 4–6 hour Hack Day. If you run longer, plan additional breaks, staffing, and venue coverage.");
  }
  if (desiredDemoMinutes > demoMinutes) {
    warnings.push(`Whole-room demos would need ${formatDuration(desiredDemoMinutes)} to give every team 5 minutes. This schedule provides about ${availableMinutesPerTeam} minutes per team instead. If that is too short, science-fair-style judging—with teams at project stations and judges moving between them—is a fallback, but it requires more coordination.`);
  }

  return {
    options,
    blocks,
    buildMinutes,
    endTime: formatClock(start + options.durationMinutes),
    durationLabel: formatDuration(options.durationMinutes),
    warnings,
  };
}

function compactTimeRange(start, end) {
  const startMatch = /^(.*) (AM|PM)$/.exec(start);
  const endMatch = /^(.*) (AM|PM)$/.exec(end);
  if (startMatch && endMatch && startMatch[2] === endMatch[2]) {
    return `${startMatch[1]}–${endMatch[1]} ${endMatch[2]}`;
  }
  return `${start}–${end}`;
}

function formatDurationLong(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (hours) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  return parts.join(" ");
}

function attendeeActivityLabel(activity) {
  const labels = {
    "Doors open and OrganizerHQ check-in": "Check-in",
    "Judging and winner declaration": "Judging",
    "Closing ceremony and group photo": "Winners and closing",
  };
  return labels[activity] || activity;
}

function attendeeConcurrentLabel(label) {
  const labels = {
    "Food available during build time": "Food available",
    "Project submissions during build time": "Project submissions",
  };
  return labels[label] || label;
}

function scheduleToAttendeeText(schedule) {
  const lines = [
    "Hack Day Schedule",
    `${compactTimeRange(formatClock(parseClock(schedule.options.startTime)), schedule.endTime)} · ${formatDurationLong(schedule.options.durationMinutes)}`,
    "",
  ];

  schedule.blocks.forEach((block) => {
    lines.push(`• ${compactTimeRange(block.start, block.end)} — ${attendeeActivityLabel(block.activity)}`);
    block.concurrentItems?.forEach((item) => {
      lines.push(`  ↳ ${compactTimeRange(item.start, item.end)} — ${attendeeConcurrentLabel(item.label)}`);
    });
  });

  return lines.join("\n");
}

function scheduleToOrganizerText(schedule) {
  const lines = [
    "Hack Day Organizer Run of Show",
    `${compactTimeRange(formatClock(parseClock(schedule.options.startTime)), schedule.endTime)} · ${formatDurationLong(schedule.options.durationMinutes)} · ${schedule.options.teams} expected teams`,
    "",
  ];

  schedule.blocks.forEach((block) => {
    lines.push(`• ${compactTimeRange(block.start, block.end)} — ${block.activity}`);
    lines.push(`  ☐ ${block.checkpoint}`);
    block.concurrentItems?.forEach((item) => {
      lines.push(`  ↳ ${compactTimeRange(item.start, item.end)} — ${item.label}`);
      lines.push(`    ☐ ${item.note}`);
    });
    lines.push("");
  });

  if (schedule.warnings.length) {
    lines.push("Notes:");
    schedule.warnings.forEach((warning) => {
      lines.push(`- ${warning}`);
      if (warning.includes("science-fair-style judging")) {
        lines.push(`  Science-fair judging guide: ${SCIENCE_FAIR_GUIDE_URL}`);
      }
    });
  }

  return lines.join("\n").trimEnd();
}

function initializeScheduleGenerator(root = document) {
  const form = root.querySelector("#schedule-controls");
  if (!form) return;

  const duration = root.querySelector("#duration");
  const durationOutput = root.querySelector("#duration-output");
  const startHour = root.querySelector("#start-hour");
  const startMinute = root.querySelector("#start-minute");
  const startPeriod = root.querySelector("#start-period");
  const teams = root.querySelector("#teams");
  const serveFoodDuringBuild = root.querySelector("#serve-food");
  const includeWorkshop = root.querySelector("#include-workshop");
  const scheduleMeta = root.querySelector("#schedule-meta");
  const scheduleList = root.querySelector("#schedule-list");
  const scheduleWarnings = root.querySelector("#schedule-warnings");
  const copyButton = root.querySelector("#copy-schedule");
  const copyOrganizerButton = root.querySelector("#copy-organizer-schedule");
  const resetButton = root.querySelector("#reset-schedule");
  const copyStatus = root.querySelector("#copy-status");
  let currentSchedule = generateSchedule(DEFAULTS);

  const readStartTime = () => {
    const hour12 = Number(startHour.value);
    const hour24 = startPeriod.value === "PM"
      ? (hour12 % 12) + 12
      : hour12 % 12;
    return `${String(hour24).padStart(2, "0")}:${startMinute.value}`;
  };

  const setStartTime = (value) => {
    const totalMinutes = parseClock(value);
    const hour24 = Math.floor(totalMinutes / 60);
    startHour.value = String(hour24 % 12 || 12);
    startMinute.value = String(totalMinutes % 60).padStart(2, "0");
    startPeriod.value = hour24 >= 12 ? "PM" : "AM";
  };

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const announceHeight = () => {
    if (window.parent === window) return;
    const generator = document.querySelector(".generator");
    if (!generator) return;
    window.parent.postMessage({
      action: {
        action: "@webframe.resize",
        size: { height: Math.ceil(generator.getBoundingClientRect().height + 4) },
      },
    }, "*");
  };

  const render = () => {
    currentSchedule = generateSchedule({
      durationMinutes: duration.value,
      startTime: readStartTime(),
      teams: teams.value,
      serveFoodDuringBuild: serveFoodDuringBuild.checked,
      includeWorkshop: includeWorkshop.checked,
    });

    setStartTime(currentSchedule.options.startTime);
    durationOutput.textContent = currentSchedule.durationLabel;
    scheduleMeta.innerHTML = `
      <strong>${escapeHtml(formatClock(parseClock(currentSchedule.options.startTime)))}–${escapeHtml(currentSchedule.endTime)}</strong>
      <span>${escapeHtml(formatDuration(currentSchedule.buildMinutes))} for teams to plan and build</span>
    `;
    scheduleList.innerHTML = currentSchedule.blocks.map((block) => `
      <li class="schedule-row">
        <time>${escapeHtml(block.start)}<span>${escapeHtml(block.end)}</span></time>
        <div>
          <strong>${escapeHtml(block.activity)}</strong>
          <p>${escapeHtml(block.checkpoint)}</p>
          ${block.concurrentItems?.map((item) => `
              <div class="concurrent-item">
                <span>${escapeHtml(item.contextLabel)}</span>
                <strong>${escapeHtml(item.start)}–${escapeHtml(item.end)} · ${escapeHtml(item.label)}</strong>
                <p>${escapeHtml(item.note)}</p>
              </div>
            `).join("") || ""}
        </div>
      </li>
    `).join("");
    scheduleWarnings.hidden = !currentSchedule.warnings.length;
    scheduleWarnings.innerHTML = currentSchedule.warnings.map((warning) => {
      const judgingGuideLink = warning.includes("science-fair-style judging")
        ? ` <a href="${SCIENCE_FAIR_GUIDE_URL}" target="_blank" rel="noopener noreferrer">Read the Organizer Guide’s science-fair judging plan.</a>`
        : "";
      return `<p>${escapeHtml(warning)}${judgingGuideLink}</p>`;
    }).join("");
    copyStatus.textContent = "";
    requestAnimationFrame(announceHeight);
  };

  form.addEventListener("input", render);
  form.addEventListener("change", render);

  resetButton.addEventListener("click", () => {
    duration.value = String(DEFAULTS.durationMinutes);
    setStartTime(DEFAULTS.startTime);
    teams.value = String(DEFAULTS.teams);
    serveFoodDuringBuild.checked = DEFAULTS.serveFoodDuringBuild;
    includeWorkshop.checked = DEFAULTS.includeWorkshop;
    render();
  });

  const copyText = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      copyStatus.textContent = successMessage;
    } catch {
      copyStatus.textContent = "Copy is unavailable here. Select the schedule text instead.";
    }
  };

  copyButton.addEventListener("click", async () => {
    await copyText(scheduleToAttendeeText(currentSchedule), "Attendee schedule copied");
  });

  copyOrganizerButton.addEventListener("click", async () => {
    await copyText(scheduleToOrganizerText(currentSchedule), "Organizer version copied");
  });

  window.addEventListener("load", announceHeight);
  window.addEventListener("resize", announceHeight);
  window.parent?.postMessage({ action: { action: "@webframe.ready" } }, "*");
  render();
}

const HackDaySchedule = Object.freeze({
  DEFAULTS,
  SCIENCE_FAIR_GUIDE_URL,
  formatClock,
  formatDuration,
  generateSchedule,
  normalizeOptions,
  scheduleToAttendeeText,
  scheduleToOrganizerText,
});

globalThis.HackDaySchedule = HackDaySchedule;

if (typeof document !== "undefined") {
  initializeScheduleGenerator(document);
}
