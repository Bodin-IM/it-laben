# Progresjon, fagspor og merker

Denne første utprøvingen ligger på `backend`. Den har åtte merker, fire fagspor, 13 fagsjekker med to spørsmål hver, et personlig område på forsiden og et labkort eleven kan tilpasse. Lyder er av som standard. Publisering til skolens server beskrives i [backendveiledningen](backend.md).

Se også den nye fagsjekken: [tilbakemelding og ventetid](fagsjekk-forsok.png) og [mobilvisning av et nytt forsøk](fagsjekk-mobile.png).

Forhåndsvisning med en testprofil: [forsiden](gamification-home.png), [Min lab](backend-preview.png) og [mobil](gamification-mobile.png).

Progresjonen skiller mellom **gjennomgått** (elevens egen bekreftelse), **bestått oppdrag** (en serverkontrollert løsning) og **bestått fagsjekk**. Et bestått forsøk gjelder den konkrete oppgaven; XP og merker er ikke karakterer eller en sertifisering av elevens samlede kompetanse. Lesing og spill kan gjentas fritt. XP krever nå bestått fagsjekk; selve sjekken har ett innsendt forsøk per 24 timer per aktivitet og konto.

## Hvor definisjonene ligger

| Fil                           | Ansvar                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `src/lib/innhold.js`          | Stabile aktivitets-ID-er, fag, formater, adresser og valg av progresjonstype.                |
| `src/lib/checkpoints.js`      | Offentlig registrering av fagsjekker: aktivitet, stabil ID og tittel.                        |
| `server/checkpoints.js`       | Serverutstedte forsøk, stokking, retting og døgnsgrense. Importeres aldri av frontend.       |
| `server/assessment-bank.js`   | Private spørsmålsbanker med spørsmål, riktige/uriktige alternativer og faglige forklaringer. |
| `src/lib/assessmentPolicy.js` | Antall spørsmål, ventetid og felles API-typer. Serveren håndhever reglene.                   |
| `server/catalog.js`           | Eksplisitte adaptere for spill/aktiviteter og oppstartskontroll av definisjonene.            |
| `src/lib/progression.js`      | Belønningspolicy, deklarative merkekrav, fagspor, labfarger og felles målmodell.             |
| `server/progress.js`          | Serverens beregning, engangsbelønninger, etterregistrering og lagring.                       |
| `src/lib/lab.js`              | API, kø per konto, lagring etter nettbrudd og samlede bekreftelser.                          |
| `src/lib/celebrations.js`     | Samler belønninger og hindrer at kvitteringer vises som nye belønninger.                     |
| `src/lib/labPreferences.js`   | Valgfrie lyder, volum og redusert bevegelse, lagret i denne nettleseren.                     |

## Legg til en leksjon

Registrer aktiviteten i `aktiviteter` i `innhold.js`, og sett:

```js
{
  id: 'nettverk-grunnlag',
  tittel: 'Slik finner maskinene hverandre',
  href: '/nettverk-grunnlag/',
  fag: 'drift',
  format: 'leksjon',
  tracking: { kind: 'review' }
  // Ta også med beskrivelse, type, emner, sokeord og symbol som på øvrige aktiviteter.
}
```

Den felles `ActivityProgress`-komponenten finner aktiviteten fra adressen og legger til egenrapportert gjennomgang. Leksjoner i `ovingene.js` får dette automatisk gjennom registreringen i `innhold.js`.

En gjennomgang lagres straks, men de 15 XP frigjøres først når aktivitetens fagsjekk er bestått. Legg derfor også til en spørsmålsbank som beskrevet nedenfor. En aktivitet uten fagsjekk kan lagre progresjon, men gir ikke nye XP. Den kan vises i et fagspor ved å legge til `{ type: 'activity', activityId: 'nettverk-grunnlag' }` i sporets mål. Uten et fagspor er aktiviteten fortsatt tilgjengelig i oversikten og kan gi progresjon og XP.

## Legg til en fagsjekk eller en ny variant

Registrer sjekken i `src/lib/checkpoints.js` med aktivitet, stabil ID og tittel. Opprett deretter en bank i **`server/assessment-bank.js`**, med minst tre spørsmål. Hvert spørsmål har en stabil kilde-ID, ett korrekt svar, minst to uriktige alternativer og en forklaring. Hjelperen `question()` brukes slik:

```js
// Offentlig registrering:
{ activityId: 'nettverk-grunnlag', id: 'dns-v1', title: 'Sjekk forståelsen' }

// Privat bank, på serveren:
'nettverk-grunnlag': {
  questions: [
    question('dns-funksjon', 'Hva brukes DNS til?',
      'Å slå opp navn til adresser.',
      'Å kryptere all trafikk.',
      'Å lagre brukernes passord.',
      'Navneoppslaget finner adressen; TLS og pålogging løser andre oppgaver.'),
    // Minst to andre spørsmål som sjekker samme læringsmål i ulike situasjoner.
  ]
}
```

