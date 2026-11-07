import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const fixture = {
  question: 'Can I cover rent before my loan?',
  university: 'University of Manchester',
  noFamilySupport: false,
  finance: {
    startDate: '2026-11-07',
    openingBalance: 200,
    nextMaintenanceLoanDate: '2026-12-05',
    transactions: [
      { date: '2026-11-14', amount: 100, label: 'Wages' },
      { date: '2026-12-01', amount: -300, label: 'Rent' },
    ],
    weeklyEssentials: { firstDate: '2026-11-09', amount: 20 },
  },
};
const catalogue = JSON.parse(readFileSync(new URL('../knowledge/sources.json', import.meta.url), 'utf8'));

function run(file, input, nodes = {}, env = {}) {
  const code = readFileSync(new URL(file, import.meta.url), 'utf8');
  const result = runInNewContext(`(function () { ${code} })()`, {
    $input: { first: () => ({ json: input }) },
    $: (name) => ({ first: () => ({ json: nodes[name] }) }),
    $env: env,
  });
  return structuredClone(result[0].json);
}

// ── Validation ────────────────────────────────────────────────────────────────

test('valid finance input is normalized without fictional data', () => {
  const result = run('./validate-finance.js', { body: fixture });
  assert.equal(result.valid, true);
  assert.deepEqual(result.finance.transactions, fixture.finance.transactions);
  assert.equal(result.scenarioB, null);
});

test('missing finance and malformed money receive validation errors', () => {
  assert.equal(run('./validate-finance.js', { body: { question: 'hi' } }).valid, false);
  const bad = structuredClone(fixture);
  bad.finance.openingBalance = 10.001;
  assert.equal(run('./validate-finance.js', { body: bad }).valid, false);
});

test('invalid dates and an excessive transaction list are rejected', () => {
  const badDate = structuredClone(fixture);
  badDate.finance.startDate = '2026-02-30';
  assert.equal(run('./validate-finance.js', { body: badDate }).valid, false);
  const tooMany = structuredClone(fixture);
  tooMany.finance.transactions = Array.from({ length: 101 }, () => fixture.finance.transactions[0]);
  assert.equal(run('./validate-finance.js', { body: tooMany }).valid, false);
});

test('valid scenarioB is accepted and normalized', () => {
  const withScenario = structuredClone(fixture);
  withScenario.scenarioB = {
    transactions: [
      { date: '2026-11-14', amount: 50, label: 'Wages (reduced)' },
      { date: '2026-12-01', amount: -300, label: 'Rent' },
    ],
    weeklyEssentials: { firstDate: '2026-11-09', amount: 20 },
  };
  const result = run('./validate-finance.js', { body: withScenario });
  assert.equal(result.valid, true);
  assert.equal(result.scenarioB.transactions.length, 2);
  assert.equal(result.scenarioB.transactions[0].amount, 50);
});

test('scenarioB with an out-of-window transaction is rejected', () => {
  const withBadScenario = structuredClone(fixture);
  withBadScenario.scenarioB = {
    transactions: [{ date: '2026-12-05', amount: 50, label: 'Late wages' }],
    weeklyEssentials: { firstDate: '2026-11-09', amount: 20 },
  };
  const result = run('./validate-finance.js', { body: withBadScenario });
  assert.equal(result.valid, false);
});

// ── Forecast ──────────────────────────────────────────────────────────────────

test('forecast uses supplied transactions and weekly essentials', () => {
  const valid = run('./validate-finance.js', { body: fixture });
  const result = run('./forecast.js', valid);
  assert.equal(result.forecast.openingBalance, 200);
  assert.equal(result.forecast.lowestBalance, -80);
  assert.equal(result.forecast.firstShortfallDate, '2026-12-01');
  assert.equal(result.forecast.firstShortfallAmount, -80);
  assert.equal(result.forecast.balanceBeforeNextLoan, -80);
});

test('dailySeries covers every calendar day from startDate to the day before the loan', () => {
  const valid = run('./validate-finance.js', { body: fixture });
  const { forecast } = run('./forecast.js', valid);
  // Nov 7 to Dec 4 inclusive = 28 days
  assert.equal(forecast.dailySeries.length, 28);
  assert.equal(forecast.dailySeries[0].date, '2026-11-07');
  assert.equal(forecast.dailySeries[0].balance, 200);
  assert.equal(forecast.dailySeries[forecast.dailySeries.length - 1].date, '2026-12-04');
  assert.equal(forecast.dailySeries[forecast.dailySeries.length - 1].balance, -80);
});

test('dailySeries reflects events on the correct days', () => {
  const valid = run('./validate-finance.js', { body: fixture });
  const { forecast } = run('./forecast.js', valid);
  // Nov 9: opening 200 − 20 (essentials) = 180
  const nov9 = forecast.dailySeries.find((d) => d.date === '2026-11-09');
  assert.equal(nov9.balance, 180);
  // Nov 14: 180 + 100 (wages) = 280
  const nov14 = forecast.dailySeries.find((d) => d.date === '2026-11-14');
  assert.equal(nov14.balance, 280);
  // Dec 1: 220 − 300 (rent) = −80
  const dec1 = forecast.dailySeries.find((d) => d.date === '2026-12-01');
  assert.equal(dec1.balance, -80);
});

