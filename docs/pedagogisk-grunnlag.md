# Pedagogisk grunnlag for IT-laben

Dette er det felles grunnlaget for å utvikle og videreutvikle aktiviteter i IT-laben. Det skal brukes av både lærere og KI-assistenter. [AGENTS.md](../AGENTS.md) gir KI instruksjoner om når grunnlaget skal leses og hvordan det skal brukes. [Aktivitetsmalen](aktivitetsmal.md) gjør prinsippene konkrete for én aktivitet.

Grunnlaget bygger på **«Pedagogisk plan for IT-laben – Interaktivitet, tilbakemeldinger og gamification»**, datert 26. oktober 2026, med gjennomgang av ni artikler. Dette dokumentet er den operative versjonen i repoet. Endringer i den opprinnelige Word-planen overføres ikke automatisk hit. Nye beslutninger og revisjoner av grunnlaget skal beskrives her og begrunnes.

For Vg2 informasjonsteknologi brukes dette sammen med [læreplangrunnlaget](laereplangrunnlag.md) og [hele læreplanen ITK02-01](laereplan/ITK02-01.md). Læreplanen beskriver kompetansen opplæringen skal bidra til; dette dokumentet støtter utformingen av elevens arbeid og respons. Knytt konkrete læringsmål til relevante kompetansemål, og beskriv avgrensningen når en øving bare dekker deler av et mål.

Forskningsfunn, lokale designvalg og tekniske kontroller har ulike roller. Kildene begrunner retningen, mens utforming, poengregler og tidsbruk må prøves med våre elever. En bestått programtest dokumenterer funksjon, ikke læringseffekt.

## 1. Formålet med aktivitetene

Eleven skal forstå sammenhengen mellom handling, kode eller systemtilstand og resultat. Hen skal få øve på å finne årsaker til feil, velge neste handling og bruke det hen lærer i eget arbeid. Dette gjelder programmering, driftsstøtte og brukerstøtte.

Start med et konkret faglig mål: noe eleven skal kunne gjøre eller forklare. Beskriv nødvendige forkunnskaper og en vanlig misforståelse som aktiviteten skal hjelpe eleven å undersøke. Mål som «forstå backend» må konkretiseres, for eksempel til «forklare hvorfor ugyldige data må avvises før de lagres».

Ta utgangspunkt i et gjenkjennelig IT-problem. Eksempler er en tom melding som lagres, data som forsvinner ved omstart, en bruker som får feil tilgang, eller en tjeneste som ikke svarer. Eleven skal kunne se hva som skal fungere og hvordan det kan undersøkes.

## 2. Interaktivitet skal gi faglig arbeid

ICAP retter oppmerksomheten mot hva eleven faktisk gjør og produserer [S5]. Å trykke på Neste eller flytte en kodebit er ikke i seg selv tegn på dyp forståelse. Gi eleven anledning til å lage en prediksjon, test, forklaring eller løsning som kan undersøkes.

| Elevhandling    | Eksempel                                                      | Hva vi kan undersøke                                   |
| --------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| Forutsi         | Beskriv listen etter neste kodelinje.                         | Kobler eleven kode til dataendringen?                  |
| Undersøke       | Velg inndata som utfordrer en valideringsregel.               | Kan eleven begrunne hva testen undersøker?             |
| Reparere        | Rett én feil og prøv både normaltilfellet og feiltilfellene.  | Løses årsaken samtidig som det som fungerte bevares?   |
| Sette sammen    | Ordne korte kodebiter og fyll inn en betingelse.              | Kan eleven forklare en nødvendig avhengighet?          |
| Sammenligne     | Undersøk to løsninger for lagring eller tilgang.              | Finner eleven en forskjell som påvirker resultatet?    |
| Forklare sammen | Én forklarer feilen, den andre foreslår en test; bytt roller. | Bidrar begge, og endrer de forklaringen ut fra testen? |
| Lage            | Bruk prinsippet i en ny funksjon eller eget prosjekt.         | Kan eleven anvende det med mindre støtte?              |

Velg én eller noen få handlinger som passer målet. Varier mellom aktiviteter. Alle leksjoner skal ikke ende som samme oppgave med dra og slipp. En forklaringsside kan være en nyttig del av et større forløp uten å ha alle aktivitetstypene innebygd.

En egen forklaring er først konstruktiv i ICAP-forstand når eleven tilfører noe utover det som allerede er gitt. Samarbeid er interaktivt i denne betydningen når elevene bygger videre på hverandres bidrag. Et tekstfelt eller en gruppeinndeling sikrer ikke dette alene [S5].

