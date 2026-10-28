import { moduler, moduleContents, moduleAliases } from '#lib/moduler.js';

/** A URL may identify a module only when that module actually links to the current page.
 * @param {string} pathname
 * @param {string|null|undefined} moduleId
 */
export function moduleContext(pathname, moduleId) {
	// A direct activity link belongs to its single owning module; explicit invalid IDs never fall back.
	const owners =
		moduleId == null
			? moduler.filter((item) => moduleContents(item).some((step) => step.href === pathname))
			: [];
	const canonical =
		moduleAliases[moduleId ?? '']?.id ?? moduleId ?? (owners.length === 1 ? owners[0].id : null);
	const module = moduler.find((item) => item.id === canonical);
	if (!module) return null;
	const steps = moduleContents(module);
	let index = steps.findIndex((step) => step.href === pathname);
	if (index < 0)
		index = steps.findIndex((step) => step.lessons.some((lesson) => lesson.href === pathname));
	if (index < 0 && !module.resources.some((resource) => resource.href === pathname)) return null;
	return {
		module,
		backHref: `/moduler/${module.id}/#${index < 0 ? 'forlop' : `del-${index + 1}`}`
	};
}

/** Preserve context only for destinations belonging to the chosen module.
 * @param {string} href
 * @param {string|null|undefined} moduleId
 */
export function moduleLink(href, moduleId) {
	const url = new URL(href, 'https://it-laben.invalid');
	if (url.origin !== 'https://it-laben.invalid') return href;
	url.searchParams.delete('modul');
	const context = moduleContext(url.pathname, moduleId);
	if (context) url.searchParams.set('modul', context.module.id);
	return url.pathname + url.search + url.hash;
}
