// Public teaching content shared by the module, the exercise and the repair activity.
export const validationJourney = [
	{ id: 'undersok', title: 'Undersøk', description: 'Følg gyldige og ugyldige data i øving 7.', href: '/oving-7/?forlop=validering#forsok' },
	{ id: 'reparer', title: 'Reparer', description: 'Rett tekstkontrollen i Redd chatten.', href: '/spill/redd-chatten/?oppdrag=tekst&forlop=validering' },
	{ id: 'bruk-selv', title: 'Bruk selv', description: 'Gi forståelige tilbakemeldinger i din egen chat.', href: '/oving-7/?forlop=validering#eget-prosjekt' }
];

export const validationTransfer = {
	instruction: 'Bygg videre på chatten fra del 6. Bruk samme tekstkontroll i POST og PATCH, samle uventede feil i én feilmiddleware og vis feil og bekreftelser i frontend.',
	check: 'Prøv både sending og redigering. Kontroller HTTP-svaret, teksten på siden og at avvist input ikke endrer minnet eller JSON-filen.'
};

export const validationExamples = [
	{ label: 'Samme validering i POST og PATCH', href: '/moduler/backend/?visning=eksempler&eksempel=valider-melding' },
	{ label: 'Felles feilbehandling med next', href: '/moduler/backend/?visning=eksempler&eksempel=felles-feilbehandling' },
	{ label: 'Vis feil og bekreftelser i frontend', href: '/moduler/backend/?visning=eksempler&eksempel=vis-feilmelding&fil=frontend' }
];

export const validationFollowUp = {
	activityId: 'redd-chatten', objectiveId: 'tekst',
	href: validationJourney[1].href,
	instruction: 'Reparer tekstkontrollen, og test både vanlig tekst og bare mellomrom før du bruker prinsippet i egen kode.'
};
