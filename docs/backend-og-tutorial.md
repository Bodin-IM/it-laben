# Backend og elevens kom-i-gang-veiledning

28. oktober 2026. Brukerbestilt opprydding: ett Backend-forløp under Utvikling, et tannhjul for labpartnerens utseende og en egen tutorial på `/tutorial/`.

## Backend: mål og avgrensning

Backend samler eksisterende undervisning, øvinger og oppdrag. Rekkefølgen er dataflyt, lagring og validering, innlogging og tilgang, deretter repetisjon og ekstra utfordring. Nattevakten beholder eksisterende tids- og vurderingsregler og er en ekstra utfordring. Øving 10 blir i Driftsstøtte. Databaseinnhold forblir en egen modul.

Læreplan: [ITK02-01, Utvikling](laereplan/ITK02-01.md). Lokale målreferanser med ordrett kompetansemål:

- **UTV-01:** «vurdere fordeler og ulemper ved ulike programmeringsspråk og velge og anvende relevante programmeringsspråk og algoritmer i eget arbeid». Modulen gir avgrenset øving i å lese, anvende og endre JavaScript-kode. Den dekker ikke sammenligning og valg av programmeringsspråk alene.
- **UTV-07:** «analysere digitale trusler, verdier og sårbarheter og utvikle applikasjoner med innebygget sikkerhet». Validering, session og eierskap lar eleven undersøke utvalgte sårbarheter og tiltak. Et komplett trusselbilde og en egen sikker applikasjon krever videre arbeid.
- **UTV-08:** «anvende relevant testmiljø og utføre testing tilpasset IT-løsningen som utvikles». Eleven velger normal- og feiltilfeller, sammenholder kode og data og prøver endringer på nytt. Simulatorene forbereder testing i elevens faktiske utviklingsmiljø.

Forkunnskaper er JavaScript-variabler, objekter, lister og funksjoner. Arbeidet støtter lesing av kode, muntlig forklaring og systematisk problemløsing. JSON-fillagring er ikke en erstatning for kompetansemålene om databaser. Omorganiseringen endrer ikke oppgavenes respons, løsninger eller belønninger.

Lærerens videre oppfølging: La eleven bygge en tilsvarende rute for eksempel for visningsnavn i eget prosjekt. Be om begrunnede testtilfeller og en forklaring av hvor serveren avviser ugyldige data. Vurder både funksjonen og forklaringen; modulens progresjon er ikke dokumentert forståelse.

## Tutorial: mål og elevhandling

Målgruppe: elever som er nye i IT-laben. Det er først og fremst en verktøyveiledning. Den faglige miniprøven introduserer en avgrenset del av **UTV-08**, med ordlyden ovenfor, og krever ikke at eleven kan skrive koden selv. Målet er å finne en oppgave, forutsi et utfall, kjøre, lese respons, endre ett valg og teste på nytt.

Labpartneren følger eleven gjennom fem korte steg: finn en oppgave, les målet, prøv, bruk hjelp og gå videre. Eleven velger selv omvisningen og tempoet. «Neste», «Tilbake», direkte stegvalg og «Avslutt omvisningen» er alltid tilgjengelige. Ingen test eller avkryssing låser neste steg. Uten omvisningen vises alle delene som en vanlig oppslagsveiledning. Eksemplet er tydelig merket som lokal simulering og gir ingen XP eller lagret gjennomføring.

Den valgte labpartnerfiguren vises sammen med en kort forklaring i hvert steg. Steget ligger i `?tur=…`, slik at oppfrisking og nettleserens tilbakeknapp beholder plasseringen. Prøvevalgene beholdes mellom steg i samme besøk, men lagres ikke ved oppfrisking. Eleven kan starte igjen fra forsiden, veiledningen eller labpartnerens Sidehjelp. Omvisningen og prøveoppgaven krever verken KI, innlogging eller lokal lagring. Skolens nettside må være tilgjengelig; «uten KI» betyr ikke at nettstedet installeres for bruk uten nett.

| Elevhandling | Respons | Nytt forsøk |
| --- | --- | --- |
| Kjør med bare mellomrom, uten trim | Meldingen ble lagret; mellomrom telles som tegn | Fjern mellomrom først og kjør igjen |
| Endre kontroll uten å kjøre | Siste resultat merkes som tidligere | Kjør på nytt for å få oppdatert resultat |
| Kjør med trim | Meldingen avvises fordi kontrollert tekst er tom | Prøv en vanlig melding med samme kontroll |
| Kjør en vanlig melding | Meldingen lagres | Undersøk også feiltilfellet; én test er ikke nok |

Ny anvendelse: eleven forklarer hvordan et visningsnavn bør valideres og foreslår to tester, deretter bruker prinsippet i egen kode i lærerens videre opplegg. Et riktig simulatorresultat eller lest tutorial teller ikke som en vurdering av forståelse.