## 3. Progresjon, støtte og elevens styring

Bruk PRIMM som en mulig støtte: **forutsi, kjør, undersøk, endre og lag** [S6]. Fasene kan fordeles over flere sider eller økter, gjentas og tilpasses. Det er ikke et krav om fem knapper eller en fast rekkefølge i alle aktiviteter.

- Gi en overkommelig start med et lite eksempel og nødvendige forkunnskaper.
- La eleven arbeide videre med samme kode eller system der det er hensiktsmessig.
- La eleven styre tempoet, gå tilbake og velge relevante testtilfeller eller hjelp.
- Reduser støtten gradvis, men la hjelp fortsatt være tilgjengelig.
- Avslutt et forløp med en ny anvendelse i en beslektet situasjon eller eget prosjekt. Beskriv oppgaven i læreropplegget dersom den gjøres utenfor nettsiden.

Parsons-oppgaver med kodebiter kan støtte overgangen til egen koding [S7]. Bruk korte oppgaver med tydelig mål. Godta flere gyldige løsninger når det er mulig, og vurder om eleven senere skal fylle inn manglende kode eller skrive selv. Raskere oppgaveløsning betyr ikke nødvendigvis bedre læring.

Eleven skal ikke måtte skrive lange refleksjoner mellom hvert steg. Bruk korte begrunnelser der de faktisk viser noe om forståelsen. Støttebehov skal ikke bli en offentlig merkelapp på eleven.

## 4. Tilbakemeldinger som kan brukes

Gi respons på et tydelig forsøk, et valg eller en kjørt test. Responsen skal hjelpe eleven å forstå utfallet og velge neste handling [S9]. Unngå avbrytelser mens eleven skriver.

| Del                   | Eksempel fra validering                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Hva skjedde?          | En melding med bare mellomrom ble lagt i listen.                                         |
| Hva kan forklare det? | Strengen har tegn før mellomrommene fjernes og slipper derfor gjennom denne sjekken.     |
| Hva kan eleven prøve? | Sammenlign verdien før og etter `trim()`. Prøv både en vanlig melding og bare mellomrom. |

Vis først hva forsøket avdekket. Forklaring og neste steg kan vises direkte eller tilbys som hint, tilpasset oppgaven. Bekreft også faglig riktige valg, for eksempel: «Meldingen ble avvist, og listen er uendret. Lagringen ble ikke kjørt.» Generell ros kan ikke erstatte denne informasjonen.

Hold hovedresponsen kort og konkret, med utdyping ved behov. Forskningen gir ikke én regel om at alle tilbakemeldinger må være umiddelbare, utsatte eller lange.

Et mulig hintforløp er:

1. Pek mot noe eleven kan undersøke.
2. Forklar en relevant sammenheng.
3. Vis et forklart eksempel eller en delvis løsning ved fortsatt behov.

Eleven skal kunne be om hjelp uten poengtrekk. Tilby tydeligere støtte når eleven står fast, og gi et nytt forsøk der hjelpen kan brukes. Antall hint og tidspunktet for tilbud er lokale valg. Ikke tving eleven gjennom en fast spørsmålsrekke eller videre gjetting før hjelp blir tilgjengelig.

## 5. Visualisering og grensesnitt

Bruk også [grunnlaget for webdesign og brukeropplevelse](webdesign-og-brukeropplevelse.md) ved arbeid med grensesnittet. Det utdyper struktur, lesbarhet, interaksjon, tilgjengelighet og brukertesting, mens dette dokumentet styrer læringsmål, elevhandlinger og faglig respons.

Koble handling, aktuell kode, relevante data og resultat tydelig sammen [S8]. Vis hva som endres mellom steg, og plasser forklaringen ved det den gjelder. Eleven skal kunne undersøke en faglig sammenheng, for eksempel verdien i en betingelse eller tidspunktet en liste endres.

For nye og endrede visninger skal vi:

- Vise én tydelig oppgave om gangen og gi oversikt over hele aktiviteten.
- Beholde lesbar tekst, god kontrast og støtte for lyst og mørkt tema gjennom felles stiler.
- Tilby tastaturbetjening, blant annet et alternativ til dra og slipp, og kontrollere mobilvisningen.
- Gjøre utdyping tilgjengelig ved behov og la eleven styre stegvis kjøring.
- Gjøre lyd og ekstra bevegelse valgfrie; faglig informasjon må også være tilgjengelig uten dem.
- Holde viste data, kode og testresultater konsistente. Endres koden, må tidligere testgodkjenning eller gjennomgang tydelig bli utdatert til ny kjøring.

