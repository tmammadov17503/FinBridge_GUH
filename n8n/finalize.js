// n8n Code node after Anthropic. The model can select a draft focus, never response text or URLs.
const selected = $('Select support sources').first().json;
const forecast = selected.forecast;
const money = (value) => (value < 0 ? '-£' : '£') + Math.abs(value).toFixed(2);
const shortfallAmount = forecast.firstShortfallAmount ?? forecast.lowestBalance;
const shortfall = forecast.firstShortfallDate
  ? `Your first projected shortfall is on ${forecast.firstShortfallDate} (${money(shortfallAmount)}).`
  : 'There is no projected shortfall before the next maintenance loan.';
const explanation = `Your projected lowest balance is ${money(forecast.lowestBalance)} on ${forecast.lowestBalanceDate}. ${shortfall} Your balance before the next maintenance loan on ${forecast.nextMaintenanceLoanDate} is ${money(forecast.balanceBeforeNextLoan)}. This estimate uses the transactions you supplied.`;
const drafts = {
  general: 'Hello, I would like to discuss my financial situation and ask what support options may be available. Could you tell me what information you need? Thank you.',
  rent: 'Hello, I am concerned about covering my rent and would like to discuss possible support options. Could you tell me what information you need? Thank you.',
  budget: 'Hello, I would like help reviewing my budget and understanding what support options may be available. Could you tell me what information you need? Thank you.',
};
const incoming = $input.first().json;
const raw = incoming?.merged_response ?? incoming?.content?.filter((part) => part.type === 'text').map((part) => part.text).join('\n');
let focus = 'general';
let draftStatus = 'fallback';
try {
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed === 'object' && ['general', 'rent', 'budget'].includes(parsed.focus)) {
    focus = parsed.focus;
    draftStatus = 'model';
  }
} catch (error) { /* Use the general draft when Anthropic fails or returns invalid JSON. */ }
return [{ json: {
  forecast,
  explanation,
  draft: drafts[focus],
  supportSources: selected.supportSources,
  supportStatus: selected.supportStatus,
  draftStatus,
  catalogueCheckedAt: selected.catalogueCheckedAt,
} }];
