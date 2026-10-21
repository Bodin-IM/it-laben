/**
 * Ren modell av hjelpearkets synkrone fillagring.
 *
 * Modulen leser ingen virkelige filer og har ingen nettverkskall eller timere.
 * fileText er den simulerte filens tekst; messages er verdien i serverens minne.
 * Alle offentlige funksjoner er uten sideeffekter og returnerer egne snapshots.
 */

/** @typedef {{ avsender: string, tekst: string }} Message */
/** @typedef {{ status: 201, body: Message }} Response */
/**
 * messages er vanligvis en liste, men JSON.parse validerer ikke at JSON har
 * denne formen. Typen er derfor unknown; visningen må selv sjekke hvilken
 * verdi den får. Ingen validering legges til hjelpearkets viste kildekode.
 *
 * readText og serializedText er mellomresultater for undervisningsvisningen.
 * null i fileText betyr at filen ikke finnes; en tom streng betyr en tom fil.
 *
 * @typedef {{
 *   running: boolean,
 *   messages: unknown,
 *   fileText: string | null,
 *   readText: string | null,
 *   serializedText: string | null,
 *   response: Response | null
 * }} State
 */
/** @typedef {'start' | 'post' | 'restart'} Action */
/** @typedef {{ saveEnabled: boolean, message: Message }} Options */
/**
 * id er stabil innen en handling. line peker til hjelpearkets linjenummer,
 * eller er null når trinnet bare setter opp/avslår en simulert kjøring.
 *
 * Første reset-/push-/blocked-trinn eier et snapshot fra planleggingen.
 * Dermed endrer ikke senere redigering av inndata en allerede planlagt kjøring.
 * De påfølgende trinnene bruker tilstanden fra forrige advance-kall.
 *
 * @typedef {{ id: string, line: number | null } & (
 *   { operation: 'reset', data: { snapshot: State, action: 'start' | 'restart' } }
 *   | { operation: 'exists', data: { exists: boolean } }
 *   | { operation: 'create-file' | 'read-file' | 'parse' | 'save-call' | 'skip-save' | 'stringify' | 'write-file' }
 *   | { operation: 'push', data: { snapshot: State, message: Message } }
 *   | { operation: 'response', data: { message: Message, saveEnabled: boolean } }
 *   | { operation: 'blocked', data: { snapshot: State, reason: 'not-running' | 'not-array' } }
 * )} Step
 */
/**
 * value er alltid en visningsstreng. label forteller om den viser filtekst,
 * en JavaScript-verdi, et funksjonskall eller et HTTP-svar.
 *
 * @typedef {{ title: string, text: string, value: string, label: string }} Info
 */
/** @typedef {{ state: State, info: Info, failed: boolean }} AdvanceResult */

/**
 * Kopierer JSON-data rekursivt, også objekter inne i lister.
 * Bruker bare vanlige JavaScript-verdier, uten browser- eller Node-API-er.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function copyJson(value) {
	if (Array.isArray(value)) return value.map(copyJson);
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyJson(item)]));
	}
	return value;
}

/** @param {Message} message @returns {Message} */
function copyMessage(message) {
	return { avsender: message.avsender, tekst: message.tekst };
}

/** @param {State} state @returns {State} */
function copyState(state) {
	return {
		running: state.running,
		messages: copyJson(state.messages),
		fileText: state.fileText,
		readText: state.readText,
		serializedText: state.serializedText,
		response: state.response ? { status: 201, body: copyMessage(state.response.body) } : null
	};
}

/**
 * Oppretter en tom servermodell. Ingen fil finnes før første oppstart.
 *
 * @returns {State}
 */
export function createState() {
	return {
		running: false,
		messages: null,
		fileText: null,
		readText: null,
		serializedText: null,
		response: null
	};
}

/**
 * Planlegger én kjøring uten å endre inndata.
 *
 * Start og restart følger samme oppstartskode. De bevarer filen, tømmer
 * minnet og oppretter bare en ny fil dersom fileText er null.
 * Funksjonsdeklarasjonen på linje 9–11 utføres ikke ved oppstart.
 *
 * POST-planen snapshoter både meldingen og saveEnabled. Den kjører push før
 * eventuell lagring, og sender 201 til slutt, også hvis lagring er slått av.
 * POST før oppstart eller med feil type i minnet gir et forklarende stopptrinn.
 *
 * @param {State} state
 * @param {Action} action
 * @param {Options} options
 * @returns {Step[]}
 */