Dette er våre designkrav. Artiklene dokumenterer ikke én optimal tekststørrelse, animasjon eller utforming. At en visualisering virker teknisk, viser heller ikke at eleven lærer av den.

## 6. Gamification skal støtte det faglige arbeidet

Bruk konkrete oppdrag og synlig progresjon. Spillelementene skal gjøre mål, framgang og relevante valg lettere å forstå. Vurder hvert element ut fra funksjonen det har i elevens arbeid, ikke ut fra antallet spillelementer [S1–S4].

Standard for nye læringsaktiviteter:

- Poeng er valgfrie. Knytt dem eventuelt til tydelig beskrevne milepæler, én gang per milepæl.
- Gjentatt kjøring av samme test skal ikke gi nye poeng. Feilforsøk og hint gir ikke poengtrekk.
- Skill opptjente poeng fra om den nåværende løsningen fortsatt består testene.
- Forklar hva progresjonen betyr: utført handling, bestått test eller noe annet. Ikke kall den dokumentert mestring uten grunnlag.
- Hold faglige forklaringer og hjelp tilgjengelige uten krav om poeng.
- Start med personlig progresjon og mulighet for samarbeid. Tidspress, tap av liv og offentlig konkurranse er ikke standard i nye grunnaktiviteter.
- Bruk ikke poeng som karaktergrunnlag eller selvstendig mål på forståelse.

Piloten i Redd chatten bruker fire milepæler à 10 poeng. **40 poeng, tre hintnivåer og seks deler er lokale valg for denne piloten**, ikke generelle forskningsbaserte krav. Nye aktiviteter kan bruke andre modeller eller ingen poeng.

Repoet har allerede blant annet XP, toppliste, fagsjekker med begrensede forsøk og en tidsstyrt utfordring. Dette grunnlaget er ikke en beskjed om å fjerne eller endre dem som del av andre oppgaver. Ved arbeid som berører slike ordninger, vurder den konkrete sammenhengen og skill fri øving fra avgrenset vurdering eller en avtalt utfordring. Dokumenter begrunnede avvik fra standarden kort. Brukerens avklarte oppdrag og prioriteringer styrer omfanget.

## 7. Vurdering og lærerens rolle

Automatisk vurdering passer til observerbare krav: data, tilstand, svar og virkning av en løsning. Vurder funksjonen når det er mulig, og prøv både gyldige tilfeller og relevante feiltilfeller. Riktig HTTP-status er for eksempel ikke nok hvis ugyldige data allerede er lagret.

Skill tydelig mellom:

| Registrering                | Hva den kan vise                                  | Hva den ikke viser alene                             |
| --------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Gjennomført handling        | Eleven har kjørt et forsøk eller skrevet et svar. | At svaret er faglig riktig.                          |
| Bestått funksjonstest       | Løsningen oppfyller kravene for testtilfellene.   | At eleven kan forklare eller løse en ny oppgave.     |
| Forklaring og ny anvendelse | Et grunnlag for å vurdere elevens forståelse.     | Varig eller selvstendig mestring i alle situasjoner. |

Fritekst skal ikke automatisk godkjennes faglig bare fordi den er fylt ut. La eleven sammenligne med kjennetegn eller et begrunnet eksempel, og bruk lærer- eller medelevsamtale der det passer. Egenvurdering skal merkes som egenvurdering.

Et kort lærerfelt eller en veiledning bør beskrive mål, forkunnskaper, vanlige misforståelser, hva læreren kan se etter, og et forslag til oppsummering eller ny oppgave. PRIMM-studien omfatter lærer, dialog og undervisning; nettsiden alene gjenskaper ikke dette tiltaket [S6].

## 8. Utprøving og videre utvikling

Begynn med en avgrenset aktivitet. Prøv den gjerne med 3–5 elever med ulike forkunnskaper før en klasseøkt. Dette antallet er et praktisk forslag for å finne problemer, ikke et tilstrekkelig forskningsdesign for å dokumentere effekt.

Se etter om eleven forstår oppgaven, kan bruke responsen, velger hjelp hensiktsmessig og klarer en beslektet oppgave med mindre støtte. Skill faglige misforståelser fra problemer med grensesnittet. Spør separat om interesse, forståelighet og frustrasjon.

Bruk en kort oppgave før aktiviteten, en ny anvendelse etterpå og gjerne en liten oppgave uten visualisering i en senere time. Bruk sammenlignbare faglige kriterier, og noter hvilken støtte som var tilgjengelig. En før-/ettermåling i én klasse kan vise utvikling, men dokumenterer ikke alene at nettsiden forårsaket den.

