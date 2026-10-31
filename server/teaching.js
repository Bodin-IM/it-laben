import { teachingPlans } from '../src/lib/teaching.js';
import { requireTeacher } from './learning-access.js';

/** Teacher preparation and facilitation notes stay out of the student bundle. */
export const teachingGuides = [
	{
		planId: 'meldingens-reise',
		preparation: [
			'Åpne første leksjon og nullstill forsøket før gjennomgangen.',
			'La elevene forutsi svaret før du trykker på en handling. Avtal hvor frontend, backend og øvingsark finnes.',
			'Bruk samme chatprosjekt videre. Første egen test: GET /meldinger skal gi en JSON-liste.'
		],
		steps: [
			{
				activityId: 'frontend-backend',
				minutes: 25,
				focus: 'Send først, hent etterpå.',
				questions: [
					'Hva ligger på serveren etter POST?',
					'Hvorfor er listen i nettleseren fortsatt tom?'
				],
				notes: [
					'Kjør POST uten et etterfølgende GET. Pek på de to listene før du fortsetter.',
					'Bytt mellom frontend- og backendkode ved samme steg. La klassen forklare req.body og JSON-svaret.'
				]
			},
		],
		wrapUp: [
			'Bruk fem minutter på at elevene forklarer POST og GET til sidemannen.',
			'La elevene løse To nettlesere, én chat. Bygg deretter POST og GET i egen app; send fra én nettleser og hent fra en annen.',
			'Avslutt med å vise request, svar og de to listene. Rom, innlogging og sletting tas senere i modulen.'
		]
	},
	{
		planId: 'hvem-er-logget-inn',
		preparation: [
			'Start med nullstilte eksempeldata.',
			'Skill mellom den simulerte innloggingen i leksjonen og elevenes faktiske Min lab-profiler.'
		],
		steps: [
			{
				activityId: 'sessions',
				minutes: 10,
				focus: 'Følg en ID mellom nettleseren og serveren.',
				questions: ['Hva inneholder cookien?', 'Hvor finner serveren brukerdataene?'],
				notes: [
					'Vis innlogging og deretter GET /meg. Følg samme ID på begge sider.',
					'Prøv manglende cookie og utløpt session før du viser implementasjonsutdragene.'
				]
			},
			{
				activityId: 'oving-8',
				minutes: 10,
				focus: 'En brukerfil er ikke en innlogget session.',
				questions: ['Hva oppretter registrering?', 'Hva finnes etter omstart av backend?'],
				notes: ['Sammenlign registrering og innlogging. Bruk bare eksempelpassord.', 'Øving 8 bruker brukerId i sessionen; innføringen viser et brukerobjekt. Begge henter identiteten fra serverens session, aldri fra et fritt avsenderfelt.']
			},
			{
				activityId: 'oving-9',
				minutes: 10,
				focus: 'Innlogging gir ikke eierskap til alt.',
				questions: [
					'Hva er forskjellen på 401 og 403?',
					'Hvorfor sjekkes eier etter at meldingen er funnet?'
				],
				notes: [
					'Sammenlign et eget og et fremmed objekt.',
					'Vent med å åpne oppgaveforklaringene til elevene har begrunnet svaret.'
				]
			},
			{
				activityId: 'chatrom',
				minutes: 10,
				focus: 'Bruk kontrollene i et chatrom.',
				questions: ['Kan klienten bestemme hvem som sender?', 'Hvilke meldinger kommer tilbake ved rombytte?'],
				notes: [
					'Send et forsøk med endret avsender i klientdataene.',
					'Sammenlign sessionoppslaget med den lagrede meldingen. Prøv sletting som en annen bruker.'
				]
			}
		],
		wrapUp: [
			'Be elevene beskrive cookie, session og eierskap med egne ord.',
			'La elevene teste egen app som eier, annen bruker og gjest. To vanlige faner deler innlogging; bruk separate profiler eller privat vindu.',
			'Bruk avsender og sletting i Redd chatten, og deretter Meldingsdetektiven. Be eleven velge og begrunne ett feiltilfelle i egen kode.'
		]
	},
	{
		planId: 'data-som-overlever',
		preparation: [
			'Velg ett startdatasett og la klassen tegne minne og fil som to separate bokser.'
		],
		steps: [
			{
				activityId: 'fillagring',
				minutes: 10,
				focus: 'Hva finnes etter en omstart?',
				questions: ['Hvilke data ligger bare i minnet?', 'Hva leses når serveren starter igjen?'],
				notes: [
					'Kjør først med lagring av, deretter med lagring på.',
					'Bruk visningen av minne og fil til å forklare forskjellen.'
				]
			},
			{
				activityId: 'oving-5',
				minutes: 20,
				focus: 'Lagre før minnet oppdateres.',
				questions: [
					'Hva bør skje hvis skrivingen til fil feiler?',
					'Hvorfor brukes en midlertidig fil?'
				],
				notes: [
					'Velg skrivefeil som situasjon og stopp før svaret vises.',
					'La elevene følge neste liste, filskriving og oppdatering av minne som tre forskjellige steg.'
				]
			},
			{
				activityId: 'oving-6',
				minutes: 5,
				focus: 'En stabil ID gjennom endring og sletting.',
				questions: [
					'Hvorfor søker vi etter ID?',
					'Hva må nettleseren gjøre for å vise det nye resultatet?'
				],
				notes: ['Knytt PATCH og DELETE til det tidligere POST-/GET-opplegget.']
			}
		],
		wrapUp: [
			'Bruk fem minutter på en felles forklaring av en trygg lagringsrekkefølge.',
			'Elevene bruker lagring og CRUD i egen chat. Prøv omstart og to meldinger med samme tekst; bare riktig ID skal endres.',
			'Innføringen endrer minnet før skriving og forutsetter fungerende disk. Øving 5 forbedrer dette: lagre en ny liste før den tas i bruk. Gjør forskjellen eksplisitt.',
			'Fortsett med læreropplegget Validering før dere går videre til innlogging.'
		]
	},
	{
		planId: 'backend-validering',
		preparation: ['Åpne øving 7 med oppgaven Mellomrom. Ha en vanlig melding og en streng med bare mellomrom klare.', 'Elevene trenger fungerende POST/GET og kjennskap til betingelser. Bruk README eller testnotater i eget prosjekt til å ta vare på resultatene.'],
		steps: [{
			activityId: 'oving-7', minutes: 20,
			focus: 'Se både på HTTP-svaret og på om data endres.',
			questions: ['Hva blir lengden før og etter trim?', 'Hvorfor er HTTP 400 ikke nok hvis data allerede er lagret?', 'Hvilke to tester undersøker en lengdegrense?'],
			notes: ['La elevene forutsi før kjøringen. Sammenlign normal tekst, mellomrom, feil datatype og grensen 500/501.', 'Skill feil i JSON-parsing fra feil verdi og fra manglende nettverkskontakt. fetch avviser ikke automatisk ved HTTP 400.']
		}],
		wrapUp: ['Reparer tekstoppdraget i Redd chatten; de andre oppdragene kommer etter innlogging.', 'La elevene lage visningsnavn med 1–30 tegn etter trim i egen app, velge tester og forklare kontrollrekkefølgen.', 'I en senere time: bruk samme prinsipp på et annet felt og en annen grense. Noter hva eleven klarer med og uten hjelp.']
	},
	{
		planId: 'backend-publisering',
		preparation: ['Avtal testmaskin, adresse, porter og hvordan elevene starter tjenesten. Bruk testdata og ta backup av prosjektet.', 'Bestem frontendtype. SvelteKit med adapter-static bygger normalt til build; et vanlig Vite-prosjekt bruker dist. Data og hemmeligheter skal ligge utenfor public.'],
		steps: [{
			activityId: 'oving-10', minutes: 20,
			focus: 'Hva kjører, og hvilke filer blir faktisk sendt til nettleseren?',
			questions: ['Hvorfor vises ikke en endring i kildekoden med en gang?', 'Hva betyr localhost på medelevens PC?', 'Hva skjer med filer og sessions når Node starter på nytt?'],
			notes: ['Sammenlign kildeendring uten bygg, full publisering og besøk fra en annen PC.', 'Vis at enabled systemd-tjeneste starter etter VM-omstart. Standard sessionlager i minnet bevares ikke.', 'Gjenoppretting gjøres i en egen testkopi. Ikke overskriv eneste kopi av elevenes data.']
		}],
		wrapUp: ['La elevene publisere egen app, teste fra en annen PC og kontrollere omstart. Dokumenter kommandoer, adresse og hva som ble testet.', 'Avslutt modulen med én rute fra klikk til svar og et nytt feiltilfelle. Oppsummeringen er fri repetisjon; Nattevakten er valgfri.', 'Samle erfaringer i den ordinære undervisningen: hva var uklart, hvilken hjelp ble brukt, og hva fikk eleven til i egen kode?']
	}

];

export function validateTeachingGuides(plans = teachingPlans, guides = teachingGuides) {
	if (
		guides.length !== plans.length ||
		new Set(guides.map((guide) => guide.planId)).size !== guides.length
	)
		throw new Error('Hvert undervisningsopplegg trenger én lærerveiledning.');
	for (const plan of plans) {
		const guide = guides.find((item) => item.planId === plan.id);
		if (
			!guide ||
			guide.steps.length !== plan.lessonIds.length ||
			guide.steps.some(
				(step, index) =>
					step.activityId !== plan.lessonIds[index] ||
					!Number.isInteger(step.minutes) ||
					step.minutes <= 0
			) ||
			guide.steps.reduce((sum, step) => sum + step.minutes, 0) > plan.minutes
		)
			throw new Error(`Ugyldig lærerveiledning: ${plan.id}`);
	}
}
validateTeachingGuides();

export function teachingLibrary(db, userId) {
	requireTeacher(db, userId);
	return { plans: teachingPlans, guides: teachingGuides };
}
