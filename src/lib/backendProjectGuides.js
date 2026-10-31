/** Public project support, shared with the lesson and the partner's existing context.
 * Filenames are examples: the learner keeps the structure of their own chat project.
 * @typedef {{where:string,prerequisite:string,firstChange:string,steps:string[],tests:string[],hint:string}} ProjectGuide
 */
/** @type {Record<number,ProjectGuide>} */
export const backendProjectGuides = {
	5: {
		where: 'Backend: lagring.js og GET/POST /meldinger i server.js. Datafil: data/meldinger.json utenfor public og static.',
		prerequisite: 'POST og GET må virke med en liste i minnet. Bruk lærerens lagringsoppsett med en eksisterende datamappe og én backendprosess.',
		firstChange: 'Finn linjen som legger meldingen direkte i listen. Lag i stedet en ny liste som inneholder de gamle meldingene og den nye, uten å endre den gamle listen ennå.',
		steps: [
			'Koble lagreListe til POST: skriv den nye listen til en midlertidig fil og erstatt datafilen som i øvingen. Bytt listen i minnet og send 201 først etter vellykket lagring.',
			'La en skrivefeil gi et feilsvar og beholde den gamle listen. Ved oppstart leses datafilen før rutene tar imot requests. Bare manglende fil skal gi en tom liste.',
			'Bruk den eksisterende GET-ruten til å hente den innleste listen. La frontend sjekke svar.ok før den viser sendingen som vellykket.'
		],
		tests: [
			'Send en gjenkjennelig testmelding, stopp backend og start på nytt. GET skal fortsatt inneholde meldingen.',
			'I en testkopi: la lagringsfunksjonen kaste en feil før filskriving. Send en ny melding; du skal få et feilsvar, og minnet og datafilen skal være uendret. Fjern testfeilen og prøv igjen.'
		],
		hint: 'Hvis en avvist melding likevel dukker opp ved neste GET, se etter push eller tildeling til meldinger før lagringen er ferdig. Ta vare på fungerende kode og data før du prøver feil.'
	},
	6: {
		where: 'Backend: PATCH og DELETE /meldinger/:id i server.js. Frontend: redigerings-/sletteknapp og hentMeldinger i src/routes/+page.svelte.',
		prerequisite: 'Du har GET/POST og fungerende fillagring. Hver melding trenger en stabil, unik ID opprettet på serveren.',
		firstChange: 'Lag PATCH /meldinger/:id og slå opp meldingen med req.params.id. Begynn med at en ukjent ID gir 404 uten å endre data.',
		steps: [
			'Kontroller teksten for en eksisterende ID. Bruk map til å lage en ny liste med bare denne teksten endret; behold ID, avsender og tidspunkt.',
			'Lagre listen før du tar den i bruk og svarer. Kall PATCH fra frontend med valgt meldings-ID og hent listen på nytt etter et vellykket svar.',
			'Lag deretter DELETE for samme adresseform. Bruk filter på ID, lagre og hent på nytt. DELETE trenger ingen ny tekst.'
		],
		tests: [
			'Lag to meldinger med samme tekst. Endre den ene via ID. Bare den valgte meldingen skal endres, og frontend skal vise resultatet.',
			'Slett én melding, og send DELETE med samme ID igjen. Første kall skal lykkes, neste skal gi 404. Andre meldinger skal bestå.'
		],
		hint: 'Hvis feil melding endres, sammenlign ID-en fra GET med ID-en i request-adressen. Hvis bare visningen er gammel, sjekk om frontend gjør en ny GET. Ruter med innlogging og eierskap legges til i øving 9.'
	},
	8: {
		where: 'Backend: session-oppsett og /registrer, /logginn, /meg, /loggut i server.js. Frontend: innloggingsstatus og fetch-kall i src/routes/+page.svelte.',
		prerequisite: 'Bruk lærerens oppsett for bcryptjs, express-session, miljøvariabler og CORS. JSON- og session-middleware må ligge før rutene. Bruk bare testkontoer.',
		firstChange: 'Lag GET /meg som slår opp brukeren via req.session.brukerId. Uten innlogging skal den gi 401. La frontend vise «Ikke logget inn» for dette svaret.',
		steps: [
			'Lag registrering: valider input, sjekk om navnet er opptatt, hash passordet og lagre brukeren. Ikke opprett en session eller send passordhashen til frontend.',
			'Koble innlogging til passordkontroll og en ny session. Lagre brukerId før du svarer. Hent /meg fra frontend etterpå; bruk credentials: include når frontend og backend har ulike origins.',
			'Koble utlogging til å fjerne sessionen og riktig cookie. Hent /meg på nytt, og vis at brukeren er logget ut.'
		],
		tests: [
			'Registrer en testbruker. /meg skal fortsatt gi 401. Logg deretter inn med riktig passord; /meg skal gi 200 med id og brukernavn, uten passordhash.',
			'Logg ut og spør /meg igjen. Prøv også feil passord. Ingen av forsøkene skal gi tilgang som innlogget bruker.',
			'Logg inn, start backend på nytt og spør /meg. Med sessionlager i minnet må du logge inn igjen; brukeren skal fortsatt finnes i filen.'
		],
		hint: 'Hvis innlogging lykkes, men /meg gir 401, sjekk cookie i Network, credentials og samme vertsnavn. Cookie som finnes i nettleseren er ikke nok; den må sendes og peke til en gyldig session på serveren.'
	},
	9: {
		where: 'Backend: krevInnlogging og POST/PATCH/DELETE /meldinger i server.js. GET /meldinger kan fortsatt være offentlig i denne øvingen.',
		prerequisite: 'Innlogging og /meg virker. Nye meldinger har en eier-ID fra serveren. Bruk eierId eller avsenderId konsekvent i egen kode.',
		firstChange: 'Legg krevInnlogging foran POST /meldinger. Slå opp brukeren gjennom sessionen og stopp med 401 hvis den mangler. Gjør den verifiserte brukeren tilgjengelig for ruten som req.bruker.',
		steps: [
			'La POST velge avsender og eier-ID fra den verifiserte brukeren. Ikke stol på disse feltene i request-body.',
			'I PATCH og DELETE: krev innlogging, finn ID-en og gi 404 hvis den mangler. Sammenlign deretter lagret eier-ID med den innloggede brukeren; gi 403 hvis de er ulike.',
			'Valider tekst ved POST/PATCH før du lagrer. La frontend vise feilsvaret og beholde dataene når requesten blir avvist.'
		],
		tests: [
			'Bruk separate nettleserprofiler for eier og en annen testbruker, og en utlogget profil som gjest. Send også direkte requests til backend: gjest skal få 401 ved skriving, annen bruker 403 på en eksisterende fremmed melding.',
			'Gjenta endring og sletting som eieren. Send også falsk eier eller avsender i body; det skal ikke gi tilgang til andres meldinger eller endre hvem en melding tilhører.'
		],
		hint: 'En skjult knapp beskytter ikke ruten. Sammenlign bruker-ID fra sessionen med meldingen på serveren. Gamle meldinger uten eier må håndteres i testdataene; ikke utled eierskap fra et fritt avsendernavn.'
	},
	10: {
		where: 'Frontend: src/routes/+page.svelte og prosjektets byggkommando. Backend: server.js, public-mappen og tjenesteoppsettet på lærerens avtalte testmaskin.',
		prerequisite: 'Chatten virker lokalt. Avtal maskin, adresse, porter og frontendtype med læreren. Ta vare på prosjekt og data før publisering eller omstart.',
		firstChange: 'Legg en liten versjonstekst i frontend. Bygg med prosjektets kommando og finn den faktiske byggmappen: normalt build for konfigurert SvelteKit med adapter-static, dist for vanlig Vite.',
		steps: [
			'Kopier bare byggfilene til backendens public-mappe i testmiljøet. Hold data og .env utenfor. I øvingens oppsett leverer Express både frontend og API; bruk da relative API-adresser.',
			'Bruk lærerens tjenesteoppsett med riktig Node-sti, arbeidsmappe, miljø og filrettigheter. Kontroller logg og et API-kall etter oppstart.',
			'Ta backup og prøv gjenoppretting i en separat testkopi. Ta vare på dagens data før du erstatter noe. Skriv kommandoer, adresse og testresultater i README.'
		],
		tests: [
			'Åpne fra en annen PC. Kontroller versjonsteksten og send/hent en melding. Undersøk i Network at requesten går til riktig maskin.',
			'Start tjenesten og deretter test-VM-en på nytt etter avtale. Kontroller at tjenesten starter, dataene består og minnebaserte sessions krever ny innlogging.',
			'Gjenopprett testkopien fra en eldre backup og bruk GET til å undersøke innholdet. Forklar hvilke nyere meldinger som ikke finnes i kopien.'
		],
		hint: 'Hvis gammel tekst vises, sammenlign kildekode, bygg og publiserte filer. Hvis siden åpnes, men API-kall feiler, kontroller request-adressen; localhost betyr maskinen som gjør kallet.'
	}
};
