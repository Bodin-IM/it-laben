import { teachingPlans } from '../src/lib/teaching.js';
import { requireTeacher } from './learning-access.js';

/** Teacher preparation and facilitation notes stay out of the student bundle. */
export const teachingGuides = [
	{
		planId: 'meldingens-reise',
		preparation: [
			'Åpne første leksjon og nullstill forsøket før gjennomgangen.',
			'La elevene forutsi svaret før du trykker på en handling.'
		],
		steps: [
			{
				activityId: 'frontend-backend',
				minutes: 20,
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
			{
				activityId: 'chatrom',
				minutes: 10,
				focus: 'Samme server, forskjellige rom.',
				questions: [
					'Hvilket rom ber nettleseren om?',
					'Hvorfor endres ikke den viste listen bare fordi serveren har fått en ny melding?'
				],
				notes: [
					'Endre rommet og sammenlign request og svar.',
					'Bruk ett eksempel om gangen; spar innlogging og sletting til neste opplegg.'
				]
			}
		],
		wrapUp: [
			'Bruk fem minutter på at elevene forklarer POST og GET til sidemannen.',
			'La elevene løse To nettlesere, én chat i elevvisningen.'
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
				minutes: 15,
				focus: 'Følg en ID mellom nettleseren og serveren.',
				questions: ['Hva inneholder cookien?', 'Hvor finner serveren brukerdataene?'],
				notes: [
					'Vis innlogging og deretter GET /meg. Følg samme ID på begge sider.',
					'Prøv manglende cookie og utløpt session før du viser implementasjonsutdragene.'
				]
			},
			{
				activityId: 'chatrom',
				minutes: 10,
				focus: 'Hvem bestemmer avsenderen?',
				questions: ['Kan klienten bestemme hvem som sender?', 'Hvor bør avsenderen hentes fra?'],
				notes: [
					'Send et forsøk med endret avsender i klientdataene.',
					'Pek på serverens sessionoppslag og sammenlign med den lagrede meldingen.'
				]
			},
			{
				activityId: 'oving-9',
				minutes: 15,
				focus: 'Innlogging gir ikke eierskap til alt.',
				questions: [
					'Hva er forskjellen på 401 og 403?',
					'Hvorfor sjekkes eier etter at meldingen er funnet?'
				],
				notes: [
					'Sammenlign et eget og et fremmed objekt.',
					'Vent med å åpne oppgaveforklaringene til elevene har begrunnet svaret.'
				]
			}
		],
		wrapUp: [
			'Be elevene beskrive cookie, session og eierskap med egne ord.',
			'Fortsett med Øving 8 eller avsenderoppdraget i Redd chatten.'
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
			'Elevene prøver flere situasjoner i Øving 5 og 6 på egen hånd.'
		]
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
