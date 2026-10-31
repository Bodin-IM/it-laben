# Elevtilbakemeldinger

28. oktober 2026. En egen kanal for feil og forslag om IT-laben. Den endrer ikke faglig respons, vurdering, progresjon eller XP.

## Elevens flyt og designvalg

`StudentFeedback.svelte` eier knappen og skjemaet i felles layout. Den bruker elevens valgte `Avatar`, men er uavhengig av `LabPartnerPanel`, samtalehistorikken og KI-tjenesten. Det er et skjema til administratorene, ikke en ny modus i oppgaveassistenten.

- En liten tekstmerket knapp «Tilbakemelding» står nederst til høyre på elevsidene. Det manuelle skjemaet åpnes aldri automatisk, og knappen har ingen animasjon eller varselteller. Et separat, frivillig oppgavespørsmål kan vises over knappen på pilotøvingene; se utvidelsen nedenfor. Trykkflaten er minst 44 piksler høy. Det reserveres plass nederst på siden, og knappen viker midlertidig for belønningsvarselet.
- Dialogen viser kjent figur, et kort spørsmål, hva meldingen gjelder, type og ett tekstfelt. Ingen vurderingsskala eller obligatorisk spørreskjema. På mobil er den en rullbar visning nederst på skjermen.
- Siden registreres når skjemaet åpnes. Tittel og adresse vises før sending. Utkastet beholder denne siden ved navigasjon; eleven kan uttrykkelig forkaste det og starte for den nye siden.
- Lukk og Escape går tilbake til oppgaven. Utkastet beholdes i minnet ved lukking og intern navigasjon, men ikke ved omlasting eller kontobytte. Det skrives ikke til lokal lagring.
- «Sender» betyr at svaret avventes. «Meldingen er sendt» vises først etter bekreftelse fra backend. Ved feil beholdes teksten og samme innsending kan prøves igjen uten å opprette en kopi. Dersom eleven endrer innholdet etter et forsøk, regnes det som en ny innsending.
- Bekreftelsen beholdes også dersom eleven lukker mens sendingen pågår. «Send en ny tilbakemelding» starter et nytt skjema for gjeldende side.
- Gjester kan sende uten profilnavn, blant annet for å melde om innloggingsproblemer. Innloggede elever ser at profilnavnet følger med. Knappen vises ikke på lærersider, for lærer-/administratorprofiler eller i presentasjonsvisning.

Dette bruker U1, U3 og U6 i [designgrunnlaget](webdesign-og-brukeropplevelse.md): forståelige handlinger og systemtilstander, lite konkurrerende innhold og gjenkjennelig utforming. Dialogens fokus, tastatur, etiketter, kontrast og rulling følger prosjektets WCAG-arbeidsmål. Hjørneplassering og 44 piksler er lokale designvalg. De er ikke dokumentert som én optimal utforming. [Pedagogikkgrunnlaget](pedagogisk-grunnlag.md) videreføres: funksjonen samler erfaringer med verktøyet og vurderer ingen elevsvar.

## Sidekontekst og lagring

`feedbackPage` i `src/lib/feedback.js` gjenbruker den offentlige innholdskatalogen og modulene. Backend validerer siden og henter tittelen selv. Bare kjente interne elevadresser godtas. Fagvalg på forsiden, kjent modulreferanse, kjent omvisningssteg og kjent kapittel i databaseinnføringen beholdes. Andre søkeparametre og fragmenter fjernes, inkludert eventuelle fritekstsøk eller nøkler. Verken DOM, kode, elevsvar, vedlegg, passord eller KI-samtaler samles inn automatisk.

Migrasjon `012_student_feedback.sql` oppretter `student_feedback` i den eksisterende SQLite-databasen. En rad inneholder:

| Felt | Bruk |
| --- | --- |
| ID og fingeravtrykk | Gjenkjenn samme innsending ved dobbelklikk eller tapt svar. |
| Bruker-ID, eventuelt tom | Knytt en innlogget innsending til riktig profil. Gjester har ingen profilkobling. |
| Type og melding | Feil, forslag eller annet; 1–2000 tegn. |
| Sidetittel og relativ adresse | Vis konteksten og gi administrator en lenke til riktig side. |
| Opprettet tidspunkt | Serverens mottakstidspunkt. |
| Ny/behandlet og behandlingstidspunkt | Enkel oppfølging i administrasjonen. |

Data følger vanlig databasebackup og omstart. Sletting av en elevprofil sletter også tilbakemeldingene knyttet til profilen. Gjestemeldinger er ikke knyttet til en profil. Øvrig oppbevaring og fjerning må inngå i skolens driftsrutiner; «Behandlet» er ikke sletting. Ikke bruk fritekstfeltet til sensitive elevopplysninger.

