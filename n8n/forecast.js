// n8n Code node: deterministic forecast from validated, user-supplied finance data.
// Returns dailySeries (every calendar day), firstShortfallAmount, and optionally
// a scenarios block when the request includes a scenarioB alternative.
const request = $input.first().json;

const toPence = (value) => Math.round(value * 100);

function runForecast(f) {
  // Build all events (transactions + expanded weekly essentials).
  const events = f.transactions.map((tx) => ({
    date: tx.date, label: tx.label, amountP: toPence(tx.amount),
  }));
  const endMs = Date.parse(f.nextMaintenanceLoanDate + 'T00:00:00Z');
  for (let ms = Date.parse(f.weeklyEssentials.firstDate + 'T00:00:00Z'); ms < endMs; ms += 7 * 86400000) {
    events.push({ date: new Date(ms).toISOString().slice(0, 10), label: 'Weekly essentials', amountP: -toPence(f.weeklyEssentials.amount) });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || b.amountP - a.amountP || a.label.localeCompare(b.label));

  // Index events by date for the day-by-day walk.
  const byDate = {};
  for (const e of events) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }

  // Walk from startDate up to (not including) nextMaintenanceLoanDate.
  const startMs = Date.parse(f.startDate + 'T00:00:00Z');
  let balance = toPence(f.openingBalance);
  let lowest = balance;
  let lowestDate = f.startDate;
  // Record a shortfall if the opening balance is already negative.
  let firstShortfallDate = balance < 0 ? f.startDate : null;
  let firstShortfallAmount = balance < 0 ? balance / 100 : null;
  const timeline = [];
  const dailySeries = [];

  for (let ms = startMs; ms < endMs; ms += 86400000) {
    const dateStr = new Date(ms).toISOString().slice(0, 10);
    for (const e of (byDate[dateStr] || [])) {
      balance += e.amountP;
      timeline.push({ date: dateStr, label: e.label, amount: e.amountP / 100, balance: balance / 100 });
    }
    if (balance < lowest) { lowest = balance; lowestDate = dateStr; }
    if (balance < 0 && firstShortfallDate === null) {
      firstShortfallDate = dateStr;
      firstShortfallAmount = balance / 100;
    }
    dailySeries.push({ date: dateStr, balance: balance / 100 });
  }

  return {
    currency: 'GBP',
    startDate: f.startDate,
    openingBalance: f.openingBalance,
    lowestBalance: lowest / 100,
    lowestBalanceDate: lowestDate,
    firstShortfallDate,
    firstShortfallAmount,
    hasShortfall: firstShortfallDate !== null,
    balanceBeforeNextLoan: balance / 100,
    nextMaintenanceLoanDate: f.nextMaintenanceLoanDate,
    timeline,
    dailySeries,
  };
}

const f = request.finance;
const baseForecast = runForecast(f);

let scenarios = null;
if (request.scenarioB) {
  const sbFinance = {
    startDate: f.startDate,
    openingBalance: f.openingBalance,
    nextMaintenanceLoanDate: f.nextMaintenanceLoanDate,
    transactions: request.scenarioB.transactions,
    weeklyEssentials: request.scenarioB.weeklyEssentials,
  };
  scenarios = { base: baseForecast, changed: runForecast(sbFinance) };
}

return [{ json: {
  forecast: {
    scenario: 'provided_transactions',
    ...baseForecast,
    ...(scenarios ? { scenarios } : {}),
  },
  question: request.question,
  university: request.university,
  noFamilySupport: request.noFamilySupport,
} }];
