// n8n Code node after the catalogue request. Keep this ranking aligned with retrieve.mjs.
const catalogue = $input.first().json;
const request = $('Calculate forecast').first().json;
const forecast = request.forecast;
const resources = catalogue?.resources;
const usable = Array.isArray(resources) && resources.length > 0 && resources.every((source) =>
  source && typeof source.id === 'string' && typeof source.title === 'string'
  && typeof source.url === 'string' && /^https:\/\//.test(source.url)
  && Array.isArray(source.tags) && source.tags.every((tag) => typeof tag === 'string')
  && (source.university === undefined || typeof source.university === 'string')
  && (source.requiresNoFamilySupport === undefined || typeof source.requiresNoFamilySupport === 'boolean'));
if (!usable) {
  return [{ json: { ...request, supportSources: [], supportStatus: 'unavailable', catalogueCheckedAt: null } }];
}

const questionWords = new Set(String(request.question ?? '').toLowerCase().match(/[a-z]+/g) ?? []);
const university = String(request.university ?? '').trim().toLowerCase();
const manchester = university === 'university of manchester' || university === 'manchester';
const noFamilySupport = request.noFamilySupport === true;
const shortfall = forecast.hasShortfall === true;
const supportSources = resources
  .filter((source) => !source.university || (manchester && source.university === 'university of manchester'))
  .filter((source) => !source.requiresNoFamilySupport || noFamilySupport)
  .map((source) => ({
    source,
    score: source.tags.filter((tag) => questionWords.has(tag)).length * 2
      + (shortfall && source.tags.includes('hardship') ? 4 : 0)
      + (shortfall && source.tags.includes('shortfall') ? 2 : 0)
      + (noFamilySupport && source.id === 'manchester-estranged' ? 7 : 0)
      + (source.id === 'student-minds-budget' ? 1 : 0),
  }))
  .sort((a, b) => b.score - a.score || a.source.id.localeCompare(b.source.id))
  .slice(0, 3)
  .map(({ source }) => source);

return [{ json: { ...request, supportSources, supportStatus: 'ok', catalogueCheckedAt: catalogue.checkedAt ?? null } }];
