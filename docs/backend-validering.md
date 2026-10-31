# Validering: fra øving til egen kode

**Dev, 31. oktober 2026.** Første avgrensede leveranse etter strategiarbeidet: relevant neste steg, ett sammenhengende Backend-forløp og tydelig respons på forsøk og lagring. Bygger på [pedagogisk grunnlag](pedagogisk-grunnlag.md), [designgrunnlaget](webdesign-og-brukeropplevelse.md) og [aktivitetsmalen](aktivitetsmal.md).

## Mål og forkunnskaper

Målgruppe: Vg2 informasjonsteknologi. Programfag: Utvikling, [ITK02-01](laereplan/ITK02-01.md).

- **Hovedmål, UTV-08:** «anvende relevant testmiljø og utføre testing tilpasset IT-løsningen som utvikles».
- **Støttemål, UTV-07:** «analysere digitale trusler, verdier og sårbarheter og utvikle applikasjoner med innebygget sikkerhet».

Lokalt læringsmål: Eleven skal kunne kontrollere datatype, tom tekst og lengde før lagring; forklare hvorfor et feilsvar ikke gjør tidligere dataendringer ugjort; og velge tester som undersøker både HTTP-svar og data. Simulatorarbeidet er forberedelse til testing av egen løsning. Vi dekker en avgrenset del av sikkerhetsmålet, ikke full trusselanalyse eller et helt kompetansemål.

Forkunnskaper: JavaScript-strenger, objekter, betingelser, funksjoner, GET/POST og JSON. Eleven har en liten Express-backend og Svelte-frontend fra tidligere arbeid. JSON-fillagring beholdes; databaser inngår ikke her. Lesing av kode, muntlig forklaring og systematisk problemløsing brukes gjennom forløpet.

## Elevens arbeid

| Del | Elevhandling | Respons og vei videre |
| --- | --- | --- |
| Undersøk i øving 7 | Forutsi hva som skjer med bare mellomrom, kjør stegvis og sammenlign med vanlig tekst. Undersøk også datatype og lengdegrense. | Simulatoren viser lengde før/etter trim, request, svar, minne og fil. Etter full kjøring forklares resultat, årsak og et nytt forsøk ut fra den kjørte modellen. |
| Reparer teksten i Redd chatten | Endre den eksisterende POST-ruten og prøv både normaltilfeller og ugyldig input. | Eksisterende tester kontrollerer status, svar og data. Feil lagring gir en konkret undersøkelse. Hint kan åpnes gradvis, uten nye poengregler. |
| Bruk selv i eget prosjekt | Valider et visningsnavn på 1–30 tegn etter trim i egen Express-rute og vis feilen i frontend. | Eleven velger tester, sammenligner data før/etter og forklarer kontrollen for medelev/lærer. Nettsiden vurderer ikke elevens eksterne kode automatisk. |

Forløpet ligger i de eksisterende sidene. Modulens øving 7 viser tre tydelige lenker, og oppgaven til eget prosjekt er synlig på `/oving-7/#eget-prosjekt`. `forlop=validering` følger overgangen til reparasjonen. Etter beståtte tester får eleven en direkte vei til visningsnavnoppgaven. I dette forløpet fremheves ikke neste reparasjon om avsender; de vanlige oppdragsfanene og opplåsingsreglene består.

Oppgaven om mellomrom er lagt til som ny oppgaveindeks 3 i leksjonsmetadataene. `firstTask` lar den vises først uten å gi de tre eksisterende oppgavene nye indekser i labpartnerkontrakten. Den gamle scenarioverdien `empty` er bevart som mellomrom. `blank` skiller en faktisk tom streng fra mellomrom. Begge er ugyldige, men forskjellen før trim blir synlig. Endring av input fjerner forrige kjøring og respons.

`backendValidation.js` eier de felles lenkene og overføringsoppgaven. Øving 7 og første Redd chatten-oppdrag gjenbruker samme oppgavetekst. Labpartnerens eksisterende kontekstbygger leser leksjons-/oppdragsmetadataene; ingen nye rådata, elevlogger eller godkjenninger er lagt til. Den får fortsatt ikke elevens eksterne prosjektkode eller en påstått fullføring av eget prosjekt.

## Anbefalinger, progresjon og lagring

`moduleRecommendation.js` bruker offentlig modulstatus, rekkefølgen i modulinnholdet og eksisterende kontoprogress:

1. Velg aktive moduler innenfor fagvalget. En øving med eget fag, som øving 10, følger fortsatt Backend sin modulstatus.
2. Prioriter sist påbegynte, uferdige deloppgave i disse modulene. Fullføring av én deloppgave gjør ikke automatisk den neste til påbegynt arbeid.
3. Foreslå ellers uferdig elevarbeid i modulrekkefølgen. Etter gjennomgått øving 7 kan bare tekstreparasjonen foreslås tidlig; senere reparasjoner blir ikke flyttet foran undervisningen om sessions.
4. En modul uten kontolagret progresjon leder til oversikten med en forklaring. Vi antar ikke fullføring eller nøyaktig plassering fra lokal øvingsstatus. Tilgjengelige fagsjekker foreslås etter det registrerte elevarbeidet. Reglene for tilgang, forsøk og XP endres ikke.
5. Når ingen relevante moduler er aktive, kan en ferdig modul foreslås med merket repetisjon. Kommende moduler og manglende publiseringsstatus brukes ikke. Grensesnittet viser ingen anbefaling mens modulstatus er ukjent, har hentefeil eller er utilgjengelig på offentlig HTTP.

Forslaget finnes på forsiden og på modulsiden, med oppgavenavn, handling og begrunnelse. Anbefalingen skriver ingen progresjon. Gamle moduladresser, delankre, aktivitets-ID-er og oppdrags-ID-er er bevart. Ingen databasemigrering, sletting, nye belønninger eller endring av 24-timersgrensen inngår.

Lagring beskrives separat fra funksjonstestene:

- Øving 7 beholder innstillinger og kjøringssteg i besøket. Ved ny åpning starter simulatoren på nytt. Kontoen lagrer elevens egen gjennomgangsmarkering og fagsjekk etter eksisterende regler.
- Redd chatten sender kodeforsøket gjennom den eksisterende køen når hele prøverunden fullføres. Enkeltprøver, hint og forutsigelser lagres ikke som kodeforsøk.
- «Denne koden er lagret på kontoen» krever at den serverbekreftede løsningen samsvarer med kodeblokkene som vises, at ingen innsending for oppdraget venter, og at lagringen ikke har en registrert feil. Endret kode og ventende innsendinger har egne meldinger. Gjestearbeid beskrives som midlertidig i fanen. Øvingsmodus og lærerøkt merkes særskilt.
- Historisk gjennomføring og opptjent XP består selv om eleven endrer kode senere. Gjeldende testresultater blir fortsatt merket som utdaterte ved kodeendring.
- Eget prosjekt lagres av eleven i prosjektet og følges opp av læreren. Lenker, åpnet hjelp og gjennomføring av simulatorsteg registreres ikke som dokumentert forståelse.

## Lærerens oppfølging og elevutprøving

Start med en liten før-oppgave: Vis en kontroll som bare undersøker om tekstfeltet finnes, og be eleven foreslå input som utfordrer den. Underveis: observer om eleven finner oppgaven, velger en relevant test og bruker responsen til å endre fremgangsmåten. Ved pararbeid kan én forklare og én foreslå testen; bytt roller.

Etterpå viser eleven sin egen validering av visningsnavn, en avvist request uten dataendring og et gyldig forsøk. Be om en forklaring på hvorfor kontrollen må komme før lagring. I en senere økt: la eleven validere et romnavn med en annen lengdegrense, med mindre støtte. Noter hvilken hjelp eleven brukte. En vellykket funksjonstest alene dokumenterer ikke forståelse eller varig læring.

Prøv først med 3–5 elever med ulike forkunnskaper. Gi målet uten å navngi knapper. Skill mellom navigasjonsproblemer, faglige misforståelser og interesse/frustrasjon. Undersøk særlig om eleven finner overgangen til egen kode og faktisk bruker prinsippet der. Antallet er et praktisk utgangspunkt for å finne problemer, ikke dokumentasjon på læringseffekt.

## Teknisk kontroll og gjenstående arbeid

Kildekode og diff er gjennomgått. De 11 avgrensede testene i `tests/learningFlow.test.js` bestod. De dekker den konkrete anbefalingsfeilen, broen til tekstreparasjon, sperrede oppgaver, lagringsmeldinger og samsvar mellom valideringsrespons og modelldata. Kontrollen ble kjørt under utviklingen fordi endringen retter en konkret feil i anbefalingsgrunnlaget og må bevare eksisterende progresjon. Full testsuite, Svelte-sjekk, bygg og nettleserprøving gjenstår før main, etter repoets arbeidsflyt. Svelte MCP er ikke tilgjengelig i arbeidsmiljøet; offisiell Svelte-/SvelteKit-dokumentasjon brukes som referanse.

Før main: kontroller hele forløpet på siste samlede versjon, med ny og eksisterende elevprofil, gjenåpning, gjest, øvingsmodus/lærerøkt, ventende/feilet lagring og kodeendring etter bestått test. Prøv modulstatus og fagvalg, direkte lenker og gamle delankre. Kontroller tastatur, fokus, smal skjerm, zoom og begge temaer. Sammenlign progresjon og XP før/etter. Utprøving med elever og kvaliteten på skolens faktiske KI-svar gjenstår.