Utvid når elevene får brukt tilbakemeldingene og viser forståelse i nye situasjoner. Revider når de gjetter seg til framgang, trenger mye hjelp med grensesnittet eller fullfører uten å kunne forklare. Bruk observasjoner og svar som er relevante for undervisningen; omfattende elevlogging er ikke et krav.

## 9. Sjekkliste før en aktivitet leveres

Bruk relevante punkter for oppgavens omfang. Dokumenter eventuelle bevisste avvik og hva som fortsatt må undersøkes med elever.

- [ ] Relevant læreplan, programfag og kompetansemål er oppgitt, og det er tydelig hvilken del av målet opplegget gir øving i.
- [ ] Målet sier hva eleven skal kunne gjøre eller forklare, og forkunnskapene er synlige.
- [ ] Eleven gjør faglig arbeid som gir et produkt, en begrunnelse eller et resultat som kan undersøkes.
- [ ] Tilbakemeldingen gir informasjon som kan brukes i et nytt forsøk, og hjelp er tilgjengelig.
- [ ] Vurderingen skiller handling, funksjon og forståelse; gyldige alternative løsninger håndteres der det er mulig.
- [ ] Det finnes en ny anvendelse med mindre støtte, i aktiviteten eller læreropplegget.
- [ ] Progresjon og eventuelle belønninger har en tydelig funksjon og forklares riktig.
- [ ] Elevflyten er prøvd med feil, hjelp og nye forsøk, samt relevant tastatur-, mobil- og temabruk.
- [ ] Læreren har nok informasjon til å følge opp, og teknisk kontroll er skilt fra pedagogisk utprøving.

## 10. Kildegrunnlag og begrensninger

Oversikten nedenfor bygger på gjennomgangen av alle ni vedleggene i Word-planen. PDF-sider betyr sidenummer i vedlegget, regnet fra første side; de kan avvike fra trykte sidetall. Flere oversikter kan omfatte de samme primærstudiene. Effekter og deltakerantall skal ikke summeres på tvers av dem. Resultater fra andre aldersgrupper og opplegg kan ikke uten videre overføres til Vg2 IT.

### S1 – Sailer og Homner (2020)