## Tilgang og administrasjon

Eksisterende `TeacherShell` og `TeacherNav` gjenbrukes. Administratorer får fanen **Tilbakemeldinger · admin**, med adresse `/laerer/tilbakemeldinger/`. Den viser nyeste meldinger, avsenderens profilnavn når det finnes, automatisk sidekontekst, tidspunkt og status. Filtrering på Nye, Behandlet og Alle og sideinndeling på 20 meldinger holder listen håndterbar. Åpning av listen markerer ikke meldinger automatisk som behandlet.

Når en statusendring fjerner en melding fra filteret, flyttes tastaturfokus til lagringsbekreftelsen. Tilbakekalt tilgang fjerner den hentede listen ved neste avviste forespørsel. Lenken til den vanlige forsiden åpner elevvisningen også for administratorer.

| API | Tilgang og oppførsel |
| --- | --- |
| `POST /api/feedback` | Elev/gjest; kontoen må samsvare med aktuell sesjon eller være uttrykkelig tom for gjest. Bekrefter bare ID og tidspunkt. |
| `GET /api/admin/feedback` | Innlogget administrator, kontrollert på serveren ved hvert kall. |
| `POST /api/admin/feedback/:id/status` | Innlogget administrator og samsvarende konto. Setter Ny/Behandlet. |

Eksisterende HTTPS-, Origin-, JSON- og CSRF-kontroller gjelder. En gammel innlogget fane kan ikke sende som gjest eller som en ny innlogget konto. API-et begrenser antall og størrelse på innsendingene: 120 per ti minutter per IP, tilpasset delt skolenett, og fem nye per ti minutter per innlogget profil. Gjentakelse av samme bekreftede innsending går ikke gjennom profilgrensen på nytt. Begrensningen på IP-adresse er midlertidig i minnet; adressen lagres ikke med meldingen.

Teksten vises som vanlig Svelte-tekst, aldri som HTML. Ingen meldinger sendes til Ollama eller andre tjenester. Administratorrollen, ikke lærerrollen, gir lesetilgang; dette håndheves også ved direkte API-kall. Kontobytte tømmer skjema og innboks og ugyldiggjør sene svar.

## Kontroll og utprøving

Automatiske tester dekker sidekontekst og fjerning av uvedkommende URL-data, elev/gjest, administratorgrensen, Origin/CSRF/kontosamsvar, ugyldige felt, duplikater, lagring over omstart, sideinndeling, statusendringer, profilsletting og begrensning av innsendinger.

Svelte MCP er ikke tilgjengelig i arbeidsmiljøet. Offisiell Svelte-dokumentasjon, prosjektets typekontroll, produksjonsbygg og nettleserprøving brukes.

Utført kontroll med midlertidig database og oppdiktede meldinger:

- 206 automatiske tester bestått. `npm run check` uten feil eller advarsler og produksjonsbygg bestått.
- Produksjonsbygget er prøvd fra elevknapp til database og admininnboks: kjent figur, side ved åpning, utkast etter navigasjon, ugyldig/tom melding, bekreftet sending og ny innsending.
- Feilet lagring og tapt serversvar: teksten beholdes, og gjentakelsen gir én rad. Kontobytte fjerner privat utkast; samme konto beholder det. Utilgjengelig API og blokkert lokal lagring er prøvd.
- Elev, gjest og lærer avvises fra innboksen. Administrator kan filtrere, markere behandlet/ny og følge sidelenken. Tilbakekalt tilgang fjerner en allerede hentet liste ved neste forespørsel. Innsendt HTML vises som tekst.
- Tastatur, Escape, fokus tilbake, fokus etter statusendring og emulert berøring er kontrollert. Skjema og adminvisning er prøvd ved 1440, 768, 390 og 320 CSS-piksler i begge temaer. Ingen horisontal sideoverflyt ved 320 piksler med 200 % tekst og økt linje-, ord- og bokstavavstand.
- Axe fant ingen avvik i de prøvde A/AA-reglene i disse 16 side-/tema-/breddevisningene. Ingen JavaScript-feil ble registrert. Dette er ikke en full WCAG-revisjon eller kontroll med en virkelig skjermleser.

Utprøving med elever og administrator på skoleinstallasjonen gjenstår. Be eleven melde fra om et konkret problem uten å angi knappens plassering. Undersøk om eleven finner knappen, forstår hvem som mottar meldingen, ser riktig side og kan gå tilbake til arbeidet. Prøv administratorens vei fra melding til siden den gjelder. Tekniske tester dokumenterer ikke brukervennlighet eller læringseffekt med elever.

