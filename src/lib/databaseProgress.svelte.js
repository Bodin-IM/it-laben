import { DATABASE_VERSION, initialAttempts, restoreAttempts } from '#lib/databaseCourse.js';

/** Per-component state: never shared between server requests or account scopes.
 * @param {()=>string} getScope */
export function createDatabaseProgress(getScope) {
	const state = $state({ attempts: initialAttempts(), ready: false, warning: '', key: '' });
	// Changes to connection/error state in the lab store must not reload this workspace.
	const scope = $derived(getScope());
	$effect(() => {
		const key = `it-laben:databaser:v${DATABASE_VERSION}:${scope}`;
		let attempts = initialAttempts();
		let warning = '';
		try {
			const stored = localStorage.getItem(key);
			if (stored) attempts = restoreAttempts(JSON.parse(stored));
		} catch {
			warning =
				'Nettleseren kunne ikke hente lagrede forsøk. Arbeidet kan fortsatt gjøres her. Ved bytte av side kan du måtte gjøre grunnøvingene igjen.';
		}
		state.attempts = attempts;
		state.key = key;
		state.warning = warning;
		state.ready = true;
	});
	/** @param {string} id @param {import('#lib/databaseCourse.js').QueryAttempt} attempt */
	function save(id, attempt) {
		if (!state.ready || !Object.hasOwn(state.attempts, id)) return;
		state.attempts = { ...state.attempts, [id]: attempt };
		try {
			localStorage.setItem(
				state.key,
				JSON.stringify({ version: DATABASE_VERSION, attempts: state.attempts })
			);
			state.warning = '';
		} catch {
			state.warning =
				'Arbeidet er oppdatert, men kunne ikke lagres i nettleseren. Hold siden åpen. På kodeoppgaven kan du åpne innholdet for gjennomgang med læreren.';
		}
	}
	return { state, save };
}
