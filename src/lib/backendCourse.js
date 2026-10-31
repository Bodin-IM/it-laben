import { moduler, moduleContents } from './moduler.js';
import { moduleLink } from './moduleNavigation.js';
import { validationJourney } from './backendValidation.js';

/** Navigation follows the module catalogue, not exercise numbers or XP.
 * @param {string} activityId
 * @param {boolean} [inValidation]
 * @param {boolean} [atProject]
 */
export function backendContinuation(activityId, inValidation = false, atProject = false) {
	const module = moduler.find((item) => item.id === 'backend');
	if (!module) return null;
	const contents = moduleContents(module);
	const steps = contents.filter((step) => step.kind !== 'undervisning' && !step.optional);
	const index = steps.findIndex((step) => step.id === activityId);
	if (index < 0) return null;
	const current = steps[index];
	const next = steps[index + 1];
	const previous = steps[index - 1];
	if (activityId === 'redd-chatten' && inValidation) return {
		backHref: '/moduler/backend/#del-8',
		previous: { title: 'Øving 7: undersøk valideringen', href: moduleLink(validationJourney[0].href, 'backend') },
		next: { title: 'Valider et visningsnavn i egen kode', href: moduleLink(validationJourney[2].href, 'backend') }
	};
	return {
		backHref: `/moduler/backend/#del-${contents.indexOf(current) + 1}`,
		previous: previous ? { title: previous.title, href: moduleLink(previous.href, 'backend') } : null,
		next: activityId === 'oving-7' && !atProject
			? { title: 'Reparer tekstkontrollen i Redd chatten', href: moduleLink(validationJourney[1].href, 'backend') }
			: next ? { title: next.title, href: moduleLink(next.href, 'backend') } : null
	};
}

/** Descriptions of work, not completion requirements. @type {Record<string,string>} */
export const backendSections = {
	'Meldingens reise': 'Start med POST og GET. Undersøk dataflyten her, og få deretter to nettlesere til å sende og hente i egen chat.',
	'Data og lagring': 'Bygg videre på samme chat: bevar meldinger ved omstart, endre med ID og avvis ugyldige data før lagring.',
	'Innlogging og tilgang': 'Skill mellom hvem brukeren er og hva hen får gjøre. Prøv med eier, en annen bruker og en gjest.',
	'Publisering og drift': 'Bruk lærerens avtalte testmiljø. Undersøk bygg og omstart her før du publiserer og tester egen app.',
	'Repetisjon og ekstra utfordring': 'Bruk oppsummeringen til å finne hva du trenger å repetere. Avslutt med å vise og forklare egen kode. Nattevakten er valgfri.'
};
