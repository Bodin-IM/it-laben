# Øving 5 – samme melding fra kode til fil og tilbake

Dev, 2. november 2026. Tidligere startet øving 5 med et separat Node-eksempel og en simulator som brukte nye startdata ved hvert forsøk. Nå følger eleven samme melding gjennom ett sammenhengende chatforsøk. Øving 6–7 beholder sine nåværende sider. [Pedagogisk grunnlag](pedagogisk-grunnlag.md), [designgrunnlaget](webdesign-og-brukeropplevelse.md) og [aktivitetsmalen](aktivitetsmal.md) styrer endringen.

## Mål og forkunnskaper

Målgruppe: Vg2 informasjonsteknologi, programfaget Utvikling. Eleven skal lagre en melding, lese samme fil etter omstart, undersøke en skrivefeil og endre rekkefølgen slik at aktivt minne bare oppdateres etter vellykket lagring. Eleven skal også skille en manglende fil fra eksisterende, ødelagt JSON.

Læreplan [ITK02-01](laereplan/ITK02-01.md):

- **UTV-08:** «anvende relevant testmiljø og utføre testing tilpasset IT-løsningen som utvikles». Eleven prøver normal sending, omstart, en kontrollert skrivefeil og oppstartsfeil. Simuleringen forbereder; eget chatprosjekt er det faktiske testmiljøet.
- **UTV-01**, støttemål: «vurdere fordeler og ulemper ved ulike programmeringsspråk og velge og anvende relevante programmeringsspråk og algoritmer i eget arbeid». Her anvendes JavaScript og en lagringsrekkefølge. Øvingen dekker ikke sammenligning og valg mellom programmeringsspråk.

UTV-numrene er lokale referanser. JSON-filer er ikke databasearbeid. Lesing av kode, egen kodeendring, test og muntlig forklaring inngår i forløpet.

Forkunnskaper: GET/POST virker i egen chat; eleven kjenner variabler, objekter, lister, funksjonskall og grunnprinsippet fra Fillagring. Forbindelsen til Fillagring vises ved starten. NyMelding er allerede laget og kontrollert i elevens POST-rute; denne øvingen gjentar ikke all requestbehandling.

Vanlige misforståelser: `push` skriver filen; `stringify` lagrer; et feilsvar angrer en tidligere minneendring; et kodebytte fjerner gamle ulagrede meldinger; ødelagt fil og manglende fil kan alltid behandles likt.

## Elevens arbeid og respons

| Del | Elevhandling | Respons og videre undersøkelse |
| --- | --- | --- |
| Lagre | Velg egen melding, følg POST og filskriving. | Aktuell kode, aktiv liste og faktisk JSON-tekst vises sammen. Arbeidskopi/filtekst/midlertidig fil vises når de er relevante. |
| Omstart | Start den simulerte serveren på nytt. | Minnet tømmes og samme fil leses inn. Eleven finner sin egen melding igjen. |
| Skrivefeil | Prøv kodevarianten som endrer minnet først, med feil før filskriving. | Feilsvar og avvik mellom minne og fil gjør problemet synlig. |
| Endre koden | Les filen på nytt, bytt til ny liste og lagring før minnebytte. Prøv feil og normal lagring. | Begge kodeutdragene oppdateres. En feil hopper over minnebyttet; normal lagring må fortsatt fungere. |
| Oppstart | Sammenlign to isolerte testkopier med manglende/ødelagt fil. | Bare manglende fil gir tom liste. Ødelagt JSON beholdes, og oppstarten stopper. Hovedforsøkets chatfil beholdes. |

Korte instruksjoner, linjeforklaringer og hint står ved arbeidet. Eleven styrer stegvis kjøring og kan gå tilbake eller kjøre ferdig. Forrige/Neste leser snapshots; det gjentar ikke skrivingen. Ny handling bygger på tilstanden etter siste avsluttede kjøring. Felt og oppgavebytte er låst mens et forsøk gjøres ferdig. Kode-/inputendring tømmer kjøringsvisningen uten å endre chatfilen. Delbytte nullstiller heller ikke chatten. Full nullstilling er en egen navngitt knapp.