test('negative opening balance is a shortfall on the start date', () => {
  const input = structuredClone(fixture);
  input.finance.openingBalance = -10;
  const valid = run('./validate-finance.js', { body: input });
  const result = run('./forecast.js', valid);
  assert.equal(result.forecast.firstShortfallDate, '2026-11-07');
  assert.equal(result.forecast.firstShortfallAmount, -10);
});

test('scenario B produces a separate forecast inside scenarios block', () => {
  const withScenario = structuredClone(fixture);
  withScenario.scenarioB = {
    transactions: [
      { date: '2026-11-14', amount: 50, label: 'Wages (reduced)' },
      { date: '2026-12-01', amount: -300, label: 'Rent' },
    ],
    weeklyEssentials: { firstDate: '2026-11-09', amount: 20 },
  };
  const valid = run('./validate-finance.js', { body: withScenario });
  const result = run('./forecast.js', valid);

  // Top-level forecast is still the base scenario (backward compatible).
  assert.equal(result.forecast.lowestBalance, -80);

  // scenarios block contains both forecasts with their own dailySeries.
  assert.ok(result.forecast.scenarios, 'scenarios block must exist when scenarioB is provided');
  assert.equal(result.forecast.scenarios.base.lowestBalance, -80);
  assert.ok(result.forecast.scenarios.changed.lowestBalance < result.forecast.scenarios.base.lowestBalance,
    'reduced wages should produce a lower balance than base');
  assert.equal(result.forecast.scenarios.base.dailySeries.length, 28);
  assert.equal(result.forecast.scenarios.changed.dailySeries.length, 28);
});

test('no scenarios block when scenarioB is absent', () => {
  const valid = run('./validate-finance.js', { body: fixture });
  const result = run('./forecast.js', valid);
  assert.equal(result.forecast.scenarios, undefined);
});

// ── Retrieval ─────────────────────────────────────────────────────────────────

test('catalogue failure preserves forecast with no source links', () => {
  const forecast = { forecast: { hasShortfall: true }, question: fixture.question, university: fixture.university, noFamilySupport: false };
  const result = run('./retrieve.js', { error: 'network failure' }, { 'Calculate forecast': forecast });
  assert.equal(result.supportStatus, 'unavailable');
  assert.deepEqual(result.supportSources, []);
  assert.deepEqual(result.forecast, forecast.forecast);
});

test('invalid catalogue URL never reaches the response', () => {
  const poisoned = structuredClone(catalogue);
  poisoned.resources[0].url = 'javascript:alert(1)';
  const forecast = { forecast: { hasShortfall: true }, question: fixture.question, university: fixture.university, noFamilySupport: false };
  const result = run('./retrieve.js', poisoned, { 'Calculate forecast': forecast });
  assert.equal(result.supportStatus, 'unavailable');
  assert.deepEqual(result.supportSources, []);
});

// ── Finalize ──────────────────────────────────────────────────────────────────

test('invalid Anthropic output falls back to deterministic text and approved sources', () => {
  const selected = {
    forecast: { currency: 'GBP', lowestBalance: -80, lowestBalanceDate: '2026-12-01', firstShortfallDate: '2026-12-01', firstShortfallAmount: -80, nextMaintenanceLoanDate: '2026-12-05', balanceBeforeNextLoan: -80 },
    supportSources: [{ id: 'a', title: 'Approved source', url: 'https://example.org/approved' }],
    supportStatus: 'ok',
  };
  const result = run('./finalize.js', { merged_response: '{"draft":"Apply at https://evil.example now"}' }, { 'Select support sources': selected });
  assert.equal(result.draftStatus, 'fallback');
  assert.equal(result.supportSources[0].url, 'https://example.org/approved');
  assert.ok(!result.draft.includes('evil.example'));
  assert.match(result.explanation, /-£80\.00/);
});

test('explanation includes shortfall date and amount', () => {
  const selected = {
    forecast: { currency: 'GBP', lowestBalance: -80, lowestBalanceDate: '2026-12-01', firstShortfallDate: '2026-12-01', firstShortfallAmount: -80, nextMaintenanceLoanDate: '2026-12-05', balanceBeforeNextLoan: -80 },
    supportSources: [], supportStatus: 'unavailable',
  };
  const result = run('./finalize.js', { merged_response: 'invalid' }, { 'Select support sources': selected });
  assert.match(result.explanation, /2026-12-01/);
  assert.match(result.explanation, /-£80\.00/);
});

test('Anthropic may choose only an approved draft focus', () => {
  const selected = {
    forecast: { currency: 'GBP', lowestBalance: 20, lowestBalanceDate: '2026-12-01', firstShortfallDate: null, firstShortfallAmount: null, nextMaintenanceLoanDate: '2026-12-05', balanceBeforeNextLoan: 20 },
    supportSources: [], supportStatus: 'unavailable',
  };
  const result = run('./finalize.js', { merged_response: '{"focus":"budget","draft":"You are guaranteed a grant"}' }, { 'Select support sources': selected });
  assert.equal(result.draftStatus, 'model');
  assert.match(result.draft, /budget/i);
  assert.ok(!result.draft.includes('guaranteed'));
  assert.match(result.explanation, /no projected shortfall/i);
});
