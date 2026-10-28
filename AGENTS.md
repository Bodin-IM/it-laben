# Instruksjoner for KI som arbeider med IT-laben

Disse instruksjonene gjelder hele repoet. IT-laben er et undervisningsverktøy for IT-fag i videregående skole. Bruk norsk bokmål i elevtekster og lærerveiledninger.

## Før du utvikler eller endrer innhold og grensesnitt

Ved utvikling eller endring av moduler, aktiviteter, undervisning, leksjoner og elevøvinger for Vg2 informasjonsteknologi: les [læreplangrunnlaget](docs/laereplangrunnlag.md) og [læreplanen ITK02-01 i fulltekst](docs/laereplan/ITK02-01.md) før du planlegger innholdet. Bruk dette sammen med grunnlagene nedenfor. Oppgi aktuelle programfag og konkrete kompetansemål med korrekt ordlyd i aktivitetens veiledning eller arbeidsplan, og beskriv hvilken del av målet eleven faktisk øver. DRS-, BRU- og UTV-referansene er lokale henvisninger, ikke offisielle Udir-koder.

1. Les hele [det pedagogiske grunnlaget](docs/pedagogisk-grunnlag.md) før du planlegger eller endrer læringsinnhold, elevhandlinger, tilbakemeldinger, vurdering, progresjon eller gamification. Følg grunnlaget i arbeidet; det er ikke bare bakgrunnslitteratur.
2. Les hele [grunnlaget for webdesign og brukeropplevelse](docs/webdesign-og-brukeropplevelse.md) før du planlegger eller endrer navigasjon, layout, stiler, komponenter eller interaksjon. Dette gjelder også innlogging og lærer-/administratorvisninger. Følg begge grunnlagene når arbeidet berører både pedagogikk og grensesnitt; designgrunnlaget supplerer det pedagogiske.
3. Les den aktuelle siden eller aktiviteten og relevant dokumentasjon. Undersøk felles komponenter og stiler før du foreslår en ny løsning. [Redd chatten-piloten](docs/redd-chatten-pilot.md) er ett eksempel, ikke en mal som alle aktiviteter skal kopiere.
4. Ved nye aktiviteter eller vesentlige pedagogiske endringer: bruk [aktivitetsmalen](docs/aktivitetsmal.md) til å beskrive mål, forkunnskaper, elevhandling, respons og en ny anvendelse. Legg beskrivelsen i aktivitetens dokumentasjon eller arbeidsplan; avklar den gjennom eksisterende oppgave og kontekst uten et ekstra godkjenningssteg. Bruk bare relevante deler ved små endringer.

## Krav under arbeidet

- La faglig mål styre aktiviteten. Velg format ut fra hva eleven skal forstå eller gjøre; varier mellom å forutsi, undersøke, reparere, sammenligne, forklare og lage.
- Gi eleven faglig informasjon som kan brukes i neste forsøk. Hint og feilforsøk skal ikke gi poengtrekk i nye læringsaktiviteter.
- Skill mellom gjennomført handling, bestått funksjonstest og vurdert forståelse. Klikk, tid, poeng, utfylt fritekst og egenvurdering dokumenterer ikke alene læring.
- Vurder gyldige løsninger etter faglig funksjon når det er mulig. Ikke godkjenn fritekst faglig bare fordi feltet er fylt ut.
- Legg inn eller beskriv en beslektet oppgave med mindre støtte for å undersøke overføring. Den kan ligge i lærerens opplegg; hver liten side trenger ikke alle fasene.
- Bruk felles komponenter og temavariabler. Sørg for lesbarhet, tastaturbetjening, mobilbruk, tydelig progresjon og hjelp som eleven kan åpne ved behov.
- Hovedmenyen eies av `src/routes/+layout.svelte` og `LabHeader.svelte`. Nye sider skal arve denne, ikke lage en egen toppmeny, kontolenke eller temavelger. Lærersider bruker `TeacherShell.svelte`; lokale stegmenyer og relaterte lenker hører til sideinnholdet. Gi sidens eneste `main` element `id="hovedinnhold"` og `tabindex="-1"`, slik at den felles hopplenken virker. Se [felles navigasjon og design](docs/felles-navigasjon.md).
- Gjør brukerens plassering, handlinger og systemets status forståelige. Bruk WCAG 2.2 nivå AA som arbeidsmål for nye og vesentlig endrede brukerflyter. Skill forskningsfunn, standardkrav og lokale designvalg; en bestemt kortfarge eller tekststørrelse er ikke et forskningskrav.
- Bruk grunnlagene innenfor oppgavens omfang. Ikke endre andre aktiviteter, eksisterende XP-regler eller vurderingsordninger som en sideeffekt. Hvis brukeren ber om et annet pedagogisk valg eller designvalg, følg den avklarte retningen og dokumenter begrunnelsen kort.

