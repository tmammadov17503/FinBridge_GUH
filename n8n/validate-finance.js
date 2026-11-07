// n8n Code node: validate and normalize one webhook request before any external call.
// Authentication is handled by the Webhook node's built-in Header Auth (X-FinBridge-Key).
// Set that credential in the Webhook node — no enterprise plan required.
const body = $input.first().json.body;
const fail = (message) => [{ json: { valid: false, error: { code: 'INVALID_INPUT', message } } }];
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const money = (value) => typeof value === 'number' && Number.isFinite(value)
  && Math.abs(value) <= 1000000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
const date = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value + 'T00:00:00Z'))
  && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;

if (!object(body)) return fail('Send a JSON object in the request body.');
if (body.question !== undefined && (typeof body.question !== 'string' || body.question.length > 500)) {
  return fail('question must be a string of at most 500 characters.');
}
if (body.university !== undefined && (typeof body.university !== 'string' || body.university.length > 100)) {
  return fail('university must be a string of at most 100 characters.');
}
if (body.noFamilySupport !== undefined && typeof body.noFamilySupport !== 'boolean') {
  return fail('noFamilySupport must be a boolean.');
}
const f = body.finance;
if (!object(f)) return fail('finance is required.');
if (!date(f.startDate) || !date(f.nextMaintenanceLoanDate)) {
  return fail('Finance dates must be real YYYY-MM-DD dates.');
}
const start = Date.parse(f.startDate + 'T00:00:00Z');
const end = Date.parse(f.nextMaintenanceLoanDate + 'T00:00:00Z');
if (end <= start || end - start > 366 * 86400000) {
  return fail('nextMaintenanceLoanDate must be within 366 days after startDate.');
}
if (!money(f.openingBalance)) return fail('openingBalance must be a finite amount with at most two decimal places.');
if (!Array.isArray(f.transactions) || f.transactions.length > 100) {
  return fail('transactions must be an array of at most 100 items.');
}
for (const tx of f.transactions) {
  if (!object(tx) || !date(tx.date) || tx.date < f.startDate || tx.date >= f.nextMaintenanceLoanDate
    || !money(tx.amount) || tx.amount === 0 || typeof tx.label !== 'string'
    || tx.label.trim().length === 0 || tx.label.length > 80) {
    return fail('Each transaction needs a date in the forecast window, a nonzero amount, and a label of at most 80 characters.');
  }
}
const weekly = f.weeklyEssentials;
if (!object(weekly) || !date(weekly.firstDate) || weekly.firstDate < f.startDate
  || weekly.firstDate >= f.nextMaintenanceLoanDate || !money(weekly.amount) || weekly.amount < 0) {
  return fail('weeklyEssentials needs a firstDate in the forecast window and a nonnegative amount.');
}

// Optional scenarioB: alternative transactions and weeklyEssentials for two-scenario comparison.
// Inherits startDate, openingBalance, and nextMaintenanceLoanDate from the base finance.
let scenarioB = null;
if (body.scenarioB !== undefined) {
  if (!object(body.scenarioB)) return fail('scenarioB must be an object if provided.');
  const sb = body.scenarioB;
  if (!Array.isArray(sb.transactions) || sb.transactions.length > 100) {
    return fail('scenarioB.transactions must be an array of at most 100 items.');
  }
  for (const tx of sb.transactions) {
    if (!object(tx) || !date(tx.date) || tx.date < f.startDate || tx.date >= f.nextMaintenanceLoanDate
      || !money(tx.amount) || tx.amount === 0 || typeof tx.label !== 'string'
      || tx.label.trim().length === 0 || tx.label.length > 80) {
      return fail('Each scenarioB transaction needs a date in the forecast window, a nonzero amount, and a label of at most 80 characters.');
    }
  }
  const sbWeekly = sb.weeklyEssentials;
  if (!object(sbWeekly) || !date(sbWeekly.firstDate) || sbWeekly.firstDate < f.startDate
    || sbWeekly.firstDate >= f.nextMaintenanceLoanDate || !money(sbWeekly.amount) || sbWeekly.amount < 0) {
    return fail('scenarioB.weeklyEssentials needs a firstDate in the forecast window and a nonnegative amount.');
  }
  scenarioB = {
    transactions: sb.transactions.map((tx) => ({ date: tx.date, amount: tx.amount, label: tx.label.trim() })),
    weeklyEssentials: { firstDate: sbWeekly.firstDate, amount: sbWeekly.amount },
  };
}

return [{ json: {
  valid: true,
  question: body.question ?? '',
  university: body.university ?? '',
  noFamilySupport: body.noFamilySupport === true,
  finance: {
    startDate: f.startDate,
    openingBalance: f.openingBalance,
    nextMaintenanceLoanDate: f.nextMaintenanceLoanDate,
    transactions: f.transactions.map((tx) => ({ date: tx.date, amount: tx.amount, label: tx.label.trim() })),
    weeklyEssentials: { firstDate: weekly.firstDate, amount: weekly.amount },
  },
  scenarioB,
} }];