Labpartneren gjenbruker `studentGuide.js` som sidegrunnlag. Arbeidsstatusen inneholder bare en kjent steg-ID (eller `all` for oppslagsvisningen), kjent eksempel, trim-valg og tilsvarende valg fra siste kjøring. Serveren henter stegets tekst og rekonstruerer responsen. Den får ikke råtekst eller framstiller utestede endringer som kjørte tester. Eldre klienter uten steg-ID tolkes som `all`. Samtalene følger vanlig avbrudd, personvern og merking av gamle svar.

## Design og teknisk gjennomføring

Tannhjulet bruker en SVG, synlig valgt tilstand, tilgjengelig navn og forklarende tittel. Trykkflaten er minst 44 × 44 piksler. Figuren og innstillingene beholdes. Tutorialen arver hovedmenyen og har lenker fra den, forsiden og tilkoblingshjelpen. «Kom i gang» beholder sin rolle som hjelp til sikker tilkobling.

Omvisningen viser ett innholdssteg om gangen og bruker samme farger, typografi og figurer som resten av IT-laben. Den åpnes frivillig, uten automatisk avspilling eller et lag over hele nettstedet. Stegbytte flytter fokus til overskriften; avslutning returnerer til startknappen. Berøringsmål er minst 44 piksler, og figuren følger valget om redusert bevegelse. Hjelpesteget åpner den faktiske labpartneren, slik at eleven kan prøve tannhjulet. Dette følger grunnlagets prinsipper om tydelig plassering, begrenset informasjonsmengde og kontroll over egen fremdrift; akkurat fem steg er et lokalt designvalg.

Moduler vises først. «Finn enkeltoppgaver» samler direktelenkene og åpnes ved søk/typevalg. Modulens fire deler har egne overskrifter og snarveier. Dette er lokale valg etter designgrunnlagets hierarki, konsistens og forståelig respons, ikke forskningskrav om akkurat denne utformingen.

Se [modulbeskrivelsen](moduler.md) for migrasjon av publiseringsstatus og kompatible lenker. Ingen aktivitets-ID endres. Gamle moduladresser blir statiske videresendinger. Nye moduler får fortsatt status kommende.

## Kontroll og utprøving

Automatiske tester dekker feil/retting/normaltilfelle, gammelt testresultat, avvisning av råtekst og falske resultatfelt, moduldekning, gamle lenker og publiseringsmigrering. Eksisterende kontroller av konto, XP, progresjon og lærerroller kjøres også.

Pedagogisk utprøving gjenstår: La noen elever finne dagens oppgave uten instruksjon om bestemte knapper, bruke responsen i prøveforsøket og forklare overføringen til visningsnavn. Noter navigasjonsproblemer separat fra faglige misforståelser. Teknisk kontroll viser ikke læringseffekt.


### Utført teknisk kontroll

- 199 automatiske tester bestått. Svelte-sjekk uten feil/advarsler og produksjonsbygg bestått.
- Automatiske kontrakttester dekker alle omvisningssteg, eldre klienter uten steg-ID og avvisning av ukjente steg eller innsendt stegtekst.
- Omvisningen: start, tastaturfokus, fem steg, direkte stegvalg, tilbake/fremover i nettleseren, oppfrisking, avslutning og omstart. Prøveoppgaven er kontrollert med feiltilfelle, retting, vanlig melding og gammelt testresultat, også etter stegbytte. Ingen API-skriving ble utløst av omvisningen.
- Backend → aktivitet → tilbake og gammel moduladresse er prøvd med ekte lokal API og midlertidig testdatabase. Utvikling viser Backend og Databaser, med drift i eget fag.
- Omvisning, fagoversikt og Backend: 30 kombinasjoner av 1920, 1440, 768, 390 og 320 CSS-piksler og begge temaer, uten horisontal sideoverflyt. De tre sidene er også prøvd ved 320 piksler med 200 % tekst og økt tekstavstand. Knappen og innholdstypene på modulsiden bryter nå lange tekster ved behov.
- Mobil: faktisk labpartner åpnet fra hjelpesteget, tannhjul med berøring, lukking med Escape og fokus tilbake til åpneren. Omstart fra Sidehjelp lukker dialogen og frigjør siden. Ingen registrerte JavaScript-feil. Axe fant ingen relevante A/AA-avvik i de tre undersøkte sidevisningene; dette er ingen full tilgjengelighetsrevisjon.
- Utilgjengelig API, blokkert lokal lagring, ukjent steg og redusert bevegelse er prøvd. Valgt figur følger omvisningen, også uten innlogging.
- Svelte MCP var ikke tilgjengelig. Offisiell Svelte-/SvelteKit-dokumentasjon, prosjektets kontroller og Playwright ble brukt.

Ollamas faktiske svar på tutorialen og elevenes bruk er ikke prøvd. Kontrakt og serverbygget kontekst er testet uten den lokale modellen.

![Tutorialens prøveforsøk](designutkast/tutorial-practice.png)

![Tannhjulet i mobilvisningen](designutkast/labpartner-tannhjul-mobil.png)
