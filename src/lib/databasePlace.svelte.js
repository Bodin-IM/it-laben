import { untrack } from 'svelte';
import { page } from '$app/state';
import { goto } from '$app/navigation';
import { databasePlaces, restoreJourney, journeyKey } from './databaseJourney.js';

/** A bookmark is a location, never proof of completion. Explicit links take precedence.
 * @param {string} activityId @param {()=>string} getScope */
export function createDatabasePlace(activityId, getScope) {
	const definition = databasePlaces.find((p) => p.id === activityId);
	if (!definition) throw new Error('Ukjent databaseside.');
	const place = definition;
	const scope = $derived(getScope());
	const state = $state({ position: place.steps[0].id, ready: false, scope: '', warning: '' });
	$effect(() => {
		const currentScope = scope;
		const parameter = page.url.searchParams.get(place.parameter);
		untrack(() => {
			let saved = restoreJourney(null);
			state.warning = '';
			try { saved = restoreJourney(JSON.parse(localStorage.getItem(journeyKey(currentScope)) ?? 'null')); }
			catch { state.warning = 'Sist åpnet del kunne ikke hentes fra nettleseren.'; }
			// A profile change on the same URL must not carry over the previous profile's location.
			const changingProfile = state.ready && state.scope !== currentScope;
			state.position = !changingProfile && place.steps.some((s) => s.id === parameter)
				? /** @type {string} */ (parameter) : saved.positions[activityId] ?? place.steps[0].id;
			state.scope = currentScope;
			state.ready = true;
			remember();
		});
	});
	function remember() {
		if (!state.ready || state.scope !== scope) return;
		try {
			const key = journeyKey(scope);
			let saved = restoreJourney(null);
			try { saved = restoreJourney(JSON.parse(localStorage.getItem(key) ?? 'null')); }
			catch { /* A corrupt bookmark must not prevent saving a new, known location. */ }
			localStorage.setItem(key, JSON.stringify({ version: 1, positions: { ...saved.positions, [activityId]: state.position }, last: activityId }));
			state.warning = '';
		} catch { state.warning = 'Plassen din kunne ikke lagres. Du kan fortsette her og bruke lenken til denne delen senere.'; }
	}
	/** @param {string} id */
	async function select(id) {
		if (!place.steps.some((step) => step.id === id) || !state.ready) return;
		state.position = id;
		remember();
		const url = new URL(page.url.href);
		url.searchParams.set(place.parameter, id);
		await goto(url.pathname + url.search, { reset: false });
	}
	return { state, select };
}
