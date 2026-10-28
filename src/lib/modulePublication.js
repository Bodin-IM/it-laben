/** Module publication describes teaching pace, never a student's completion or understanding.
 * @typedef {'upcoming'|'active'|'completed'} ModuleStatus
 * @typedef {{id:string,status:ModuleStatus,revision:number,updatedAt:number|null}} ModulePublication
 */

export const moduleStatusLabels = Object.freeze({
	upcoming: 'Kommende',
	active: 'Aktiv',
	completed: 'Ferdig'
});

/** @param {unknown} value @returns {value is ModuleStatus} */
export function isModuleStatus(value) {
	return typeof value === 'string' && Object.hasOwn(moduleStatusLabels, value);
}

/** New catalogue entries stay hidden until a teacher publishes them.
 * @param {string} id
 * @param {ModulePublication[]} [records]
 * @returns {ModulePublication}
 */
export function publicationFor(id, records = []) {
	return (
		records.find((record) => record.id === id) ?? {
			id,
			status: 'upcoming',
			revision: 0,
			updatedAt: null
		}
	);
}

/** Keep catalogue order within a status group without mutating the catalogue.
 * @template {{id:string}} T
 * @param {T[]} modules
 * @param {ModulePublication[]} [records]
 * @returns {T[]}
 */
export function orderedModules(modules, records = []) {
	const order = { active: 0, completed: 1, upcoming: 2 };
	return [...modules].sort(
		(a, b) =>
			order[publicationFor(a.id, records).status] - order[publicationFor(b.id, records).status]
	);
}

/** Completed modules remain available for revisiting and repetition.
 * @template {{id:string}} T
 * @param {T[]} modules
 * @param {ModulePublication[]} [records]
 * @returns {T[]}
 */
export function visibleModules(modules, records = []) {
	return orderedModules(modules, records).filter(
		(module) => publicationFor(module.id, records).status !== 'upcoming'
	);
}
