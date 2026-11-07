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

function run(file, input, nodes = {}) {
  const code = readFileSync(new URL(file, import.meta.url), 'utf8');
  const result = runInNewContext(`(function () { ${code} })()`, {
    $input: { first: () => ({ json: input }) },
    $: (name) => ({ first: () => ({ json: nodes[name] }) }),
  });
  return structuredClone(result[0].json);
}

test('valid finance input is normalized without fictional data', () => {
  const result = run('./validate-finance.js', { body: fixture });
  assert.equal(result.valid, true);
  assert.deepEqual(result.finance.transactions, fixture.finance.transactions);
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

test('forecast uses supplied transactions and weekly essentials', () => {
  const valid = run('./validate-finance.js', { body: fixture });
  const result = run('./forecast.js', valid);
  assert.equal(result.forecast.openingBalance, 200);
  assert.equal(result.forecast.lowestBalance, -80);
  assert.equal(result.forecast.firstShortfallDate, '2026-12-01');
  assert.equal(result.forecast.balanceBeforeNextLoan, -80);
});

test('negative opening balance is a shortfall on the start date', () => {
  const input = structuredClone(fixture);
  input.finance.openingBalance = -10;
  const valid = run('./validate-finance.js', { body: input });
  const result = run('./forecast.js', valid);
  assert.equal(result.forecast.firstShortfallDate, '2026-11-07');
});

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

test('invalid Anthropic output falls back to deterministic text and approved sources', () => {
  const selected = {
    forecast: { currency: 'GBP', lowestBalance: -80, lowestBalanceDate: '2026-12-01', firstShortfallDate: '2026-12-01', nextMaintenanceLoanDate: '2026-12-05', balanceBeforeNextLoan: -80 },
    supportSources: [{ id: 'a', title: 'Approved source', url: 'https://example.org/approved' }],
    supportStatus: 'ok',
  };
  const result = run('./finalize.js', { merged_response: '{"draft":"Apply at https://evil.example now"}' }, { 'Select support sources': selected });
  assert.equal(result.draftStatus, 'fallback');
  assert.equal(result.supportSources[0].url, 'https://example.org/approved');
  assert.ok(!result.draft.includes('evil.example'));
  assert.match(result.explanation, /-£80\.00/);
});

test('Anthropic may choose only an approved draft focus', () => {
  const selected = {
    forecast: { currency: 'GBP', lowestBalance: 20, lowestBalanceDate: '2026-12-01', firstShortfallDate: null, nextMaintenanceLoanDate: '2026-12-05', balanceBeforeNextLoan: 20 },
    supportSources: [], supportStatus: 'unavailable',
  };
  const result = run('./finalize.js', { merged_response: '{"focus":"budget","draft":"You are guaranteed a grant"}' }, { 'Select support sources': selected });
  assert.equal(result.draftStatus, 'model');
  assert.match(result.draft, /budget/i);
  assert.ok(!result.draft.includes('guaranteed'));
  assert.match(result.explanation, /no projected shortfall/i);
});
