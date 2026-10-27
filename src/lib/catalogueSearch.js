import { altElevinnhold, innholdsformat } from '#lib/innhold.js';
import { moduler, moduleContents } from '#lib/moduler.js';

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
 * @param {{subject?:string, format?:string, query?:string}} [filters]
 */
export function searchCatalogue({ subject = 'alle', format = 'alle', query = '' } = {}) {
	const words = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
	const matches = (/** @type {string[]} */ text) => {
		const normalized = normalizeSearch(text.join(' '));
		return words.every((word) => normalized.includes(word));
	};
	return {
		modules: moduler.filter(
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
