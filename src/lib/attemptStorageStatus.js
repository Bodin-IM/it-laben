/** Describe confirmed storage independently of local test success.
 * @param {{signedIn:boolean,loaded:boolean,pending:boolean,error:boolean,storageWarning:boolean,program:string[],savedSolution:unknown}} state
 */
export function attemptStorageStatus(state) {
	if (!state.signedIn) return { label: 'Bare i denne fanen', detail: 'Start Min lab for å lagre kodeforsøk på kontoen. En oppfrisking mister arbeidet i fanen.' };
	if (state.pending) return {
		label: state.error ? 'Forsøket venter på lagring' : 'Lagrer kodeforsøket …',
		detail: `${state.storageWarning ? 'Nettleseren tillater ikke lokal lagring. Hold fanen åpen.' : 'Vent på bekreftelse før du bytter PC.'} Endringer etter siste prøverunde er ikke med i dette forsøket.`
	};
	if (!state.loaded || state.error) return { label: 'Lagring er ikke bekreftet', detail: 'Kontroller tilkoblingen til Min lab før du lukker siden. Meldinger om lagring vises også under aktiviteten.' };
	const saved = state.savedSolution;
	if (Array.isArray(saved) && saved.length === state.program.length && saved.every((block, index) => block === state.program[index])) {
		return { label: 'Denne koden er lagret på kontoen', detail: 'Du kan hente kodeforsøket igjen med samme profil. Kjør testene på nytt for å undersøke hvordan koden virker.' };
	}
	return { label: 'Denne koden er ikke bekreftet lagret', detail: 'Kjør «Test hele chatten» for å sende kodeforsøket til Min lab. Enkeltprøver, hint og forutsigelser lagres ikke.' };
}
