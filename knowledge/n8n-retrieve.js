// Paste this file into an n8n Code node after an HTTP Request that fetches sources.json.
// Name the incoming trigger node "Webhook" and run this Code node once for all items.
const catalogue = $input.first().json;
const request = $('Webhook').first().json.body ?? {};
const resources = catalogue.resources;
if (!Array.isArray(resources)) throw new Error('Support catalogue has no resources array');
if (typeof request.question !== 'undefined' && (typeof request.question !== 'string' || request.question.length > 500)) {
  throw new Error('question must be a string of at most 500 characters');
}
if (typeof request.university !== 'undefined' && (typeof request.university !== 'string' || request.university.length > 100)) {
  throw new Error('university must be a string of at most 100 characters');
}

const questionWords = new Set(String(request.question ?? '').toLowerCase().match(/[a-z]+/g) ?? []);
const university = String(request.university ?? '').trim().toLowerCase();
const manchester = university === 'university of manchester' || university === 'manchester';
// A sensitive status is only used when the person explicitly confirms it.
const noFamilySupport = request.noFamilySupport === true;
const shortfall = Boolean(request.shortfall ?? request.forecast?.firstShortfallDate);

const supportSources = resources
  .filter((source) => !source.university || (manchester && source.university === 'university of manchester'))
  .filter((source) => !source.requiresNoFamilySupport || noFamilySupport)
  .map((source) => ({
    source,
    score: source.tags.filter((tag) => questionWords.has(tag)).length * 2
      + (shortfall && source.tags.includes('hardship') ? 4 : 0)
      + (shortfall && source.tags.includes('shortfall') ? 2 : 0)
      + (noFamilySupport && source.id === 'manchester-estranged' ? 7 : 0)
      + (source.id === 'moneyhelper-student-budget' ? 1 : 0),
  }))
  .sort((a, b) => b.score - a.score || a.source.id.localeCompare(b.source.id))
  .slice(0, 3)
  .map(({ source }) => source);

return [{ json: { ...request, supportSources, catalogueCheckedAt: catalogue.checkedAt } }];
