// Shared public tutorial content and a deterministic, local practice example.
export const guideSteps = [
	{
		id: 'finn',
		shortTitle: 'Finn',
		speech:
			'Hei! Jeg er labpartneren din. Først skal vi finne veien fra et fag til en oppgave. Følg kartet under.',
		title: 'Finn dagens oppgave',
		text: 'Velg fag i hovedmenyen. Under Utvikling finner du Backend og Databaser når læreren har åpnet dem. Åpne modulen og delen læreren har valgt. Bruk «Tilbake til …» over oppgaven for å finne igjen modulen.'
	},
	{
		id: 'les',
		shortTitle: 'Les',
		speech:
			'Før vi prøver noe, vil jeg vite hva vi forventer. Les målet under og gjør deg en tanke om hva testen vil vise.',
		title: 'Les målet og forutsi',
		text: 'Se hva som skal fungere, og hva oppgaven ber deg undersøke. Før du trykker Kjør eller Test: si hva du forventer at skjer med dataene. Du trenger ikke vite riktig svar på forhånd.'
	},
	{
		id: 'prov',
		shortTitle: 'Prøv',
		speech:
			'Nå er det din tur. Kjør testen, les hva som skjedde og endre én ting. Du kan prøve så mange ganger du vil.',
		title: 'Prøv, undersøk og endre',
		text: 'Kjør et forsøk og les resultatet. Følg koden steg for steg der det er mulig. Endre én ting, og kjør på nytt. Et tidligere testresultat gjelder ikke automatisk for den nye koden.'
	},
	{
		id: 'hjelp',
		shortTitle: 'Hjelp',
		speech:
			'Du trenger ikke stå fast alene. Jeg har fast sidehjelp, og KI når tjenesten er tilgjengelig. Prøv knappen under og finn tannhjulet mitt.',
		title: 'Bruk hjelp når du trenger den',
		text: 'Åpne oppgavens hint eller forklaringen ved koden. Labpartnerens Sidehjelp virker uten KI. KI krever innlogging og forbindelse til skolens tjeneste. Se «Dette følger med spørsmålet» før du spør. Tannhjulet åpner figur, bakgrunn og animasjoner.'
	},
	{
		id: 'videre',
		shortTitle: 'Videre',
		speech:
			'Nå har du fått et kart over laben. Finn oppgaven læreren har valgt. Jeg er tilgjengelig når du trenger et hint, og omvisningen kan du starte igjen.',
		title: 'Forklar og gå videre',
		text: 'Forklar hva du endret og hvorfor det virket. Prøv også et annet tilfelle. I Min lab ser du lagret fremgang når du er innlogget. Gjennomgått, bestått test og XP betyr ulike ting; de er ikke en karakter eller bevis på forståelse.'
	}
];
export const tutorialSamples = [
	{ id: 'spaces', label: 'Bare mellomrom', text: '   ' },
	{ id: 'message', label: 'En vanlig melding', text: 'Hei!' }
];
/** @param {{sample:string,trim:boolean}} selection */
export function tutorialResult(selection) {
	const sample = tutorialSamples.find((item) => item.id === selection.sample);
	if (!sample || typeof selection.trim !== 'boolean') throw new Error('Ukjent tutorialvalg.');
	const checked = selection.trim ? sample.text.trim() : sample.text;
	const saved = checked.length > 0;
	return {
		input: JSON.stringify(sample.text),
		checked: JSON.stringify(checked),
		saved,
		status: saved ? 201 : 400,
		title: saved ? 'Meldingen ble lagret' : 'Meldingen ble avvist',
		explanation:
			selection.sample === 'message'
				? '«Hei!» har innhold både før og etter trim(). En vanlig melding skal kunne lagres.'
				: selection.trim
					? 'trim() fjernet mellomrommene. Teksten som ble kontrollert er tom, så lagringen ble ikke kjørt.'
					: 'Tre mellomrom er fortsatt tre tegn. Kontrollen slapp meldingen gjennom selv om den ser tom ut.',
		next:
			selection.sample === 'message'
				? 'Prøv også bare mellomrom. En test av en vanlig melding forteller ikke om tomme meldinger blir stoppet.'
				: selection.trim
					? 'Prøv en vanlig melding med samme kontroll. Den skal fortsatt bli lagret.'
					: 'Slå på «Fjern mellomrom først», og kjør samme test på nytt.'
	};
}