_The Gamification of Learning: A Meta-analysis._ Educational Psychology Review, 32, 77–112. [DOI: 10.1007/s10648-019-09498-w](https://doi.org/10.1007/s10648-019-09498-w).

Metaanalysen finner positive gjennomsnittlige resultater for læring, motivasjon og atferd, med variasjon og ulik robusthet. Den gir ikke en bestemt kombinasjon av poeng, fortelling og konkurranse som passer alle. Vi bruker den til å begrunne utprøving og å skille læring fra aktivitet. Lesesteder: PDF-s. 1, 9 og 24–30.

### S2 – Zhan og medforfattere (2022)

_The effectiveness of gamification in programming education: Evidence from a meta-analysis._ Computers and Education: Artificial Intelligence, 3, 100096. [DOI: 10.1016/j.caeai.2022.100096](https://doi.org/10.1016/j.caeai.2022.100096).

Oversikten rapporterer positive gjennomsnittlige resultater, men også en liten økning i kognitiv belastning og svært stor variasjon mellom studiene. Den inkluderer både spillbasert læring og gamification. Vi prioriterer tydelig støtte og enkel betjening; resultatene rangerer ikke våre mulige grensesnitt. Lesesteder: PDF-s. 1, 3, 5 og 8–9.

### S3 – Li, Hew og Du (2024)

_Gamification enhances student intrinsic motivation, perceptions of autonomy and relatedness, but minimal impact on competency: a meta-analysis and systematic review._ Educational Technology Research and Development, 72, 765–796. [DOI: 10.1007/s11423-023-10337-7](https://doi.org/10.1007/s11423-023-10337-7).

Oversikten finner en liten positiv gjennomsnittlig effekt på indre motivasjon og beskriver utfordringer ved blant annet resultatlister, uklare regler og vanskelighetsgrad. Kompetanse gjelder her opplevd kompetanse, ikke en direkte ferdighetstest. Tydelige mål, meningsfulle valg og hjelp uten poengtrekk er våre designvalg inspirert av disse hensynene. Lesesteder: PDF-s. 1, 8, 18–19 og 22–26.

### S4 – Kurnaz og Koçtürk (2025)

_A Meta-Analysis of Gamification’s Impact on Student Motivation in K-12 Education._ Psychology in the Schools, 62, 4997–5009. [DOI: 10.1002/pits.70056](https://doi.org/10.1002/pits.70056).

Metaanalysen finner en positiv gjennomsnittlig effekt på motivasjon i skoleopplæring, med betydelig variasjon. Varighet og virkningen av enkeltkomponenter er usikre. Den dokumenterer ikke at vår poengsum, lyd eller fortelling forbedrer programmeringsferdigheter. Lesesteder: PDF-s. 1, 3–4 og 7–9.

### S5 – Chi og Wylie (2014)

_The ICAP Framework: Linking Cognitive Engagement to Active Learning Outcomes._ Educational Psychologist, 49(4), 219–243. [DOI: 10.1080/00461520.2014.965823](https://doi.org/10.1080/00461520.2014.965823).

Teoriartikkelen skiller mellom passiv, aktiv, konstruktiv og interaktiv deltakelse. Rammeverket gir en hypotese med vilkår, ikke en universell rangering av oppgaveformater. Vi undersøker elevens faktiske forklaring, løsning og dialog; synlige klikk kan avvike fra tenkningen. Lesesteder: PDF-s. 3–7, 18–21 og 23.

### S6 – Sentance, Waite og Kallia (2019)

_Teaching computer programming with PRIMM: a sociocultural perspective._ Computer Science Education, 29(2–3), 136–176. [DOI: 10.1080/08993408.2019.1608781](https://doi.org/10.1080/08993408.2019.1608781).

Et kvasieksperiment i engelske skoler med elever på 11–14 år fant bedre ettertestresultater i PRIMM-gruppen, med liten effekt. Manglende tilfeldig fordeling og forskjeller fra Vg2 begrenser overføringen. Vi bruker fleksibel progresjon, språk, dialog og lærerens støtte som inspirasjon. Lesesteder: PDF-s. 2, 14–20, 24 og 34–35.

### S7 – Ericson og medforfattere (2022)

_Parsons Problems and Beyond: Systematic Literature Review and Empirical Study Designs._ Proceedings of the 2022 Working Group Reports on Innovation and Technology in Computer Science Education. [DOI: 10.1145/3571785.3574127](https://doi.org/10.1145/3571785.3574127).

Gjennomgangen beskriver støtte til nybegynnere og ofte raskere løsning med kodebiter, men få sterke sammenligninger av læring mot egen koding. Mye av forskningen gjelder høyere utdanning og Python/Java. Vi bruker formatet målrettet og vurderer overgangen til mindre støtte og egen kode. Lesesteder: PDF-s. 5–6, 24, 26–28 og 32.

### S8 – Sorva, Karavirta og Malmi (2013)

_A Review of Generic Program Visualization Systems for Introductory Programming Education._ ACM Transactions on Computing Education, 13(4), artikkel 15. [DOI: 10.1145/2490822](https://doi.org/10.1145/2490822).

Oversikten beskriver visualiseringssystemer, elevens arbeid med dem og eierskap til innholdet. Mange evalueringer gjelder lokale prototyper, og grunnlaget for å rangere deltakelsesformer er begrenset. Vi kobler kode, tilstand og egne tester, og undersøker bruk i et annet program. Lesesteder: PDF-s. 10–12 og 50–54.

### S9 – Wisniewski, Zierer og Hattie (2020)

_The Power of Feedback Revisited: A Meta-Analysis of Educational Feedback Research._ Frontiers in Psychology, 10, artikkel 3087. [DOI: 10.3389/fpsyg.2019.03087](https://doi.org/10.3389/fpsyg.2019.03087).

Metaanalysen viser betydningen av informasjonsinnhold i tilbakemeldinger, med stor variasjon mellom tiltak og kontekster. Den fastsetter ikke optimal tekstlengde eller hintrekkefølge for IT-laben. Vi gir informasjon om resultat, relevante sammenhenger og videre arbeid, og lar eleven bruke den i et nytt forsøk. Lesesteder: PDF-s. 1, 7 og 10–13.

## Endringslogg

- **26. oktober 2026:** Første versjon i repoet, avledet fra den pedagogiske planen og de ni gjennomgåtte artiklene. Prinsippene er gjort operative for senere utvikling; eksisterende aktiviteter og poengordninger endres ikke av denne dokumentasjonsendringen.

- **28. oktober 2026:** Læreplanen ITK02-01 er lagt til som eget faglig grunnlag med uendret PDF, fulltekst og arbeidsveiledning. Koblingen i aktivitetsmalen og sjekklisten supplerer det pedagogiske grunnlaget; tidligere prinsipper og kildedrøftinger beholdes.