Serveren trekker to spørsmål og blander svarene. Begge må være riktige. Eleven må først ha markert leksjonen som gjennomgått eller ha løst alle spilloppdragene. Å åpne sjekken bruker ikke forsøket. Alle faner og enheter for samme konto får det samme uleverte forsøket.

Når to gyldige svar leveres, brukes forsøket. Ved feil må eleven vente **24 timer fra innleveringen**, ikke til midnatt. Serverklokken og databasens forsøkshistorikk avgjør dette. Oppdatering av siden, ny innlogging, lokal sletting eller nye hendelses-ID-er gir ikke et nytt forsøk. Ufullstendige/ugyldige innsendinger bruker ikke forsøket. Et innsendt forsøk kan sendes identisk igjen etter nettbrudd, men svarene kan ikke endres.

Et nytt forsøk får minst ett annet spørsmål enn sist, og et gjentatt spørsmål får det riktige svaret på en annen plass. Flere varianter kan legges til uten endring i visningen eller poengmotoren. Før retting sendes bare utstedte spørsmål, alternativer og ugjennomsiktige ID-er til klienten. Etter retting vises elevens svar, riktig svar og forklaring, også etter ny innlogging.

Fagsjekken er valgfri for å lese og øve, men **påkrevd for nye XP**. Den gir 10 XP én gang og frigjør allerede fullført arbeid i aktiviteten. En gjennomgått leksjon forblir gjennomgått ved feil. En bestått sjekk gir ikke nye forsøk eller gjentatte poeng.

For en selvstendig sjekk brukes `tracking: { kind: 'checkpoint' }`; sjekkene er da hovedoppdrag. For øyeblikket brukes én sjekk per aktivitet. Legges flere til, må alle være bestått før aktivitetens XP frigjøres. En vesentlig ny sjekk får en ny ID; vanlig utvidelse av spørsmålsbanken beholder ID-en og opptjente resultater.

Oppgraderingen bruker `check-v2`. Gamle `check-v1`-resultater og belønninger beholdes som historikk, men kan ikke sendes inn på nytt for poeng. Tidligere opptjent gjennomgangs-/spill-XP gis ikke en gang til når den nye sjekken bestås. Allerede opptjente merker beholdes; merker for egen gjennomgang og løste spilloppdrag er fortsatt separate fra fagsjekkene.

## Legg til spill og andre praktiske aktiviteter

Bruk `tracking: { kind: 'challenge', adapter: 'dns-simulator' }`, og registrer en eksplisitt adapter i `challengeAdapters` i `server/catalog.js`:

```js
'dns-simulator': {
  objectives: [
    { id: 'resolve', title: 'Riktig navneoppslag' },
    { id: 'route', title: 'Riktig vei til serveren' }
  ],
  validate(objectiveId, solution) {
    // Valider form og verdier før løsningen kontrolleres.
    // Returner true bare når den konkrete løsningen oppfyller kravene.
    // Ikke stol på passed/points sendt av klienten. Ikke kjør fri elevkode.
    return validateDnsSimulation(objectiveId, solution);
  }
}
```

Registrer også en fagsjekk for spillet. Spilloppdragene kan øves på uten forsøksgrense, men oppdrags-XP og fullføringsbonus frigjøres først når alle oppdragene og fagsjekken er bestått.

Frontend sender de faktiske valgene med `saveAttempt(activityId, objectiveId, solution)` når et komplett forsøk er ferdig. Et enkelt klikk i gjennomgangen gir ingen godkjenning. API-et lagrer resultatet og beregner poengene. En ukjent adapter gir oppstartsfeil; nye spill kan aldri falle tilbake til et annet spills kontroll.

`format` styrer presentasjon, mens `tracking` styrer progresjon. Du kan derfor bruke `format: 'aktivitet'` for en praktisk simulator, med samme kontroll og merkemodell som spillene. Registrer navn og søkeord til eventuelle nye formater i `innholdsformater`. Forsidens formatfilter følger de publiserte aktivitetene. Nye fag registreres i `fag` og dukker opp i de felles filtrene.

## Merkekrav og fagspor

Et merke deklarerer kriteriene sine, i stedet for å få en egen if-setning i API-et:

