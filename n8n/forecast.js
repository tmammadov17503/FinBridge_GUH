// n8n Code node: deterministic forecast from validated, user-supplied finance data.
const request = $input.first().json;
const f = request.finance;
const toPence = (value) => Math.round(value * 100);
const events = f.transactions.map((tx) => ({ date: tx.date, label: tx.label, amountP: toPence(tx.amount) }));
const end = Date.parse(f.nextMaintenanceLoanDate + 'T00:00:00Z');
for (let day = Date.parse(f.weeklyEssentials.firstDate + 'T00:00:00Z'); day < end; day += 7 * 86400000) {
  events.push({ date: new Date(day).toISOString().slice(0, 10), label: 'Weekly essentials', amountP: -toPence(f.weeklyEssentials.amount) });
}
events.sort((a, b) => a.date.localeCompare(b.date) || b.amountP - a.amountP || a.label.localeCompare(b.label));
let balance = toPence(f.openingBalance);
let lowest = balance;
let lowestDate = f.startDate;
let firstShortfallDate = balance < 0 ? f.startDate : null;
const timeline = [];
for (const event of events) {
  balance += event.amountP;
  timeline.push({ date: event.date, label: event.label, amount: event.amountP / 100, balance: balance / 100 });
  if (balance < lowest) { lowest = balance; lowestDate = event.date; }
  if (balance < 0 && firstShortfallDate === null) firstShortfallDate = event.date;
}
return [{ json: {
  forecast: {
    currency: 'GBP',
    scenario: 'provided_transactions',
    startDate: f.startDate,
    openingBalance: f.openingBalance,
    lowestBalance: lowest / 100,
    lowestBalanceDate: lowestDate,
    firstShortfallDate,
    hasShortfall: firstShortfallDate !== null,
    balanceBeforeNextLoan: balance / 100,
    nextMaintenanceLoanDate: f.nextMaintenanceLoanDate,
    timeline,
  },
  question: request.question,
  university: request.university,
  noFamilySupport: request.noFamilySupport,
} }];