## Korte oppgavespørsmål – første versjon på dev, 31. oktober 2026

Dette utvider den manuelle kanalen med ett frivillig spørsmål på **øving 5, 8 og 10**: «Var det tydelig hva du skulle gjøre?» med likeverdige knapper **Ja, Delvis og Nei**. Det samler erfaringer med instruksjonene; svaret vurderer ikke eleven, godkjenner ingen oppgave og gir ingen XP. Oppgavespørsmålene har en egen versjon, uavhengig av eksisterende progresjons- og fagsjekkversjoner.

### Begrunnelse og avgrensning

- Iqbal og Bailey (2008), [Effects of intelligent notification management on users and their tasks](https://doi.org/10.1145/1357054.1357070), fant mindre frustrasjon ved varsling i naturlige oppgavepauser. Vi bruker dette som støtte for tidspunktet, ikke som dokumentasjon på en optimal plassering eller maskotanimasjon.
- Sitzmann og Wang (2015), [The survey effect](https://doi.org/10.1016/j.lindif.2014.11.003), fant ulemper ved lengre spørreskjemaer i nettbasert opplæring. Derfor bruker vi ett spørsmål, ett trykk og valgfri kommentar. Vi kopierer ikke studiens opplæringsopplegg.
- Eldeeb, Ren og Shapiro (2025), [Promoting the use of research evidence from websites](https://doi.org/10.1332/17442648Y2025D000000057), undersøkte små spørsmål på nettsteder. Tidspunkt, formulering og antall klikk påvirket svarandel. Det gir grunn til å prøve vår konkrete flyt med elever.
- Deslauriers mfl. (2019), [Measuring actual learning versus feeling of learning](https://doi.org/10.1073/pnas.1821936116), viste at opplevd og målt læring kan avvike i universitetsfysikk. Vi spør derfor konkret om tydelighet og presenterer svarene som elevenes erfaringer, ikke læringseffekt.

Utformingen følger designgrunnlagets U1, U3, U6 og U7: styring, lite konkurrerende innhold, gjenkjenning, tastatur og tilgjengelig status. Én forespørsel per dag, tre svaralternativer og 180 ms animasjon er lokale valg for utprøving. Ingen av kildene dokumenterer at akkurat denne løsningen er best for Vg2-elevene.

### Når og hvordan spørsmålet vises

`ExerciseLab` melder bare at en innlogget elev har startet et simulert forsøk. Spørsmålet kan tilbys ved siste steg i kjøringen, også ved simulerte feilsituasjoner. Alternativt kan det tilbys etter at eleven går til en annen intern elevside etter å ha startet et forsøk. Det kreves ikke bestått fagsjekk, og bare åpning av en side er ikke nok. Dette begrenser utvalget til elever som har prøvd, men inkluderer dem som går videre uten å fullføre. Nettleserlukking og eksterne navigasjoner avbrytes aldri. Vi fanger dermed ikke opp alle som gir opp; svarene er ikke et representativt mål for hele klassen.

`ActivityFeedbackPrompt.svelte` vises ved den eksisterende knappen. Det er et lite, ikke-modalt kort med valgt figur, én kort innkomstbevegelse og ingen lyd. Det tar ikke fokus automatisk. Kortet viker når eleven fortsetter med peker eller tastatur, og ved navigasjon. Tab kan brukes for å nå kortet; Escape og Hopp over lukker. Kortet skal ikke dekke elementet som har tastaturfokus. Redusert bevegelse respekteres.

Forespørselen hoppes over hvis eleven skriver, en dialog er åpen, belønningsvarselet vises, en tidligere melding har et utkast, labpartneren er slått av, eller siden er skjult/ikke en elevside. Den venter ikke på en anledning til å dukke opp senere. Lærere, administratorer og gjester får ingen automatiske oppgavespørsmål. Den vanlige feedbackknappen er fortsatt tilgjengelig for elever og gjester.

Backend reserverer høyst én invitasjon per profil per kalenderdag i **Europe/Oslo**, og høyst én per oppgaveversjon. Begge grensene håndheves i én transaksjon med unike databasebegrensninger, også på tvers av faner og maskiner. Avviste og ubesvarte forespørsler gjentas ikke for samme versjon. En invitasjon registrert av serveren er ikke bevis for at eleven så kortet; dette forklares i adminvisningen.

**Ikke spør meg igjen** lagres på profilen. Eleven kan slå funksjonen på igjen i **Min lab → Innstillinger → Labpartner, lyd og animasjoner**, eller i tilbakemeldingsdialogens innstillinger. Kontoendring tømmer klientens muligheter, avbryter forespørsler og avviser sene svar. Avmelding endrer ikke manuell feedback eller eksisterende tilbakemeldinger.

### Svar, kommentar og administrasjon

- Et trykk sender svaret. Takk vises først etter bekreftelse fra backend, med samme figur og tekst for alle svar. Ved usikker lagring beholdes valgt svar og Prøv igjen bruker samme invitasjon; et annet svar kan ikke overskrive et allerede registrert svar.
- **Legg til en kommentar** åpner det eksisterende skjemaet med oppgavens opprinnelige side og kobling til svaret. Utkast, kontobytte, feilbehandling og idempotent sending følger den manuelle kanalen. Kommentar er valgfri også ved Nei.
- Adminsiden `/laerer/tilbakemeldinger/` viser svarfordelingen med tekst og en liten stolpe per oppgave-/spørsmålsversjon. Hoppet over og uten svar holdes utenfor Ja/Delvis/Nei. Kommentarknappen filtrerer den eksisterende innboksen til oppgaven; hver kommentar viser svaret og oppgaveversjonen. Filtrert innboks og totalfordeling har ulike, eksplisitte omfang.
- Profilnavnet følger kommentarer som før. Svar lagres med bruker-ID og er ikke anonyme; kortet opplyser om dette og at administratorer har tilgang. Aggregeringen viser ikke enkeltelevers vurderinger uten kommentar.

Migrasjon `014_activity_feedback.sql` legger til `feedback_preferences` og `activity_feedback_prompts`, og en valgfri `prompt_id` i `student_feedback`. Eksisterende migrasjoner, meldinger, progresjon, løsninger, køer og XP-regler beholdes. Profilsletting sletter også invitasjoner, svar, avmelding og tilhørende kommentarer. Data inngår i eksisterende backup og oppbevaringsrutiner. Ingen data sendes til KI.

Invitasjonen lagrer kun validert oppgave-ID og versjon, servereid tittel/spørsmål, renset sideadresse, en navngitt klientutløser, tidspunkt og eventuelt svar/avvisning. Utløseren er klientrapportert og er ikke dokumentasjon på bestått eller forståelse. Kode, feltverdier, elevsvar i øvingene, tastetrykk, samtaler og vilkårlige URL-parametre sendes ikke.

| API | Tilgang og formål |
| --- | --- |
| `GET/POST /api/feedback/preferences` | Innlogget elev; lese/endre om spørsmål ønskes. |
| `POST /api/feedback/prompts` | Innlogget elev; tilby et spørsmål innenfor de to grensene. |
| `POST /api/feedback/prompts/:id` | Bare eieren; svare eller hoppe over, idempotent. |
| `GET /api/admin/feedback/activities` | Administrator; svarfordeling per versjon. |
| `POST /api/feedback` med `promptId` | Kommentar til eget registrerte svar; siden må samsvare. |
| `GET /api/admin/feedback?activity=oving-5` | Administrator; kommentarer til valgt pilotoppgave. |

Eksisterende Origin-, CSRF-, kontosamsvars-, HTTPS- og IP-grenser brukes. Oppgaveversjon, felt, svaralternativer, eierskap og administratorrolle kontrolleres på serveren.

### Kontrollstatus og videre utprøving

På dev er kildekode og diff gjennomgått. Nye regresjonstester er lagt til for tilgang, kontobytte, ugyldige felt, eierskap, gjentatt sending, døgnskifte i Oslo, engang per versjon, avmelding, omstart, profilsletting, kommentarfiltrering og uendret progresjon/XP. **Testene er ikke kjørt i denne dev-leveransen**; full testsuite, Svelte-sjekk, bygg og relevant nettleserprøving gjenstår før main. Svelte MCP var ikke tilgjengelig; offisiell Svelte-/SvelteKit-dokumentasjon er brukt.

Før publisering skal flyten prøves fra øving 5, 8 og 10, inkludert ufullført forsøk, neste dag, to faner, tapt serversvar, bytte av konto og eksisterende feedbackutkast. Kontroller tastatur, skjermleserstatus, fokus under kortet, smal skjerm, zoom, begge temaer og redusert bevegelse. Prøv oppgradering av en database med gamle meldinger, progresjon og løsninger.

Prøv deretter med noen elever: oppleves spørsmålet som frivillig, forstår de hva det gjelder og hvem som leser svaret, og kan de fortsette uten avbrudd? Se etter konkrete forbedringer i oppgavetekstene fra svar og kommentarer. Følg svarandel og avvisninger, men ikke tolk uteblitt svar som misnøye eller som dokumentert visning. Bruk observasjoner og faglige oppgaver for å undersøke forståelse separat.
