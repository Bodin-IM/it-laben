// Public teaching content shared by the module, the exercise and the repair activity.
export const validationJourney = [
	{ id: 'undersok', title: 'Undersøk', description: 'Følg gyldige og ugyldige data i øving 7.', href: '/oving-7/?forlop=validering#forsok' },
	{ id: 'reparer', title: 'Reparer', description: 'Rett tekstkontrollen i Redd chatten.', href: '/spill/redd-chatten/?oppdrag=tekst&forlop=validering' },
	{ id: 'bruk-selv', title: 'Bruk selv', description: 'Valider et visningsnavn i din egen kode.', href: '/oving-7/?forlop=validering#eget-prosjekt' }
];

export const validationTransfer = {
	instruction: 'Lag servervalidering for et visningsnavn: en streng på 1–30 tegn etter trim. Vis en forståelig feil i frontend.',
	check: 'Velg egne tester for normal tekst, tom tekst, bare mellomrom, feil datatype og begge sider av lengdegrensen. Kontroller både HTTP-svaret og at avviste requests ikke endrer minnet eller JSON-filen.'
};

export const validationFollowUp = {
	activityId: 'redd-chatten', objectiveId: 'tekst',
	href: validationJourney[1].href,
	instruction: 'Reparer tekstkontrollen, og test både vanlig tekst og bare mellomrom før du bruker prinsippet i egen kode.'
};