export function planRun(state, action, options) {
	const snapshot = copyState(state);
	if (action === 'start' || action === 'restart') {
		const exists = snapshot.fileText !== null;
		/** @type {Step[]} */
		const steps = [
			{
				id: action + '-reset',
				line: null,
				operation: 'reset',
				data: { snapshot, action }
			},
			{
				id: action + '-exists',
				line: 4,
				operation: 'exists',
				data: { exists }
			}
		];
		if (!exists) {
			steps.push({ id: action + '-create-file', line: 5, operation: 'create-file' });
		}
		steps.push(
			{ id: action + '-read-file', line: 7, operation: 'read-file' },
			{ id: action + '-parse', line: 7, operation: 'parse' }
		);
		return steps;
	}

	if (!snapshot.running || !Array.isArray(snapshot.messages)) {
		return [
			{
				id: 'post-blocked',
				line: snapshot.running ? 14 : null,
				operation: 'blocked',
				data: {
					snapshot,
					reason: snapshot.running ? 'not-array' : 'not-running'
				}
			}
		];
	}

	const message = copyMessage(options.message);
	const saveEnabled = options.saveEnabled;
	/** @type {Step[]} */
	const steps = [
		{
			id: 'post-push',
			line: 14,
			operation: 'push',
			data: { snapshot, message: copyMessage(message) }
		}
	];
	if (saveEnabled) {
		steps.push(
			{ id: 'post-save-call', line: 15, operation: 'save-call' },
			{ id: 'post-stringify', line: 10, operation: 'stringify' },
			{ id: 'post-write-file', line: 10, operation: 'write-file' }
		);
	} else {
		steps.push({ id: 'post-skip-save', line: 15, operation: 'skip-save' });
	}
	steps.push({
		id: 'post-response',
		line: 16,
		operation: 'response',
		data: { message: copyMessage(message), saveEnabled }
	});
	return steps;
}

/**
 * Lager en konsekvent resultatkonvolutt. state skal allerede være et nytt
 * snapshot, og info bygges på nytt for hvert trinn.
 *
 * @param {State} state
 * @param {string} title
 * @param {string} text
 * @param {string} label
 * @param {string} value
 * @param {boolean} [failed=false]
 * @returns {AdvanceResult}
 */
function result(state, title, text, label, value, failed = false) {
	return { state, info: { title, text, label, value }, failed };
}

/**
 * Utfører ett modelltrinn på et nytt snapshot.
 *
 * Kalleren sender videre state fra dette resultatet til neste trinn og stopper
 * planen hvis failed er true. Ingen del av state eller step blir mutert.
 *
 * Ved JSON-syntaksfeil stopper oppstarten på linje 7 med running false.
 * Filteksten beholdes nøyaktig som den var. Gyldig JSON som ikke er en liste
 * blir derimot parset: hjelpearkets kildekode har ingen typevalidering.
 *
 * @param {State} state
 * @param {Step} step
 * @returns {AdvanceResult}
 */
