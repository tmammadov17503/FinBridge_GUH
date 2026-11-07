const MANCHESTER = 'university of manchester';

function words(value) {
  return new Set(String(value ?? '').toLowerCase().match(/[a-z]+/g) ?? []);
}

function isManchester(value) {
  const name = String(value ?? '').trim().toLowerCase();
  return name === MANCHESTER || name === 'manchester';
}

export function retrieveSupport(resources, context = {}, limit = 3) {
  if (!Array.isArray(resources)) throw new TypeError('resources must be an array');
  if (typeof context.question !== 'undefined' && (typeof context.question !== 'string' || context.question.length > 500)) {
    throw new TypeError('question must be a string of at most 500 characters');
  }
  if (typeof context.university !== 'undefined' && (typeof context.university !== 'string' || context.university.length > 100)) {
    throw new TypeError('university must be a string of at most 100 characters');
  }
  const queryWords = words(context.question);
  // This sensitive status must be confirmed by the user, not guessed from wording.
  const lacksFamilySupport = context.noFamilySupport === true;
  const manchester = isManchester(context.university);
  const risk = Boolean(context.shortfall);

  return resources
    .filter((resource) => !resource.university || (manchester && resource.university === MANCHESTER))
    .filter((resource) => !resource.requiresNoFamilySupport || lacksFamilySupport)
    .map((resource) => {
      const overlap = resource.tags.filter((tag) => queryWords.has(tag)).length;
      const score = overlap * 2
        + (risk && resource.tags.includes('hardship') ? 4 : 0)
        + (risk && resource.tags.includes('shortfall') ? 2 : 0)
        + (lacksFamilySupport && resource.id === 'manchester-estranged' ? 7 : 0)
        + (resource.id === 'moneyhelper-student-budget' ? 1 : 0);
      return { resource, score };
    })
    .sort((a, b) => b.score - a.score || a.resource.id.localeCompare(b.resource.id))
    .slice(0, Math.max(0, Math.min(5, Number(limit) || 3)))
    .map(({ resource }) => resource);
}
