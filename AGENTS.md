# Instruksjoner for KI som arbeider med IT-laben

Disse instruksjonene gjelder hele repoet. IT-laben er et undervisningsverktøy for IT-fag i videregående skole. Bruk norsk bokmål i elevtekster og lærerveiledninger.

## Før du utvikler eller endrer en aktivitet

1. Les hele [det pedagogiske grunnlaget](docs/pedagogisk-grunnlag.md) før du planlegger eller endrer læringsinnhold, elevhandlinger, tilbakemeldinger, vurdering, progresjon eller gamification. Følg grunnlaget i arbeidet; det er ikke bare bakgrunnslitteratur.
2. Les den aktuelle aktiviteten og relevant dokumentasjon. Undersøk hva som finnes før du foreslår en ny løsning. [Redd chatten-piloten](docs/redd-chatten-pilot.md) er ett eksempel, ikke en mal som alle aktiviteter skal kopiere.
3. Ved nye aktiviteter eller vesentlige pedagogiske endringer: bruk [aktivitetsmalen](docs/aktivitetsmal.md) til å beskrive mål, forkunnskaper, elevhandling, respons og en ny anvendelse. Legg beskrivelsen i aktivitetens dokumentasjon eller arbeidsplan; avklar den gjennom eksisterende oppgave og kontekst uten et ekstra godkjenningssteg. Bruk bare relevante deler ved små endringer.

## Krav under arbeidet

- La faglig mål styre aktiviteten. Velg format ut fra hva eleven skal forstå eller gjøre; varier mellom å forutsi, undersøke, reparere, sammenligne, forklare og lage.
- Gi eleven faglig informasjon som kan brukes i neste forsøk. Hint og feilforsøk skal ikke gi poengtrekk i nye læringsaktiviteter.
- Skill mellom gjennomført handling, bestått funksjonstest og vurdert forståelse. Klikk, tid, poeng, utfylt fritekst og egenvurdering dokumenterer ikke alene læring.
- Vurder gyldige løsninger etter faglig funksjon når det er mulig. Ikke godkjenn fritekst faglig bare fordi feltet er fylt ut.
- Legg inn eller beskriv en beslektet oppgave med mindre støtte for å undersøke overføring. Den kan ligge i lærerens opplegg; hver liten side trenger ikke alle fasene.
- Bruk felles komponenter og temavariabler. Sørg for lesbarhet, tastaturbetjening, mobilbruk, tydelig progresjon og hjelp som eleven kan åpne ved behov.
- Bruk grunnlaget innenfor oppgavens omfang. Ikke endre andre aktiviteter, eksisterende XP-regler eller vurderingsordninger som en sideeffekt. Hvis brukeren ber om et annet pedagogisk valg, følg den avklarte retningen og dokumenter begrunnelsen kort.

## Før arbeidet leveres

- Gå gjennom sjekklisten i det pedagogiske grunnlaget. Beskriv kort hva eleven gjør, hva responsen forteller, og hvordan forståelsen kan undersøkes. Skill mellom det som er teknisk kontrollert og det som ennå må prøves med elever.
- Ved endringer i modeller eller vurderingslogikk: kjør relevante tester med `npm test`. Ved Svelte-/kodeendringer: kjør `npm run check` og `npm run build`, og prøv den endrede elevflyten i nettleseren. Kontroller både gyldige og ugyldige forsøk og muligheten for å prøve igjen.
- Ved rene dokumentasjonsendringer: kontroller lenker, innhold og formatering; full bygging og tester er ikke nødvendig.
- Oppdater aktivitetens dokumentasjon når mål, støtte eller vurdering endres. Påstå ikke dokumentert læringseffekt uten et egnet datagrunnlag.