## Før arbeidet leveres

- Gå gjennom sjekklisten i det pedagogiske grunnlaget. Beskriv kort hva eleven gjør, hva responsen forteller, og hvordan forståelsen kan undersøkes. Skill mellom det som er teknisk kontrollert og det som ennå må prøves med elever.
- Ved grensesnittendringer: bruk relevante punkter i [designgrunnlagets sjekkliste](docs/webdesign-og-brukeropplevelse.md#7-sjekkliste-før-levering). Kontroller den endrede flyten med tastatur, berøring, smal skjerm, zoom og begge temaer, inkludert fokus, kontrast og relevante feil- og hjelpemeldinger. Oppgi hva som er prøvd og hva som gjenstår; tekniske kontroller og agentgjennomgang erstatter ikke brukertesting med elever.
- Ved endringer i modeller eller vurderingslogikk: kjør relevante tester med `npm test`. Ved Svelte-/kodeendringer: kjør `npm run check` og `npm run build`, og prøv den endrede elevflyten i nettleseren. Kontroller både gyldige og ugyldige forsøk og muligheten for å prøve igjen.
- Ved rene dokumentasjonsendringer: kontroller lenker, innhold og formatering; full bygging og tester er ikke nødvendig.
- Oppdater aktivitetens dokumentasjon når mål, støtte eller vurdering endres. Påstå ikke dokumentert læringseffekt uten et egnet datagrunnlag.

## Svelte 5 og SvelteKit – Svelte MCP

Disse instruksjonene kommer i tillegg til det pedagogiske grunnlaget, designgrunnlaget og prosjektets egne kontroller ovenfor. De forutsetter at Svelte MCP-serveren er koblet til agentens miljø; denne filen kobler ikke til serveren. Hvis verktøyene ikke er tilgjengelige, oppgi begrensningen, bruk offisiell Svelte-/SvelteKit-dokumentasjon og kjør prosjektets relevante kontroller. Ikke påstå at MCP-verktøy er brukt når de ikke er tilgjengelige.

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### Available Svelte MCP Tools:

#### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

#### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

#### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

#### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Labpartnerens KI-kontekst

Ved arbeid med KI-veiledning: les [pilotens kontekst- og driftsbeskrivelse](docs/labpartner-ki-pilot.md). Oppgavegrunnlaget eies av backend og skal gjenbruke aktivitetens mål og kode. Registrer bare relevante, navngitte handlinger og send et avgrenset øyeblikksbilde når eleven spør. Knytt svar og testresultater til riktig oppdrag og kodeversjon. Hold kontohemmeligheter, andre elevers data og skjult vurderingsinnhold utenfor modellkonteksten. KI-veiledning skal ikke selv godkjenne oppgaver eller gi XP.

Ved nye moduler, øvinger og leksjoner: følg [det felles kontekstsystemet](docs/labpartner-kontekst.md). Gjenbruk innholdsmetadata og `PartnerContext` i felleskomponentene. Nye aktivitetstyper må ha en versjonert, validert delingskontrakt og servereid kontekstbygger. Ikke send rå fritekst eller DOM. Lærer-/administratorsider har ikke labpartner; fagsjekker og Nattevakten deler ikke vurderingsinnhold.
