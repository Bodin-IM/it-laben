# Nattvakt – redd produksjonen

Nattvakt ligger på `backend`, under `/spill/nattvakt/`. Det er en produksjonsvakt på åtte minutter med fire hendelser, ett innsendingsforsøk og en lokal elektronisk ambience som bygger seg opp mot slutten.

Forhåndsvisning med eksempeldata: [briefing](nattvakt-briefing.png), [aktiv vakt](nattvakt-aktiv.png), [mobil](nattvakt-mobile.png) og [hendelsesrapport](nattvakt-rapport.png).

## Spilleregler

Eleven må først bestå `check-v2` i Frontend møter backend, Sessions og pålogging, og Lagring i JSON-fil. Briefingen kan leses før utfordringen er låst opp.

«Start vakten» bruker forsøket og starter fristen. Hver konto kan starte én vakt per 24 timer, regnet fra starttidspunktet. Serveren eier både start, frist og forsøksgrense. Oppdatering av siden, utlogging, annen PC, endring av klientklokken eller nye hendelses-ID-er nullstiller ikke vakten. Utløp beregnes fra databasen, også etter prosessomstart.

Eleven kan undersøke spor og endre rettinger fram til én samlet sluttinnlevering. Ingen forhåndsretting gir fasit under vakten. Alle fire hendelsene må bestås før fristen:

1. Request-kontrakt og validering av tekst.
2. Cookie på hver request og serverkontrollert identitet.
3. Riktig rekkefølge for autentisering, oppslag, eierskap og sletting.
4. Innlesing ved oppstart og trygg lagring før suksessvar.

Slettingsruten kjøres gjennom de samme åtte prøvene som i Redd chatten. Til sammen har første scenario 16 kontroller fordelt på de fire hendelsene. Det kjøres ingen fri elevkode.

Etter levering eller utløp vises en hendelsesrapport med resultat, forklaring, løsningsprinsipp og relevante leksjoner. Ved utløp vurderes sist lagrede serverutkast for å gi læringsfeedback; utløpt vakt gir ikke XP, selv med et korrekt utkast.

Første bestått gir **50 XP og merket Nattvakt**. Dette er en serverkontrollert forståelsesoppgave og krever ingen ekstra fagsjekk. Senere beståtte vakter kan forbedre personlig rekord, men gir ikke samme XP på nytt. Tidligere opptjent progresjon og merke beholdes ved senere feil.

## Lagring og nettbrudd

Utkast lagres etter en kort pause i endringene, og en lokal reservekopi knyttes til konto og forsøks-ID. Serverutkastet følger kontoen til en annen enhet. Revisjonskontroll hindrer at to faner stille overskriver hverandre. Ved konflikt må eleven hente det lagrede utkastet før redigering fortsetter.

En identisk utkastlagring kan sendes på nytt etter tapt svar uten å øke revisjonen igjen. Sluttinnleveringen bruker den eksisterende køen per konto og stabile hendelses-ID-er. Ved tapt svar etter commit hentes samme resultat, uten nye poeng. Fristen fortsetter under nettbrudd: serveren må motta sluttinnleveringen før fristen. Klientens påståtte innleveringstid brukes ikke som bevis.

Oppdatering av vaktresultat, progresjon, belønning, merke og kvittering skjer i én SQLite-transaksjon. En teknisk feil før commit ruller dem tilbake. Migrasjon `004_timed_challenges.sql` legger til forsøk med frist, privat scenario, utkast, revisjon og rapport. Backup tar med disse dataene; kontosletting kaskadesletter forsøkene.

## Lyd og bevegelse

Lyden er valgfri og bruker Min lab sine lokale lyd- og volumvalg. Den starter etter en brukerhandling. Ingen lydfiler lastes fra eksterne tjenester; Web Audio lager lave toner og pulser lokalt.

Rytmen øker fra omtrent 52 til 110 slag i minuttet, med mer intensitet de siste tre minuttene og det siste minuttet. Selve klokken går jevnt. Lyden dempes i skjult fane og etter avsluttet vakt, og lydressursene frigjøres når siden forlates. Etter oppdatering kan nettleseren kreve at eleven trykker «Start lydbildet». Redusert bevegelse fra operativsystemet og Min lab respekteres.

## API

Alle skrivekall bruker samme Origin-, konto- og CSRF-kontroll som resten av Min lab.

| Adresse                          | Formål                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/timed/nattvakt`        | Hent tilgang, pågående vakt, utkast, rapport, neste start og personlig rekord.                                                     |
| `POST /api/timed/nattvakt/start` | Start eller gjenoppta med `accountId` og en stabil `startId`.                                                                      |
| `POST /api/timed/nattvakt/draft` | Lagre `attemptId`, forventet `revision` og `answers`.                                                                              |
| `POST /api/progress`             | Lever med `kind: 'timed'`, `activityId: 'nattvakt'`, `objectiveId: 'shift-v1'`, `attemptId`, `answers`, versjon 2 og hendelses-ID. |

`answers` er et kart fra utstedt oppgave-ID til alternativ-ID, eller en ordnet liste av alternativ-ID-er for kodeblokkene. Alternativ-ID-ene er tilfeldige og gjelder bare dette forsøket. Før retting leveres bare offentlig scenarioinnhold, ikke private verdikart eller fasit.

## Utvid med flere scenarioer og driftsfaget

Tidsmotoren er felles. En ny utfordring trenger:

1. En stabil aktivitet i `src/lib/innhold.js`, med `tracking: { kind: 'timed', adapter: 'ny-adapter-v1' }`.
2. En definisjon i `src/lib/timedChallenges.js`: aktivitets-ID, adapter, mål-ID, varighet, ventetid, engangs-XP og forberedende mål.
3. En eksplisitt adapter i `server/timed-challenges.js` med `create`, `public`, `validate` og `grade`. Adapteren definerer innhold og faglig kontroll. Den felles motoren håndterer konto, frist, forsøk, utkast, rapport og idempotens.
4. En side med passende briefing og presentasjon, og eventuelt et eget merke i `src/lib/progression.js`.

`server/nightwatch.js` er første adapter. Den trekker nye felt, navn, rom og filnavn, og blander alternativene. Neste vakt får alltid en annen request-kontrakt enn forrige. En driftsvariant kan bruke DNS, tjenestestatus, ruting og backup med den samme motoren.

Vesentlig nye læringskrav får nye mål-/scenario-ID-er. Eksisterende poengnøkler skal beholdes. Oppgrader frontend og API sammen, og ta backup før den nye migrasjonen som beskrevet i [backendveiledningen](backend.md).
