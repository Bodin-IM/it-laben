import { queryTasks, databasePhases } from './databaseCourse.js';
import { databaseSections } from './databaseIntro.js';
import { workshopTasks } from './databaseWorkshop.js';

export const databasePlaces = [
	{ id: 'database-finn', title: 'Finn riktig utstyr', path: '/databaser/finn-utstyr/', parameter: 'oppdrag', steps: queryTasks.map((t) => ({ id: t.id, title: t.title })) },
	{ id: 'database-verksted', title: 'Utstyrsboden · dataverksted', path: '/databaser/utstyrsboden/', parameter: 'oppdrag', steps: workshopTasks.map((t) => ({ id: t.id, title: t.title })) },
	{ id: 'database-praksis', title: 'Kod ditt eget register', path: '/databaser/praksis/', parameter: 'steg', steps: databasePhases.map((id, i) => ({ id, title: ['Klargjør', 'Legg inn data', 'Skriv egne søk', 'Test og forklar'][i] })) },
	{ id: 'database-grunnlag', title: 'Teori og eksempler', path: '/databaser/grunnlag/', parameter: 'del', steps: databaseSections.map((s) => ({ id: s.id, title: s.label })) }
];
/** @typedef {{positions:Record<string,string>,last:string|null}} DatabaseJourney */
/** @param {unknown} raw @returns {DatabaseJourney} */
export function restoreJourney(raw) {
	const empty = { positions: {}, last: null };
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty;
	const saved = /** @type {Record<string,any>} */ (raw);
	if (saved.version !== 1) return empty;
	/** @type {Record<string,string>} */ const positions = {};
	for (const place of databasePlaces) if (place.steps.some((s) => s.id === saved.positions?.[place.id])) positions[place.id] = saved.positions[place.id];
	return { positions, last: typeof saved.last === 'string' && Object.hasOwn(positions, saved.last) ? saved.last : null };
}
/** @param {DatabaseJourney} journey */
export function resumeDatabase(journey) {
	const place = databasePlaces.find((p) => p.id === journey.last);
	const step = place?.steps.find((s) => s.id === journey.positions[place.id]);
	return place && step ? { title: `${place.title} · ${step.title}`, href: `${place.path}?modul=databaser&${place.parameter}=${step.id}` } : null;
}
/** @param {string} scope */
export const journeyKey = (scope) => `it-laben:databaser:plass:v1:${scope}`;
