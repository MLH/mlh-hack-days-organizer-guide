const RATE_DATA = Object.freeze([
  ["Albania", 2.98],
  ["Argentina", 3.30],
  ["Australia", 6.37],
  ["Austria", 5.55],
  ["Azerbaijan", 2.02],
  ["Bangladesh", 1.88],
  ["Belgium", 5.43],
  ["Brazil", 3.22],
  ["Bulgaria", 2.97],
  ["Cabo Verde", 3.29],
  ["Cameroon", 2.25],
  ["Canada", 5.80],
  ["Chile", 3.38],
  ["China (People's Republic of)", 3.59],
  ["Colombia", 2.58],
  ["Costa Rica", 4.33],
  ["Croatia", 3.45],
  ["Cyprus", 4.42],
  ["Czechia", 3.91],
  ["Denmark", 6.33],
  ["Ecuador", 3.01],
  ["Egypt", 1.22],
  ["Estonia", 4.42],
  ["Ethiopia", 2.49],
  ["Finland", 5.81],
  ["France", 5.27],
  ["Georgia", 2.31],
  ["Germany", 5.40],
  ["Ghana", 2.10],
  ["Greece", 3.93],
  ["Hong Kong (China)", 4.94],
  ["Hungary", 3.43],
  ["Iceland", 7.40],
  ["India", 1.69],
  ["Indonesia", 2.21],
  ["Ireland", 5.73],
  ["Israel", 6.81],
  ["Italy", 4.63],
  ["Japan", 4.40],
  ["Kenya", 2.33],
  ["Korea", 4.31],
  ["Latvia", 3.73],
  ["Lithuania", 3.78],
  ["Luxembourg", 6.38],
  ["Madagascar", 3.39],
  ["Malaysia", 2.59],
  ["Malta", 4.40],
  ["Mexico", 3.86],
  ["Morocco", 2.68],
  ["Nepal", 1.77],
  ["Netherlands", 5.67],
  ["New Zealand", 6.19],
  ["Nigeria", 0.88],
  ["North Macedonia", 2.45],
  ["Norway", 6.01],
  ["Pakistan", 1.65],
  ["Poland", 3.48],
  ["Portugal", 3.99],
  ["Romania", 2.88],
  ["Russia", 2.19],
  ["Rwanda", 1.89],
  ["Saudi Arabia", 3.68],
  ["Senegal", 2.49],
  ["Serbia", 2.97],
  ["Singapore", 4.19],
  ["Slovakia", 3.88],
  ["Slovenia", 4.22],
  ["South Africa", 2.77],
  ["Spain", 4.34],
  ["Sweden", 5.69],
  ["Switzerland", 7.74],
  ["Tajikistan", 2.10],
  ["Togo", 2.25],
  ["Türkiye", 2.47],
  ["Uganda", 2.46],
  ["United Kingdom", 6.08],
  ["United States", 7.00],
  ["Zambia", 2.28],
].map(([country, perHacker]) => Object.freeze({ country, perHacker })));

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function findRate(country) {
  const normalized = String(country || "").trim().toLocaleLowerCase();
  return RATE_DATA.find((entry) => entry.country.toLocaleLowerCase() === normalized) || null;
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

function formatUSD(value) {
  return `$${roundCurrency(value).toFixed(2)}`;
}

function calculateAllowance(country, attendees = 1) {
  const rate = findRate(country);
  if (!rate) return null;

  const checkedIn = Math.round(clamp(Number(attendees) || 1, 1, 50));
  return {
    country: rate.country,
    perHacker: rate.perHacker,
    checkedIn,
    allowance: roundCurrency(rate.perHacker * checkedIn),
    maximum: roundCurrency(rate.perHacker * 50),
  };
}

function initializeRateFinder(root = document) {
  const countryInput = root.querySelector("#country");
  if (!countryInput) return;

  const countryOptions = root.querySelector("#country-options");
  const attendeeInput = root.querySelector("#attendees");
  const result = root.querySelector("#rate-result");
  const emptyResult = root.querySelector("#rate-empty");
  const resultCountry = root.querySelector("#result-country");
  const resultPerHacker = root.querySelector("#result-per-hacker");
  const resultMaximum = root.querySelector("#result-maximum");
  const resultAllowance = root.querySelector("#result-allowance");
  const resultAttendance = root.querySelector("#result-attendance");

  countryOptions.innerHTML = RATE_DATA
    .map((entry) => `<option value="${entry.country.replaceAll('"', "&quot;")}"></option>`)
    .join("");

  const announceHeight = () => {
    if (window.parent === window) return;
    const tool = document.querySelector(".rate-tool");
    if (!tool) return;
    window.parent.postMessage({
      action: {
        action: "@webframe.resize",
        size: { height: Math.ceil(tool.getBoundingClientRect().height + 4) },
      },
    }, "*");
  };

  const render = () => {
    const calculated = calculateAllowance(countryInput.value, attendeeInput.value);
    if (!calculated) {
      result.hidden = true;
      emptyResult.hidden = false;
      requestAnimationFrame(announceHeight);
      return;
    }

    if (attendeeInput.value && Number(attendeeInput.value) !== calculated.checkedIn) {
      attendeeInput.value = String(calculated.checkedIn);
    }
    resultCountry.textContent = calculated.country;
    resultPerHacker.textContent = formatUSD(calculated.perHacker);
    resultMaximum.textContent = formatUSD(calculated.maximum);
    resultAllowance.textContent = formatUSD(calculated.allowance);
    resultAttendance.textContent = `${calculated.checkedIn} verified check-in${calculated.checkedIn === 1 ? "" : "s"}`;
    emptyResult.hidden = true;
    result.hidden = false;
    requestAnimationFrame(announceHeight);
  };

  countryInput.addEventListener("input", render);
  countryInput.addEventListener("change", render);
  attendeeInput.addEventListener("input", render);
  attendeeInput.addEventListener("change", render);
  window.addEventListener("load", announceHeight);
  window.addEventListener("resize", announceHeight);
  window.parent?.postMessage({ action: { action: "@webframe.ready" } }, "*");
  render();
}

const HackDayRates = Object.freeze({
  RATE_DATA,
  calculateAllowance,
  findRate,
  formatUSD,
});

globalThis.HackDayRates = HackDayRates;

if (typeof document !== "undefined") {
  initializeRateFinder(document);
}