export function advance(state, step) {
	let next = copyState(state);

	switch (step.operation) {
		case 'reset': {
			next = copyState(step.data.snapshot);
			next.running = false;
			next.messages = null;
			next.readText = null;
			next.serializedText = null;
			next.response = null;
			return result(
				next,
				step.data.action === 'restart' ? 'Serverens minne tømmes.' : 'Serveren starter.',
				'En ny serverkjøring har ikke den gamle listen i minnet. Filen beholdes og skal nå leses inn.',
				'Filen før oppstart',
				next.fileText === null ? '(Filen finnes ikke.)' : next.fileText
			);
		}
		case 'exists':
			return result(
				next,
				step.data.exists ? 'meldinger.json finnes fra før.' : 'meldinger.json finnes ikke ennå.',
				step.data.exists
					? 'existsSync gir true. Uttrykket !existsSync(fil) blir false, så opprettelsen på linje 5 hoppes over.'
					: 'existsSync gir false. Uttrykket !existsSync(fil) blir true, så neste linje skal opprette en fil med en tom JSON-liste.',
				'existsSync(fil)',
				String(step.data.exists)
			);
		case 'create-file':
			next.fileText = '[]';
			return result(
				next,
				'En fil med en tom JSON-liste opprettes.',
				'writeFileSync skriver teksten [] med UTF-8. Listen i serverens minne er ikke lest inn ennå.',
				'meldinger.json',
				next.fileText
			);
		case 'read-file':
			if (next.fileText === null) {
				next.running = false;
				next.readText = null;
				return result(
					next,
					'Filen kunne ikke leses.',
					'Filen finnes ikke. Oppstarten kan ikke fortsette til JSON.parse uten at filen først er opprettet.',
					'Filen',
					'(Filen finnes ikke.)',
					true
				);
			}
			next.readText = next.fileText;
			return result(
				next,
				'readFileSync leser tekst.',
				'Innholdet fra filen er en streng. JSON.parse har ikke gjort teksten om til en JavaScript-verdi ennå.',
				'Resultat fra readFileSync · streng',
				JSON.stringify(next.readText)
			);
		case 'parse': {
			if (next.readText === null) {
				next.running = false;
				return result(
					next,
					'Det er ingen filtekst å parse.',
					'Kjør innlesingen først. JSON.parse trenger teksten som readFileSync har returnert.',
					'Filtekst',
					'(Ingen tekst er lest.)',
					true
				);
			}
			try {
				/** @type {unknown} */
				const parsed = JSON.parse(next.readText);
				next.messages = copyJson(parsed);
				next.running = true;
				return result(
					next,
					Array.isArray(parsed)
						? 'Listen er klar i serverens minne.'
						: 'JSON.parse lykkes, men verdien er ikke en liste.',
					Array.isArray(parsed)
						? 'JSON.parse gjør filteksten om til en JavaScript-liste. Oppstarten er ferdig. Funksjonen lagreMeldinger er bare definert, ikke kalt.'
						: 'Dette er gyldig JSON. Hjelpearket sjekker ikke typen, men meldinger.push forutsetter en liste. Et POST-forsøk vil derfor ikke fungere med denne verdien.',
					Array.isArray(parsed) ? 'meldinger · JavaScript-liste' : 'meldinger · annen JSON-verdi',
					JSON.stringify(parsed, null, 2)
				);
			} catch {
				next.running = false;
				next.messages = null;
				return result(
					next,
					'JSON.parse stopper oppstarten.',
					'Filteksten er ikke gyldig JSON. Kontroller doble anførselstegn, komma og klammer. Koden stopper på linje 7; filen endres ikke.',
					'Filtekst som ikke kunne parses',
					JSON.stringify(next.readText),
					true
				);
			}
		}
		case 'push': {
			next = copyState(step.data.snapshot);
			next.readText = null;
			next.serializedText = null;
			next.response = null;
			if (!next.running || !Array.isArray(next.messages)) {
				return result(
					next,
					'Meldingen kan ikke legges til.',
					'POST-forsøket trenger en startet server og en liste i meldinger. Ingen fil blir endret.',
					'meldinger',
					JSON.stringify(next.messages, null, 2),
					true
				);
			}
			next.messages = [...next.messages, copyMessage(step.data.message)];
			return result(
				next,
				'push endrer listen i minnet.',
				'Den nye meldingen er lagt til i meldinger. Filen har fortsatt sitt gamle innhold; push skriver ingen fil.',
				'meldinger · JavaScript-liste',
				JSON.stringify(next.messages, null, 2)
			);
		}
		case 'save-call':
			return result(
				next,
				'lagreMeldinger() kalles.',
				'Nå kjøres funksjonskroppen på linje 10. Før filen kan skrives, må JSON.stringify lage teksten som skal lagres.',
				'Funksjonskall',
				'lagreMeldinger()'
			);
		case 'skip-save':
			return result(
				next,
				'Lagringskallet er kommentert bort.',
				'lagreMeldinger() kjøres ikke. Listen er endret i minnet, men verken JSON.stringify eller writeFileSync blir kalt.',
				'meldinger.json · uendret',
				next.fileText === null ? '(Filen finnes ikke.)' : next.fileText
			);
		case 'stringify':
			next.serializedText = JSON.stringify(next.messages, null, 2);
			return result(
				next,
				'JSON.stringify lager filtekst.',
				'Listen gjøres om til JSON-tekst med innrykk på to mellomrom. Filen er fortsatt uendret; skrivingen kommer i neste trinn.',
				'JSON-tekst klar for writeFileSync',
				next.serializedText
			);
		case 'write-file':
			if (next.serializedText === null) {
				return result(
					next,
					'Ingen JSON-tekst er klar for skriving.',
					'Kjør JSON.stringify-trinnet først. Filen er ikke endret.',
					'meldinger.json · uendret',
					next.fileText === null ? '(Filen finnes ikke.)' : next.fileText,
					true
				);
			}
			next.fileText = next.serializedText;
			return result(
				next,
				'writeFileSync erstatter filinnholdet.',
				'Hele listen er nå skrevet til meldinger.json som UTF-8-tekst. En ny serverkjøring kan lese dette innholdet.',
				'meldinger.json',
				next.fileText
			);
		case 'response':
			next.response = { status: 201, body: copyMessage(step.data.message) };
			return result(
				next,
				'POST-ruten svarer 201.',
				step.data.saveEnabled
					? 'Ruten returnerer den nye meldingen til frontend. I denne kjøringen ble filen skrevet før svaret.'
					: 'Ruten svarer 201 selv om lagringskallet er kommentert bort. Den nye meldingen finnes bare i serverens minne.',
				'HTTP-svar · 201 Created',
				JSON.stringify(next.response.body, null, 2)
			);
		case 'blocked':
			next = copyState(step.data.snapshot);
			next.response = null;
			return result(
				next,
				step.data.reason === 'not-running'
					? 'Start serveren først.'
					: 'meldinger er ikke en liste.',
				step.data.reason === 'not-running'
					? 'POST-forsøket kan ikke kjøres før oppstarten har lest og parset filen.'
					: 'JSON.parse godtok filen, men verdien har ingen push-metode. Hjelpearket validerer ikke at JSON er en liste. Filen blir ikke endret.',
				'meldinger',
				JSON.stringify(next.messages, null, 2),
				true
			);
	}
}