Valg mellom de to kodevariantene er en avgrenset kodeendring i modellen, ikke en fri JavaScript-editor. I hver del får eleven også en konkret endring/test i egen chat. Prosjektveiledningen viser komplett erstatning for lagringsoppsettet og et POST-utdrag med kjent funksjonsnavn, filnavn og plassering. Utdraget er ikke en komplett Express-server. Alternative gyldige løsninger i elevens prosjekt vurderes etter funksjon og forklaring.

Den midlertidige filen er en utvidelse av den enkle skrivingen i Fillagring. Den er synlig når den brukes; begrunnelsen kan åpnes etter grunnprinsippet. Modellen simulerer en feil før skriving, ikke alle diskfeil. Én prosess og små datamengder er forutsetninger. Filbytte er ikke backup.

Det tidligere `lagre.mjs`-eksemplet er beholdt som en tydelig separat grunnøving nederst. Det erstatter sin egen `ovingsdata.json` med startdata og brukes fortsatt av øving 6s separate Node-eksempel. Det er ikke hovedløpet eller chatfilen.

## Vurdering, motivasjon og overføring

Fem deler viser hvor eleven er, uten nye poeng eller automatisk godkjenning. Eksisterende aktivitets-ID, fagsjekk, XP og fremgangsregler beholdes. Fagsjekkens emner om skrivefeil, rekkefølge og ødelagt JSON inngår fortsatt i hovedløpet; oppfølgingslenkenes instruksjoner er oppdatert. Det åpne quizspørsmålet om skrivefeil bruker nå lagreMeldinger(nyListe) og presiserer at det gjelder den forbedrede ruten; svar og poengregler er uendret.

Læreren lar eleven forutsi én dataendring, vise en normal test og en feiltest i egen chat og forklare kodelinjen som gjør forskjellen. Et bestått funksjonstilfelle viser bare at akkurat det tilfellet virker. Ingen fritekst blir faglig godkjent ut fra utfylling. Hjelp har ingen poengtrekk og krever ikke KI.

Ny anvendelse: lagre og lese en annen liten liste i eget prosjekt med mindre støtte. Eleven velger ett normaltilfelle og ett relevant feiltilfelle selv. Læreren kan følge opp senere uten simuleringen. Motivasjonen søkes gjennom egen melding, synlig nytte og en kodeendring som løser et konkret problem; nytte og læringseffekt må undersøkes i vanlig undervisning.

## Teknisk kontroll og videre utprøving

Ny ren modell og visning: `storageExercise.js` og `StorageExercise.svelte`. Øving 6–10 og den eldre deterministiske modellen beholdes. Labpartner bruker en egen streng `storage-course`-kontrakt (adapterversjon 1): del, kodevalg, kodevisning, kjent synlig hendelse, valgt linje og revisjon. Ingen meldingstekst, JSON-fil, antall eller lokal prosjektkode deles. Serveren henter kode og forklaring fra samme kilde og rekonstruerer ikke usett tilstand. Delbytte bytter samtalekontekst. Gamle arbeidsstatuspayloads for øving 5 avvises med eksisterende melding om oppdatering.

Kildekode og diff gjennomgås på dev. Nye regresjonstester dekker sammenhengende lagring/omstart, begge kodevarianter, bevaring av testdata, snapshots, kode/linjekobling, kjøring av viste kodeutdrag på reelle midlertidige filer og avgrenset KI-kontekst. Testene er lagt til, men ikke kjørt i denne dev-leveransen. Samlet testsuite, Svelte-sjekk, bygg og nettleserprøving gjenstår før main etter AGENTS.md. Svelte MCP er ikke tilgjengelig; offisiell Svelte-dokumentasjon er brukt som referanse.

Før main: prøv hele elevforløpet, kodebytte etter feil, inspeksjon bakover uten ny skriving, omstart med egen melding, testkopier uten tap av hovedfil, reset, kopiering og reservevei, direkte lenker til `#forsok`/`#eget-prosjekt`, Labpartner/Vis meg hvor, tastatur, smal skjerm, zoom og begge temaer. Verifiser også at øving 6–7 er uendret. I undervisningen observeres oppgaveforståelse, bruk av respons, overføring til egen kode og interesse separat.
