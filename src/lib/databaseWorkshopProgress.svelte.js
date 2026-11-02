import { initialWorkshop, restoreWorkshop, validWorkshopChoices } from './databaseWorkshop.js';

/** @param {()=>string} getScope */
export function createWorkshopProgress(getScope) {
	const scope = $derived(getScope());
	const state = $state({ attempts: initialWorkshop(), ready: false, scope: '', warning: '' });
	$effect(() => {
		const current = scope;
		let attempts = initialWorkshop(), warning = '';
		try { attempts = restoreWorkshop(JSON.parse(localStorage.getItem(`it-laben:databaser:verksted:v1:${current}`) ?? 'null')); }
		catch { warning = 'Lagrede verkstedforsøk kunne ikke hentes. Du kan prøve oppdragene på nytt.'; }
		state.attempts = attempts;
		state.scope = current;
		state.warning = warning;
		state.ready = true;
	});
	/** @param {string} id @param {import('./databaseWorkshop.js').WorkshopAttempt} attempt */
	function save(id, attempt) {
		if (!state.ready || state.scope !== scope || !validWorkshopChoices(id, attempt.choices) || (attempt.run !== null && !validWorkshopChoices(id, attempt.run))) return;
		state.attempts = { ...state.attempts, [id]: attempt };
		try {
			localStorage.setItem(`it-laben:databaser:verksted:v1:${scope}`, JSON.stringify({ version: 1, attempts: state.attempts }));
			state.warning = '';
		} catch { state.warning = 'Forsøket vises, men kunne ikke lagres. Hold siden åpen for å beholde arbeidet.'; }
	}
	return { state, save };
}
