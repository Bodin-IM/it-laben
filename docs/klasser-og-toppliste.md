# Klassevalg og klassenes toppliste

Eleven velger **2ITA** eller **2ITB** i Min lab eller på topplisten. Ingen klasse er forhåndsvalgt. Eleven må markere at hen tilhører klassen og forstår at valget låses, før bekreftelsesknappen blir tilgjengelig. Etter lagring vises klassen og at valget er låst.

Valget følger profilen mellom faner, enheter og pålogginger. Et mislykket lagringsforsøk kan prøves igjen. Samme valg kan sendes på nytt etter et tapt svar; en annen klasse avvises. Eksisterende profiler starter uten klasse og beholder konto, nøkkel, XP og topplisteinnstilling. Klassevalget er egenrapportert og låst per profil, ikke en kontroll mot skolens elevregister. Nye profiler kan fremdeles opprettes etter nettstedets eksisterende regler.

## Hvilken klasse leder?

Klassen med høyest **samlet XP** leder. Begge klassene vises med poengsum og antall deltakere. Lik poengsum vises som likt; uten deltakere eller opptjente poeng vises en starttilstand uten utpekt leder.

- Bare aktive, synlige elevprofiler med valgt klasse bidrar. Lærere og administratorer er utelatt.
- Hele den ordinære XP-summen teller, også poeng fra før klassevalget. Ingen nye XP-kilder innføres.
- Klassenes summer beregnes fra hele deltakergrunnlaget, uavhengig av sidetallet i den individuelle topplisten.
- «Skjul meg fra topplisten» fjerner også profilen fra klassens sum. Klasse og personlige poeng beholdes. «Vis meg» tar bidraget inn igjen.
- Elever uten klasse kan fremdeles bruke laben og delta i den individuelle topplisten.
- Total XP er valgt for denne første versjonen. Det er ikke normalisert for klassestørrelse; flere deltakere kan gi en fordel. Antallet deltakere vises derfor sammen med summen.

Klassen står ved brukernavnet i den individuelle topplisten. Den offentlige responsen får klassekode og to klassesummer, men ingen konto-ID-er eller ny aktivitetshistorikk. Topplisten oppdateres ved klassevalg, endret synlighet, «Oppdater» og den eksisterende oppdateringen hvert 30. sekund.

## Teknisk løsning og drift

Migrasjon `009_student_classes.sql` legger til det valgfrie feltet `users.class_code`, med databasekrav om 2ITA eller 2ITB. Den kjøres automatisk ved oppstart av API-et. Ingen tidligere migrasjoner endres.

`POST /api/me/class` krever pålogget aktiv elevprofil, riktig Origin, CSRF, egen `accountId`, gyldig `classCode` og `confirmed: true`. Første valg lagres med en betinget oppdatering i en transaksjon. Et annet valg gir HTTP 409 og `CLASS_LOCKED`. Klassen kan ikke endres gjennom de øvrige profilendepunktene. `GET /api/me` og nøkkelinnlogging returnerer lagret klasse.

`GET /api/leaderboard` utvides med `classCode` i elevoppføringene og `classes`, der hver rad har `classCode`, `participants` og `xp`. Sum og deltakere bruker de samme tilgangs- og synlighetsreglene som den individuelle listen.

Backup omfatter klassefeltet. Ved tilbakeføring etter migrasjon 009 må API-versjonen forstå det aktive skjemaet; den tidligere versjonen avviser en database med nyere migrasjoner. Test med egen database før publisering. Arbeidet legges først på `dev`.

## Pedagogikk og utforming

Dette er en avtalt utvidelse av eksisterende konkurranse, etter brukerens ønske. Den generelle pedagogiske standarden gjør ikke offentlig konkurranse til et krav for nye læringsaktiviteter. Klassepoengene viser opptjente milepæler og er ikke et selvstendig mål på forståelse eller grunnlag for karakter. Oppgaver, hint, tilbakemeldinger og vurderingsregler endres ikke.

Elevhandlingen er å velge og bekrefte tilhørighet. Systemet svarer med lagret klasse og viser hvilken poengsum klassen har. Bekreftelsen forebygger feil ved et varig valg, og lastestatus, feil og mulighet for nytt forsøk følger designgrunnlagets prinsipper U1 og U7. Vi bruker eksisterende felles meny og temavariabler.

Utprøving med elever gjenstår: forstår de at valget låses, hvordan summen beregnes og hvordan skjuling påvirker den? Følg også opp hvordan klassekonkurransen oppleves. Teknisk kontroll dokumenterer ikke læring eller motivasjon.

## Kontroll

Tre fokuserte API-/databasetester dekker klassevalg og konkurrerende innsendinger, beregning og avgrensning av klassepoeng, samt oppgradering og gjenoppretting. De eksisterende testene for offentlig respons er oppdatert med det nye feltet. Tre kontroller som låste migrasjonsantallet til åtte, kontrollerer nå at alle faktiske migrasjonsfiler er anvendt.

Kontrollert 27. oktober 2026:

- Alle 158 automatiske tester bestod, inkludert de tre nye testene. Svelte-sjekk ga null feil og null advarsler, og produksjonsbygget bestod.
- Nettleseren kjørte mot den faktiske API-koden og en isolert testdatabase. Klassevalg, bekreftelse, lagringsfeil og nytt forsøk, konflikt med en annen innsending, skjuling/visning, ny innlogging og låst klasse i Min lab ble prøvd. Én lagringsfeil ble simulert for å prøve feilmeldingen.
- A i ledelse, B i ledelse, likt, ingen deltakere og null XP ble prøvd. Den individuelle listen beholdes under klasseoversikten.
- 16 sidetilstander ble kontrollert ved 320–1440 CSS-piksler i lyst/mørkt tema, med null funn i de valgte automatiske WCAG A/AA-kontrollene og uten horisontal siderulling. Tastatur, fokus og emulert berøring ble prøvd separat.
- Klassevalget og låst visning ble prøvd med 200 % tekststørrelse og økt tekstavstand ved 320 piksler. Oppdateringsknappen kan bryte til ny linje, og hovedmenyens oppsett kan brytes over flere linjer ved stor tekst. Mobilmeny og Escape/fokus ble kontrollert ved 320, 390, 700 og 1000 piksler.
- Ingen nettleserfeil eller hydreringsfeil ble registrert. Ingen produksjonsprofiler eller elevdata ble brukt. Dette er ikke en full WCAG-samsvarsvurdering eller en utprøving med elever.

Skjermbilder med oppdiktede profiler: [klasseoversikt](designutkast/klasse-toppliste-lys.jpg) og [klassevalg på mobil](designutkast/klassevalg-mobil.jpg).

Svelte MCP var ikke tilgjengelig. Offisiell dokumentasjon for [reaktiv tilstand](https://svelte.dev/docs/svelte/$state) og [skjemabindinger](https://svelte.dev/docs/svelte/bind), Svelte-sjekk, produksjonsbygg og nettleserkontroll er brukt. Ingen kjøring av MCP-autofikseren er påstått.
