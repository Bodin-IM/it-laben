# Redd chatten – læringspilot

Adresse: `/spill/redd-chatten/pilot/`, lenket fra Redd chatten. Piloten er tilgjengelig uten innlogging og endrer ikke de tre ordinære oppdragene eller deres XP/fagsjekker.

## Mål og bruk i timen

Eleven skal kunne forklare og gjennomføre validering før data lagres. Beregn 20–25 minutter som første anslag. Elevene trenger en enkel forståelse av if, lister, req.body og HTTP-svar. Introduser trim() hvis nødvendig.

1. Følg en vanlig melding i startkoden.
2. Forutsi hva samme kode gjør med tre mellomrom, og begrunn før kjøring.
3. Undersøk startkoden stegvis og lag en egen test med begrunnelse.
4. Reparer koden og test seks tilfeller. Tilbakemeldingen viser både svar og dataendring. Tre nivåer av hint kan åpnes ved behov.
5. Forklar hvorfor den avviste requesten lar listen være uendret. Sammenlign med et faglig svar og vurder eget hjelpebehov.
6. Reparer en romrute med samme prinsipp. Her gis testresultater, men ingen stegvis gjennomgang. Hjelp er fortsatt tilgjengelig.

Alle delene vises i menyen og kan åpnes fritt. Haker betyr gjennomført handling eller bestått funksjonstest, avhengig av delen. Fritekst og egenvurdering blir ikke automatisk faglig vurdert. Observer elevens forklaring og diskusjon. I par kan én forklare og den andre foreslå en test; bytt roller ved romoppgaven.

## Progresjon og arbeidsnotat

Fire milepæler gir 10 pilotpoeng hver: sammenlignet prediksjon, kjørt egen begrunnet test, bestått chattester og bestått romtester. Gjentakelse gir ikke flere poeng. Hint og feil gir ikke trekk. Opptjente poeng beholdes, men en kodeendring fjerner den aktuelle testgodkjenningen til ny kjøring. Pilotpoeng er ikke ordinær XP, karakterer eller et mål på forståelse.

Svar, kode og milepæler huskes i sessionStorage i den aktuelle fanen. «Start en ny økt» nullstiller arbeidet etter en lokal bekreftelse. Ingen pilotsvar sendes til serveren. På siste del kan eleven lese og kopiere et arbeidsnotat med prediksjon, egen test, forklaring, hjelpebruk og teststatus. Læreren må vurdere friteksten. At eleven ikke åpnet hjelp i romdelen, beviser ikke selvstendig mestring; eleven har nettopp fått støtte i chatdelen.

## Før videre utrulling

Prøv med 3–5 elever med ulike forkunnskaper før en klasseøkt. Se etter om elevene forstår oppgaven, bruker testresultatene til å endre kode og kan forklare hvorfor listen ikke endres ved avvisning. Skill faglige vansker fra problemer med grensesnittet. Gi en beslektet oppgave uten visualiseringen i en senere time. Sammenlign elevens forståelse og interesse separat; én før-/ettermåling dokumenterer ikke en årsakseffekt.

## Implementasjon og kontroll

Chatdelen gjenbruker den eksisterende deterministiske tolken og stegvisningen. `evaluateTextInput` bruker samme kontrakt og utføring som de faste chatprøvene. Romdelen har en liten tolk for fire forhåndsdefinerte blokker, med samme virkning som koden som vises. Ingen fri elevkode evalueres. Testene vurderer status, svarinnhold og data, ikke en bestemt tekstlig rekkefølge. Tastaturknapper er tilgjengelige som alternativ til dra og slipp.

Kjør `npm test`, `npm run check` og `npm run build`. Modelltestene dekker mellomrom, manglende felt, feil type, lagring før avvisning, samsvar mellom stegvisning og evaluering, og uavhengige startdata. Browserkontroll bør dekke alle seks deler, ny testing etter kodeendring, oppfrisking, nullstilling, mobilbredde og mørkt tema.

## Pedagogisk grunnlag

Piloten er ett eksempel på prinsippene i [IT-labens felles pedagogiske grunnlag](pedagogisk-grunnlag.md). Bruk grunnlaget og [aktivitetsmalen](aktivitetsmal.md) ved senere utvikling; nye aktiviteter trenger ikke kopiere pilotens seks deler eller poengmodell.

Pilotens utforming er inspirert av ICAP (Chi & Wylie, 2014, DOI 10.1080/00461520.2014.965823), PRIMM (Sentance mfl., 2019, DOI 10.1080/08993408.2019.1608781), feedback-oversikten (Wisniewski mfl., 2020, DOI 10.3389/fpsyg.2019.03087) og gamification-oversikten (Sailer & Homner, 2020, DOI 10.1007/s10648-019-09498-w). Disse studiene undersøker andre kontekster og tiltak. Seks deler, hintnivåer og poengregler er lokale designvalg som må prøves i undervisningen.
