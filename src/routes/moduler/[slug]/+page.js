import { error } from '@sveltejs/kit';
import { moduler } from '#lib/moduler.js';

export function entries() {
	return moduler.map((module) => ({ slug: module.id }));
}

/** @param {{params:{slug:string}}} event */
export function load({ params }) {
	const module = moduler.find((item) => item.id === params.slug);
	if (!module) error(404, 'Modulen finnes ikke.');
	return { module };
}
