# Elevtilbakemeldinger

28. oktober 2026. En egen kanal for feil og forslag om IT-laben. Den endrer ikke faglig respons, vurdering, progresjon eller XP.

## Elevens flyt og designvalg

`StudentFeedback.svelte` eier knappen og skjemaet i felles layout. Den bruker elevens valgte `Avatar`, men er uavhengig av `LabPartnerPanel`, samtalehistorikken og KI-tjenesten. Det er et skjema til administratorene, ikke en ny modus i oppgaveassistenten.

- En liten tekstmerket knapp «Tilbakemelding» står nederst til høyre på elevsidene. Den åpnes aldri automatisk og har ingen animasjon eller varselteller. Trykkflaten er minst 44 piksler høy. Det reserveres plass nederst på siden, og knappen viker midlertidig for belønningsvarselet.
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
