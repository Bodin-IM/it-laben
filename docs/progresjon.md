# Progresjon, fagspor og merker

Denne første utprøvingen ligger på `backend`. Den har åtte merker, fire fagspor, ti valgfrie fagsjekker, et personlig område på forsiden og et labkort eleven kan tilpasse. Lyder er av som standard. Publisering til skolens server beskrives i [backendveiledningen](backend.md).

Forhåndsvisning med en testprofil: [forsiden](gamification-home.png), [Min lab](backend-preview.png) og [mobil](gamification-mobile.png).

Progresjonen skiller mellom **gjennomgått** (elevens egen bekreftelse), **bestått oppdrag** (en serverkontrollert løsning) og **bestått fagsjekk**. Et bestått forsøk gjelder den konkrete oppgaven; XP og merker er ikke karakterer eller en sertifisering av elevens samlede kompetanse. Hint og nye forsøk reduserer ikke belønningen.

## Hvor definisjonene ligger

| Fil                         | Ansvar                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/lib/innhold.js`        | Stabile aktivitets-ID-er, fag, formater, adresser og valg av progresjonstype.                                   |
| `src/lib/checkpoints.js`    | Offentlig innhold til fagsjekker: spørsmål, valg, hint og forklaring. Flere varianter per aktivitet er støttet. |
| `server/checkpoints.js`     | Riktige svar og validering av fagsjekker. Importeres aldri av frontend.                                         |
| `server/catalog.js`         | Eksplisitte adaptere for spill/aktiviteter og oppstartskontroll av definisjonene.                               |
| `src/lib/progression.js`    | Belønningspolicy, deklarative merkekrav, fagspor, labfarger og felles målmodell.                                |
| `server/progress.js`        | Serverens beregning, engangsbelønninger, etterregistrering og lagring.                                          |
| `src/lib/lab.js`            | API, kø per konto, lagring etter nettbrudd og samlede bekreftelser.                                             |
| `src/lib/celebrations.js`   | Samler belønninger og hindrer at kvitteringer vises som nye belønninger.                                        |
| `src/lib/labPreferences.js` | Valgfrie lyder, volum og redusert bevegelse, lagret i denne nettleseren.                                        |

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

En ny gjennomgang gir 15 XP én gang. Den kan vises i et fagspor ved å legge til `{ type: 'activity', activityId: 'nettverk-grunnlag' }` i sporets mål. Uten et fagspor er aktiviteten fortsatt tilgjengelig i oversikten og kan gi progresjon og XP.

## Legg til en fagsjekk eller en ny variant

Legg et spørsmål til i `checkpoints.js` med `activityId`, en stabil `id`, tittel, spørsmål, minst to unike valg, hint og forklaring. Opprett så riktig svar i den private `answers`-tabellen i `server/checkpoints.js`:

```js
// Offentlig spørsmåls-ID og valg:
{ activityId: 'nettverk-grunnlag', id: 'dns-v1', /* ... */ }

// Privat svar på serveren:
'nettverk-grunnlag:dns-v1': 'riktig-valg-id'
```

Fagsjekken vises automatisk under aktiviteten og gir 10 XP én gang når serveren har godkjent den. Den er et **tillegg**, slik at en allerede gjennomgått leksjon fortsatt er gjennomgått. Gjestebrukere kan lese spørsmålet og åpne forklaringen. En profil gir kontroll og lagring av svaret.

Vil du publisere en selvstendig aktivitet som består av fagsjekker, bruk `tracking: { kind: 'checkpoint' }`. Da er fagsjekkene aktivitetens hovedoppdrag. Den samme modellen brukes for publisert innhold, fagspor og merker.

En vesentlig ny oppgavevariant får en ny ID, for eksempel `dns-v2`. Ikke gjenbruk en gammel ID til en oppgave med andre krav. Den første utprøvingen har ikke tidslåste repetisjoner eller innloggingsstreaks; nye repetisjonsoppgaver kan legges til med egne ID-er.

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

Belønningspolicyen er samlet: 15 XP for gjennomgang, 10 for fagsjekk, 25 for bestått spill-/simulatoroppdrag og 25 i fullføringsbonus for en challenge-aktivitet. Nivåene bruker 100 XP per nivå. Med første sett gir alt innhold 575 XP og maksimalt labnivå 6.

Unike belønningsnøkler hindrer dobbeltelling ved nye forsøk og retry etter nettbrudd. Tidligere opptjente poeng beholdes selv om nye aktiviteter eller nye regler legges til. Eksisterende belønningsnøkler skal ikke endres.

Labkortets farge og valgte merke lagres på kontoen gjennom `POST /api/me/lab`, med samme session-, Origin- og CSRF-kontroll som andre profilendringer. Serveren kontrollerer at låste farger og merker faktisk er opptjent. Migrasjon `002_lab_profile.sql` lagrer valgene og sørger for kaskadesletting sammen med kontoen.

Lyd er av som standard, og korte effekter starter først etter en brukerhandling i nettleseren. Volum og rolige animasjoner er lokale innstillinger, slik at en ny maskin ikke plutselig spiller lyd. Operativsystemets reduserte bevegelse respekteres også. Lydene syntetiseres lokalt i nettleseren og trenger ingen eksterne lydtjenester.

Feiringer kommer etter serverbekreftelse. Flere belønninger fra samme kø samles. Kvitteringer for tidligere behandlede hendelser feires ikke på nytt. Kø som er hentet fra lokal lagring eller har ventet på nettet får en rolig samlet synkroniseringsmelding.

## Kontroll før publisering

```bash
npm test
npm run check
npm run build
```

Test også med en eksisterende konto og database. Migrasjoner legges til som nye filer; tidligere anvendte SQL-filer skal ikke redigeres. Ta backup før oppgradering. Den nye API-versjonen må være tilgjengelig sammen med frontend som sender de nye oppdrags-ID-ene.

Testene inkluderer en ny driftsimulator og en selvstendig fagsjekk som eksempel på utvidelse, i tillegg til etterregistrering, bevaring av gamle poeng, lagring av labkort, backup, kontoisolasjon og belønningskvitteringer.