```js
{
  id: 'dns-detective-v1',
  title: 'DNS-detektiv',
  description: 'Løs navneoppslaget og finn riktig rute.',
  symbol: 'DNS',
  subjects: ['drift'],
  goal: {
    type: 'all',
    goals: [
      { type: 'objective', activityId: 'dns-lab', objectiveId: 'resolve' },
      { type: 'objective', activityId: 'dns-lab', objectiveId: 'route' }
    ]
  }
}
```

De refererte aktivitetene og oppdragene må finnes når merket publiseres. Målmodellen støtter:

- `activity`: alle hovedoppdragene i en aktivitet.
- `objective`: ett bestemt oppdrag eller én fagsjekk.
- `count`: et antall aktiviteter eller oppdrag, med valgfrie filtre på fag, format og bevistype (`reviewed`, `checked`, `passed`).
- `all`: kombiner flere mål. Dette brukes også til mål på tvers av fag og spill.

Et fagspor har tittel, beskrivelse, fag og et mål på samme form. Fremdrift og fortsett-lenker beregnes av den felles modellen. Nye driftsoppgaver trenger derfor ingen egen profilside eller belønningsmotor. Fagspor viser publiserte steg, og fullført progresjon på eksisterende steg beholdes når nye steg kommer til.

Et opptjent merke blir stående. Ved vesentlig endring i et merkekrav opprettes et nytt merke med ny ID. Behold gamle merkedefinisjoner så allerede opptjente merker fortsatt kan vises. API-et etterregistrerer nye merker ved oppstart for elever som allerede oppfyller kravene; dette gir ikke ekstra XP eller en serie gamle feiringer.

## Poeng, labkort og tilbakemelding

Belønningspolicyen er samlet: 15 XP for gjennomgang, 10 for fagsjekk, 25 for bestått spill-/simulatoroppdrag og 25 i fullføringsbonus for en challenge-aktivitet. Nivåene bruker 100 XP per nivå. Alle dagens 13 aktiviteter krever fagsjekk for XP. Det gir 605 XP og labnivå 7 for en ny konto som fullfører alt. Historiske poeng fra utgåtte sjekker legges til kontoens maksimum slik at tidligere XP ikke skjuler gjenstående oppgaver.

Unike belønningsnøkler hindrer dobbeltelling ved nye forsøk og retry etter nettbrudd. Tidligere opptjente poeng beholdes selv om nye aktiviteter eller nye regler legges til. Eksisterende belønningsnøkler skal ikke endres.

Labkortets farge og valgte merke lagres på kontoen gjennom `POST /api/me/lab`, med samme session-, Origin- og CSRF-kontroll som andre profilendringer. Serveren kontrollerer at låste farger og merker faktisk er opptjent. Migrasjon `002_lab_profile.sql` lagrer valgene og sørger for kaskadesletting sammen med kontoen.

Lyd er av som standard, og korte effekter starter først etter en brukerhandling i nettleseren. Volum og rolige animasjoner er lokale innstillinger, slik at en ny maskin ikke plutselig spiller lyd. Operativsystemets reduserte bevegelse respekteres også. Lydene syntetiseres lokalt i nettleseren og trenger ingen eksterne lydtjenester.

Feiringer kommer etter serverbekreftelse. Flere belønninger fra samme kø samles. Kvitteringer for tidligere behandlede hendelser feires ikke på nytt. Et låst eller avvist fagsjekkforsøk fjernes fra køen og forsøksstatus hentes på nytt, slik at andre innsendinger fortsatt kan synkroniseres. Serverens forsøk, progresjon, poeng og kvittering oppdateres i samme transaksjon. En teknisk feil før commit bruker ikke forsøket.

Kø som er hentet fra lokal lagring eller har ventet på nettet får en rolig samlet synkroniseringsmelding.

## Kontroll før publisering

```bash
npm test
npm run check
npm run build
```

Test også med en eksisterende konto og database. Migrasjoner legges til som nye filer; tidligere anvendte SQL-filer skal ikke redigeres. Ta backup før oppgradering. Den nye API-versjonen må være tilgjengelig sammen med frontend som sender de nye oppdrags-ID-ene.

Test også feil svar, ny fane/enhet, avbrutt svar, gjeninnsending etter nettbrudd og grensen på nøyaktig 24 timer. Migrasjon `003_checkpoint_attempts.sql` lagrer forsøk og sletter dem med kontoen. Frontend og API oppgraderes sammen til innsendingversjon 2. Ventende gjennomganger og spillforsøk fra versjon 1 kan fortsatt lagres, men gir ingen nye XP uten den nye fagsjekken. Gamle fagsjekkinnsendinger avvises.

Testene inkluderer en ny driftsimulator og en selvstendig fagsjekk som eksempel på utvidelse, i tillegg til etterregistrering, bevaring av gamle poeng, lagring av labkort, backup, kontoisolasjon og belønningskvitteringer.
