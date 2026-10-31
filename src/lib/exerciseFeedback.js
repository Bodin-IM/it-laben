import { validationFeedback } from './ovingModel.js';

/** @typedef {import('./ovingModel.js').Step} Step */
/** @typedef {{result:string,cause:string,next:string}} Feedback */
/** @param {unknown} value @returns {Record<string,unknown>} */
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
/** @param {unknown} value */
const count = (value) => Array.isArray(value) ? value.length : 0;
/** @param {string} result @param {string} cause @param {string} next @returns {Feedback} */
const feedback = (result, cause, next) => ({ result, cause, next });

/** Read only a completed run. Current form values, task selection and account progress
 * are deliberately not inputs. The caller hides this when inspecting an earlier step.
 * @param {number} number
 * @param {Step[]} trace
 * @returns {Feedback|null}
 */
export function exerciseFeedback(number, trace) {
	const last = trace.at(-1);
	if (!last) return null;
	if (number === 7) return validationFeedback(trace);
	const data = last.data;
	const status = last.status;
	const before = trace[0].data;

	if (number === 5) {
		if (status.startsWith('201')) return feedback(
			`Backend svarte 201. Listen gikk fra ${count(before['Minne · meldinger'])} til ${count(data['Minne · meldinger'])} meldinger, både i minnet og i filen.`,
			'Den nye listen ble skrevet til fil før den erstattet listen i minnet. Først da bekreftet serveren lagringen.',
			'Behold teksten, velg «Skrivingen feiler» og sammenlign minnet og datafilen med dette forsøket.'
		);
		if (status.startsWith('400')) return feedback(
			'Backend svarte 400. Ingen melding ble lagt til i minnet eller filen.',
			'Tekstkontrollen stoppet requesten før lagringen fordi teksten var tom etter trim eller hadde feil datatype.',
			'Skriv en vanlig melding og kjør samme lagringsforsøk. Finn hvor dataene nå kan endres.'
		);
		if (status.startsWith('500')) return feedback(
			'Backend svarte 500. Den gamle listen i minnet og den gamle datafilen ble beholdt.',
			'Skrivingen feilet. Den nye arbeidskopien ble derfor aldri tatt i bruk, og serveren bekreftet ikke lagring.',
			'Velg «Lagre en melding» med samme tekst. Sammenlign når filen, minnet og HTTP-svaret endres.'
		);
		if (status.startsWith('Oppstart feilet')) return feedback(
			'Oppstarten stoppet. Filen ble beholdt, og meldingslisten ble ikke lastet inn.',
			status.includes('SyntaxError')
				? 'JSON.parse kunne ikke lese filteksten fordi JSON-formatet var ugyldig.'
				: 'JSON-teksten kunne leses, men inneholdt et objekt. Appen forventet en liste.',
			'Sammenlign med «Filen finnes ikke». Forklar hvorfor en ødelagt fil ikke skal erstattes automatisk med en tom liste.'
		);
		if (status.startsWith('Oppstart OK')) return before['Disk · meldinger.json'] === null ? feedback(
			'Appen startet med en tom liste. Ingen HTTP-request ble sendt, og ingen ny datafil ble skrevet i dette forsøket.',
			'Filen manglet. Lesefunksjonen håndterte ENOENT ved å returnere en tom liste.',
			'Velg «Filen har ugyldig JSON». Skal den feilen også gi en tom liste, eller bør oppstarten stoppe?'
		) : feedback(
			`Etter omstart ble ${count(data['Minne · meldinger'])} meldinger lest fra filen inn i minnet. Det ble ikke sendt noe HTTP-svar.`,
			'Prosessens gamle minne var borte, men JSON-filen lå fortsatt på disk og kunne leses ved oppstart.',
			'Sammenlign med «Filen finnes ikke». Hvilke data har appen å starte med da?'
		);
	}

	if (number === 6) {
		const request = record(data.Request);
		if (status.startsWith('404')) return feedback(
			'Backend svarte 404. Ingen melding ble endret eller slettet.',
			'ID-en i adressen fantes ikke. Ruten stoppet før den laget eller lagret en ny liste.',
			'Behold metoden, velg en eksisterende ID og prøv igjen. Kontroller at bare riktig melding behandles.'
		);
		if (status.startsWith('400')) return feedback(
			'PATCH ble avvist med 400. Minnet, filen og nettleserens liste er uendret.',
			'Meldingen ble funnet, men den nye teksten var tom etter trim eller hadde feil datatype.',
			'Skriv en vanlig tekst for samme ID. Sammenlign svaret og den lagrede meldingen.'
		);
		if (status.startsWith('500')) return feedback(
			'Backend svarte 500. Endringen i arbeidskopien ble ikke lagret; de tre listene beholdt de gamle dataene.',
			'Lagringen feilet før minnet ble byttet ut. Frontend skulle derfor heller ikke vise endringen som vellykket.',
			'Velg «Filen kan lagres» og prøv samme endring. Stopp etter backend-svaret og undersøk hvorfor frontend fortsatt trenger GET.'
		);
		if (status.startsWith('200')) return feedback(
			request.method === 'DELETE'
				? `DELETE ${request.path} ga 200. Bare valgt ID ble fjernet. Nettleserens liste ble hentet på nytt.`
				: `PATCH ${request.path} ga 200. Teksten for valgt ID ble lagret, og nettleserens liste ble hentet på nytt.`,
			request.method === 'DELETE'
				? 'filter utelot valgt ID. Filen og minnet ble oppdatert før en ny GET oppdaterte frontend.'
				: 'map behandlet meldingen med riktig ID og beholdt ID, avsender og tidspunkt. En ny GET oppdaterte frontend.',
			'Gå tilbake til steget der backend svarer, før siste GET. Sammenlign serverens liste med nettleserens liste.'
		);
	}

	if (number === 8) {
		if (status.startsWith('400')) {
			const control = record(data.Kontroll);
			const invalidName = typeof control.brukernavn !== 'string' || !/^[a-z0-9_]{3,20}$/.test(control.brukernavn);
			return feedback(
				'Registreringen ble avvist med 400. Ingen ny bruker eller session ble opprettet.',
				invalidName ? 'Det normaliserte brukernavnet oppfylte ikke kravet om 3–20 tegn med a–z, tall eller understrek.'
					: typeof control.passordlengde === 'number' && control.passordlengde < 12
						? 'Eksempelpassordet var kortere enn 12 tegn. Kontrollen skjedde før hashing og lagring.'
						: 'Eksempelpassordet var over 72 UTF-8-byte. Antall tegn og antall byte kan være forskjellig.',
				'Rett verdien som ble avvist og kjør registreringen på nytt. Bruk bare eksempelpassord, og se om brukeren blir lagret uten at en session opprettes.'
			);
		}
		if (status.startsWith('409')) return feedback(
			'Backend svarte 409. Ingen ny bruker eller session ble opprettet.',
			'Det normaliserte brukernavnet var allerede opptatt i dette forsøket.',
			'Sammenlign med «Registrer en ny bruker». Forklar hvorfor samme navn med stor forbokstav ikke bør bli en ny konto.'
		);
		if (status.startsWith('201')) return feedback(
			'Backend svarte 201 og lagret brukeren med en passordhash. Brukeren er fortsatt ikke innlogget.',
			'Registrering opprettet en bruker i filen. Ruten opprettet ingen session eller session-cookie.',
			'Velg «Logg inn med riktig passord». Sammenlign brukerfil, sessionlager og cookie før og etter.'
		);
		if (data['Simulert passordkontroll'] === 'Avvist') return feedback(
			'Innloggingen ga 401. Ingen ny session eller cookie ble opprettet.',
			'Den simulerte passordkontrollen avviste innloggingen. En registrert bruker er ikke nok uten riktig passord.',
			'Velg «Logg inn med riktig passord». Finn hvor sessionen opprettes etter kontrollen.'
		);
		if (data['Simulert passordkontroll'] === 'Godkjent') return feedback(
			'Innloggingen opprettet en session og en cookie. Den neste GET /meg ga 200 og brukerens offentlige felt.',
			'Passordet ble godkjent i modellen. Serveren lagret brukerId i en ny session, og nettleseren brukte cookien ved neste request.',
			'Velg «Spør /meg uten cookie». Kan serveren koble requesten til brukeren når sessionen finnes, men cookien ikke sendes?'
		);
		if (status.startsWith('401')) {
			const hasSession = Object.keys(record(data.Sessionlager)).length > 0;
			const hasCookie = data['Nettleserens cookie'] !== null;
			return feedback(
				'GET /meg ga 401. Brukerfilen finnes fortsatt, men denne requesten ble ikke gjenkjent som innlogget.',
				hasSession ? 'Sessionen og cookien fantes, men cookien ble ikke sendt i requesten mellom ulike origins.'
					: hasCookie ? 'Omstarten tømte sessionlageret. Den gamle cookien peker ikke lenger til en innlogget bruker.'
						: 'Utloggingen fjernet sessionen og cookien. Brukeren i filen ble ikke slettet.',
				hasSession ? 'Sammenlign med «Spør /meg med cookie». Undersøk credentials-valget og cookie i requesten.'
					: 'Sammenlign med «Logg inn med riktig passord». Hva må opprettes på nytt, og hva ligger allerede i brukerfilen?'
			);
		}
		if (status.startsWith('200')) return feedback(
			'GET /meg ga 200 og brukerens offentlige felt. Brukerfilen ble ikke endret.',
			'Cookien fulgte requesten, og serveren fant brukerId i den tilhørende sessionen.',
			'Velg «Omstart: hva overlever?». Undersøk hvorfor samme cookie ikke er nok etterpå.'
		);
	}

	if (number === 9) {
		const user = record(data['req.bruker']);
		if (status.startsWith('401')) return feedback(
			'Backend svarte 401. Meldingslisten og filen er uendret.',
			'Requesten kom fra en gjest. Innloggingskontrollen stoppet den før oppslag, eiersjekk og lagring.',
			'Behold metoden og velg en innlogget bruker. Undersøk om innlogging alene gir lov til handlingen.'
		);
		if (status.startsWith('404')) return feedback(
			'Backend svarte 404. Ingen melding ble endret eller slettet.',
			'Brukeren var innlogget, men ID-en fantes ikke. Det var derfor ingen melding å sjekke eierskapet til.',
			'Velg en eksisterende melding og prøv med samme bruker. Finn forskjellen mellom ukjent ID og feil eier.'
		);
		if (status.startsWith('403')) {
			const message = record(data['Funnet melding']);
			return feedback(
				`Backend svarte 403. Meldingen ${message.id} finnes fortsatt og er uendret.`,
				`${user.brukernavn} var innlogget, men meldingen tilhørte ${message.avsender}. Serveren sammenlignet lagret eier med brukeren fra sessionen.`,
				`Prøv samme handling som ${message.avsender}. Behold ID-en og sammenlign svaret og dataene.`
			);
		}
		if (status.startsWith('400')) return feedback(
			'Backend svarte 400. Tilgangen var i orden, men ingen data ble endret.',
			'Teksten var ugyldig. Innlogging og riktig eierskap erstatter ikke kontroll av datatype, tom tekst og lengde.',
			'Behold bruker og metode, skriv en vanlig melding og prøv igjen. Finn kontrollen som nå slipper requesten videre.'
		);
		if (status.startsWith('201')) return feedback(
			`Backend svarte 201. Den nye meldingen ble lagret med ${user.brukernavn} som avsender og eierId fra sessionen.`,
			'Backend brukte den verifiserte brukeren. Eventuelle avsender- og eierfelt i request-body bestemte ikke identiteten.',
			'Velg Ada og POST, og sammenlign med og uten falsk eier i body. Undersøk hvem som eier den nye meldingen.'
		);
		if (status.startsWith('200')) {
			if (!('req.bruker' in data)) return feedback(
				'GET ga 200 og meldingslisten. Ingen data ble endret.',
				'Denne leseruten er offentlig. Både gjester og innloggede brukere får lese i denne øvingen.',
				'Velg gjest og POST. Sammenlign hvorfor lesing er tillatt, mens sending krever innlogging.'
			);
			return feedback(
				count(data['Minne · meldinger']) < count(before['Minne · meldinger'])
					? 'Backend svarte 200. Meldingen med valgt ID ble slettet og den nye listen lagret.'
					: 'Backend svarte 200. Teksten for valgt ID ble lagret; eier, avsender og ID ble beholdt.',
				'Brukeren fra sessionen eide meldingen. Kontrollen skjedde før endringen og lagringen.',
				'Prøv samme handling med den andre brukeren. Kontroller at et avvist forsøk lar minnet og filen være uendret.'
			);
		}
	}

	if (number === 10) {
		if ('Backup utenfor public' in data) return feedback(
			'Gjenopprettingen hentet tidspunkt A. Melding B, som kom etter backupen, er ikke med. Sessionlageret er tomt.',
			'Backupen var et øyeblikksbilde av filene. Nyere data og sessions i prosessens minne fulgte ikke med.',
			'Gå tilbake til steget etter backupen. Finn hvilke data som mangler i kopien, og forklar hva du må sikre før en ekte gjenoppretting.'
		);
		if ('Request fra elevens PC' in data) return feedback(
			'Requesten gikk først til elevens egen PC. Etter bytte til relativ API-adresse gikk den til VM-en og ga 200 i modellen.',
			'localhost viser til maskinen som kjører nettleseren. En relativ adresse bruker nettsidens origin når frontend og API leveres sammen.',
			'Sammenlign de to fetch-adressene. Forklar hvilket vertsnavn og hvilken port nettleseren bruker i hvert tilfelle.'
		);
		if (data['Node-prosess'] === 'Kjører igjen') return feedback(
			'Tjenesten kjører igjen. Meldinger og brukere er bevart på disk; sessionlageret er tomt, så brukeren må logge inn på nytt.',
			'systemd startet Node-prosessen. Minnebaserte sessions forsvant da prosessen stoppet. Ved VM-omstart forutsetter modellen at tjenesten er enabled.',
			'Sammenlign prosessrestart og VM-omstart. Hvem starter tjenesten, og hva bør du kontrollere med et API-kall etterpå?'
		);
		if (data['Nettleseren ser'] === 'Versjon 1') return feedback(
			'Nettleseren fikk 200, men viser fortsatt versjon 1. Endringen finnes bare i kildekoden.',
			'De publiserte filene var ikke bygget og kopiert på nytt. Et vellykket HTTP-svar betyr ikke at riktig versjon er publisert.',
			'Velg «Bygg og publiser ny frontend» med samme frontendtype. Finn når den nye versjonen blir synlig for nettleseren.'
		);
		if (data['Nettleseren ser'] === 'Versjon 2') return feedback(
			'Nettleseren viser versjon 2. Det nye frontendbygget er kopiert til serverens public-mappe.',
			'Kildekoden ble bygget før de offentlige filene ble publisert. Frontend og API leveres nå fra samme origin i modellen.',
			'Sammenlign med «Endre kildekode uten å bygge». Hvilket trinn mangler når nettleseren fortsatt viser den gamle versjonen?'
		);
	}
	return null;
}
