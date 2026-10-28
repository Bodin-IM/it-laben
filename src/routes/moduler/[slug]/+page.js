import { error, redirect } from '@sveltejs/kit';
import { moduler, moduleAliases } from '#lib/moduler.js';

export function entries() {
	return [
		...moduler.map((module) => ({ slug: module.id })),
		...Object.keys(moduleAliases).map((slug) => ({ slug }))
	];
}

/** @param {{params:{slug:string}}} event */
export function load({ params }) {
	const alias = Object.hasOwn(moduleAliases, params.slug) ? moduleAliases[params.slug] : null;
	if (alias) redirect(307, `/moduler/${alias.id}/#del-${alias.start}`);
	const module = moduler.find((item) => item.id === params.slug);
	if (!module) error(404, 'Modulen finnes ikke.');
	return { module };
}
