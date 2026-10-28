import { altElevinnhold, innholdsformat } from '#lib/innhold.js';
import { moduler, moduleContents } from '#lib/moduler.js';
import { visibleModules } from '#lib/modulePublication.js';

/** @param {string} text */
export function normalizeSearch(text) {
	return text
		.toLocaleLowerCase('nb-NO')
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replaceAll('ø', 'o')
		.replaceAll('æ', 'ae');
}

/** Search only public catalogue content. Activity type never hides matching modules.
 * Pass confirmed publications (or [] while loading) for the student-facing catalogue.
 * @param {{subject?:string, format?:string, query?:string, publications?:import('#lib/modulePublication.js').ModulePublication[]}} [filters]
 */
export function searchCatalogue({
	subject = 'alle',
	format = 'alle',
	query = '',
	publications
} = {}) {
	const words = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
	const matches = (/** @type {string[]} */ text) => {
		const normalized = normalizeSearch(text.join(' '));
		return words.every((word) => normalized.includes(word));
	};
	return {
		modules: (publications === undefined ? moduler : visibleModules(moduler, publications)).filter(
			(module) =>
				(subject === 'alle' || module.subject === subject) &&
				matches([
					module.title,
					module.description,
					...module.goals,
					...moduleContents(module).flatMap((step) => [
						step.title,
						step.description,
						...step.lessons.map((lesson) => lesson.title)
					])
				])
		),
		activities: altElevinnhold.filter(
			(activity) =>
				(subject === 'alle' || activity.fag === subject) &&
				(format === 'alle' || activity.format === format) &&
				matches([
					activity.tittel,
					activity.beskrivelse,
					activity.type,
					innholdsformat(activity.format).sokeord,
					...activity.emner,
					...activity.sokeord
				])
		)
	};
}
