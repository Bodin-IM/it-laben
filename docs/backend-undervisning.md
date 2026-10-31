# Backend – samlet undervisningsforløp

Dev, 31. oktober 2026. Modulen forberedes for ordinær undervisning fra neste uke. Utprøvingen skjer i timene: vi følger elevenes bruk og justerer etter erfaringene. Det legges ikke inn en separat elevpilot før resten av modulen kan brukes. Teknisk kontroll før publisering består.

Målgruppe: Vg2 informasjonsteknologi. Eleven bygger videre på én Svelte-frontend og én Express-backend med JSON-fillagring. Simulatorene gjør sammenhengene synlige; eget chatprosjekt er stedet eleven anvender dem. Øving 1–4 dekkes gjennom dataflyt, tidligere øvingsark og eget prosjekt; de nummererte simulatorene starter på 5. Modulen er et forløp over flere økter, ikke et krav om å fullføre alt på én uke.

## Mål og avgrensning

Bygger på [pedagogisk grunnlag](pedagogisk-grunnlag.md), [designgrunnlaget](webdesign-og-brukeropplevelse.md), [aktivitetsmalen](aktivitetsmal.md) og [læreplanen ITK02-01](laereplan/ITK02-01.md). DRS-/UTV-numrene er lokale referanser.

Hovedmål i Utvikling:

- **UTV-08:** «anvende relevant testmiljø og utføre testing tilpasset IT-løsningen som utvikles». Eleven velger normal-, feil- og grensetilfeller, undersøker både svar og data, og bruker testene i egen app.
- **UTV-07:** «analysere digitale trusler, verdier og sårbarheter og utvikle applikasjoner med innebygget sikkerhet». Vi undersøker ugyldige requests, forfalsket identitet og endring av andres data. Dette dekker utvalgte sårbarheter og tiltak, ikke en full sikkerhetsanalyse.

Støttemål:

- **UTV-01:** «vurdere fordeler og ulemper ved ulike programmeringsspråk og velge og anvende relevante programmeringsspråk og algoritmer i eget arbeid». Her anvendes JavaScript; sammenligning og valg mellom språk må øves andre steder.
- **UTV-04:** «gjøre rede for hensikten med teknisk dokumentasjon og utarbeide teknisk dokumentasjon for IT-løsninger». README og korte testnotater beskriver oppsett, ruter og faktiske resultater.
- **UTV-05:** «beskrive og anvende relevante versjonskontrollsystemer i utviklingsprosjekter». Elevene bruker Git til å ta vare på fungerende steg; forklaring av versjonskontroll følges opp av læreren.
- **DRS-06, Driftsstøtte:** «planlegge og dokumentere arbeidsprosesser og IT-løsninger». Publisering, omstart og gjenoppretting prøves og dokumenteres i det avtalte testmiljøet.

JSON-filer dekker ikke kompetansemålene om databasemodellering eller databaseforvaltning. Databaseinnholdet er en egen modul. Lesing av kode, muntlig forklaring, feilsøking og utvikling av en fungerende løsning knytter arbeidet til fagets grunnleggende ferdigheter og kjerneelementer.

Forkunnskaper: variabler, strenger, objekter, lister, betingelser og funksjoner. Før lagringsdelen må eleven kunne sende og hente JSON. Før innlogging må eleven kunne følge en request og plassere kontroller før dataendringer. Bruk første del på nytt når dette mangler.

## Arbeidsrekkefølge

Bruk en kort felles gjennomgang, la elevene forutsi ett resultat, og gi deretter god tid til prøving og egen kode. Tidsangivelsene i læreroppleggene gjelder gjennomgangen, ikke hele elevarbeidet. En del kan trenge flere timer.

| Del og aktiviteter | Hva eleven gjør | Bruk i egen chat og tegn på forståelse |
| --- | --- | --- |
| **1. Meldingens reise:** Frontend og backend → To nettlesere, én chat | Forutsier hva POST endrer, sender og henter, prøver feil feltnavn. | Lager POST/GET fra Svelte til Express. Sender fra én nettleser og henter fra en annen. Forklarer hvorfor mottakerens liste ikke oppdateres av seg selv. |
| **2. Lagring og ID:** Fillagring → øving 5 → øving 6 | Sammenligner minne og fil ved omstart, undersøker skrivefeil, endrer og sletter med ID. | Bevarer meldinger ved omstart. To meldinger kan ha lik tekst; bare valgt ID endres. Ved lagringsfeil skal gamle data bevares. |
| **3. Validering:** øving 7 → tekstoppdraget i Redd chatten → eget prosjekt | Forutsier mellomrom etter trim, tester datatype og 500/501, reparerer kontrollen. | Lager visningsnavn med 1–30 tegn etter trim. Viser gyldig og ugyldig request, HTTP-svar og uendrede data ved avvisning. Forklarer kontrollrekkefølgen. |
| **4. Innlogging og tilgang:** Sessions → øving 8 → øving 9 → Chatrom → Redd chatten → Meldingsdetektiven | Skiller brukerfil fra session; prøver som gjest, eier og annen bruker. Feilsøker kontrakt, rom, cookies og doble hendelser. | Lager innlogging og eierskap. Backend bestemmer avsender. Tester falsk eier i body, feil romvisning og sletting av andres meldinger. |
| **5. Publisering og drift:** øving 10 | Sammenligner kildekode, bygg, publisert frontend og kjørende prosess. Undersøker localhost og omstart. | Publiserer i avtalt testmiljø, tester fra annen PC, etter prosess-/VM-omstart og fra en gjenopprettet testkopi. Dokumenterer hva som bevares. |
| **6. Repetisjon og forklaring:** Backend-oppsummering | Bruker responsen til å velge hva som bør repeteres. | Viser én rute fra klikk til svar for en medelev. Medeleven foreslår et nytt feiltilfelle; bytt roller. Nattevakten er valgfri ekstrautfordring. |

Elevene skal kunne komme videre med synlige oppgaver, hint, linjeforklaringer og lærerhjelp. Labpartneren er støtte. Et manglende KI-svar skal ikke stoppe timen. I øving 5–10 kan «Vis meg hvor» peke ut kjente kontroller uten et KI-kall.

Motivasjonen skal komme fra at egen chat får nye evner, tydelige resultater og overkommelige problemer. La eleven velge eksempelmeldinger og tester. Pararbeid veksler mellom den som styrer og den som forklarer eller utfordrer. Behold muligheten til å prøve igjen og åpne hjelp; innfør ikke nye poengtrekk eller krav om ekstra refleksjonsfelt.

## Før første undervisningsøkt

1. Åpne den versjonen som faktisk skal brukes fra skolens nett, med lærerinnlogging og en godkjent test-/øvingsprofil. Kontroller at Backend har riktig modulstatus. Statusen gjelder begge klassene; eksisterende elevresultater endres ikke når en modul aktiveres.
2. Gjør gjeldende øvingsark og chatprosjekt tilgjengelig. Avtal mapper, Node-versjon, pakkefiler og startkommandoer. Hold frontend og backend i hver sin terminal. Prøv GET og POST fra en elevmaskin. Løs oppsettproblemer før fagoppgavene starter.
3. Avtal adresser og porter. Ved separate origins må frontend, CORS og cookies passe sammen. Bruk samme vertsnavn konsekvent; localhost på en annen PC peker til den PC-en. Bruk testdata og eksempelpassord.
4. Prøv én vanlig melding og én avvist melding. Åpne Network og backend-terminalen. Eleven skal finne metode, adresse, status, svar og faktisk dataendring.
5. Avtal hvor elevene lagrer Git-arbeid og korte testnotater. Gjør én praktisk demonstrasjon av at et lagret simulatorresultat og elevens prosjektkode er forskjellige ting.

Frontend-/backend-oppsett og øvingsark på skolen er ikke kjørt i denne dev-gjennomgangen. Hvis PowerShell blokkerer npm.ps1, viser modulinnføringen muligheten for npm.cmd eller Ledetekst. Bruk prosjektets faktiske kommandoer fremfor å anta at alle pakker har samme scripts.

## Begreper og forenklinger som må forklares

| Forskjell mellom eksempler | Forklaring og valg i eget prosjekt |
| --- | --- |
| Sessions/Chatrom viser et brukerobjekt i sessionen; øving 8 viser brukerId. | Begge identifiserer brukeren gjennom serverens session. Velg én variant, og tilpass oppslaget konsekvent. Registrering er ikke automatisk innlogging. |
| Øving 9 bruker eierId; Chatrom bruker avsenderId. | Feltet peker til brukeren på serveren. Bruk konsekvente navn i egen datamodell; ikke kopier feltnavn ukritisk mellom utdrag. |
| Fillagringsinnføringen endrer minnet før skriving; øving 5 forbedrer rekkefølgen. | Den enkle innføringen forutsetter fungerende disk. Bygg videre med ny liste, vellykket lagring og deretter bytte av listen i minnet. |
| Meldingslengde og visningsnavn har ulike grenser. | Gjenbruk prinsippet datatype → trim → lengde → lagring. Test hver grense på begge sider. JavaScripts length teller UTF-16-kodeenheter. |
| En cookie kan finnes etter at sessionen er borte. | Serverens sessionoppslag avgjør innloggingen. Minnebaserte sessions forsvinner ved omstart; brukerfilen består. To vanlige faner deler vanligvis cookies, så bruk separate profiler for to brukere. |
| Et romfilter er ikke tilgangskontroll. | Et offentlig romfilter velger meldinger. Private rom trenger egen serverkontroll av hvem som får lese og skrive. |
| Byggmappe og publisert mappe er ikke kildekoden. | Avtal prosjektets frontendtype. SvelteKit med adapter-static og et vanlig Vite-prosjekt kan ha ulike byggmapper. Følg oppsettet for elevens prosjekt. |

Kodepanelene er avgrensede undervisningsutdrag, ikke komplette serverfiler. JSON-fillagring brukes med én prosess og små datamengder. Passord skal hashes; kontroller på backend, riktig middleware-rekkefølge og øvingsarkets Origin-kontroll må være med. Skolens avtalte testmiljø er ikke en ferdig oppskrift for en offentlig tjeneste; blant annet HTTPS, cookies, sessionlager og innloggingsbegrensning må vurderes ved offentlig drift. Data og hemmeligheter skal ligge utenfor publiserte mapper.

## Fremgang, vurdering og oppfølging i timene

«Gjennomgått» er elevens egen markering. Beståtte oppdragstester dokumenterer de testede kravene. Fagsjekker følger eksisterende regler og ventetid; eleven kan arbeide videre i simulator og eget prosjekt mens et nytt vurderingsforsøk ikke er tilgjengelig. Læreren bruker eksisterende øvingsmodus ved behov. Egen kode vurderes gjennom funksjon, relevante tester og elevens forklaring, med rom for alternative gyldige løsninger.

Modultelleren omfatter 13 kontosporede aktiviteter. Nattevakten er tatt ut av denne telleren og de automatiske anbefalingene fordi den er valgfri. Dens egne resultater og XP beholdes. Oppsummeringen er fri repetisjon uten egen XP-aktivitet. Å følge en lenke, åpne hjelp eller fullføre simulatorsteg gir ingen ny vurdering av forståelse.

Ved slutten av en økt: la eleven vise én fungerende del og ett relevant feiltilfelle, og forklare hva som skjedde. Læreren kan notere korte observasjoner i sitt vanlige opplegg: fant eleven oppgaven, forstod hen responsen, og fikk hen brukt prinsippet i egen kode? Skill grensesnittproblemer fra faglige misforståelser og opplevd mestring. Ikke krev en ekstra administrativ innsending for hver aktivitet.

I en senere time brukes et nytt felt, en annen grense eller en ny rute med mindre hjelp. Det gir et bedre grunnlag for å undersøke overføring enn å gjenta identiske testdata. Samle erfaringer fra vanlig undervisning og prioriter først feil som stopper arbeid, deretter uklare forklaringer og overganger. Elevutprøving og læringseffekt er ennå ikke dokumentert.

## Hva som er endret og kontrollert på dev

- Synlig start og forberedelser i Backend. Prosjektoppgaver er åpne i modulens hoveddeler og sentrale leksjoner; utfyllende kodehjelp kan fortsatt åpnes ved behov.
- Felles neste-/forrige-lenker følger katalogens rekkefølge, inkludert Sessions før øving 8, Chatrom etter øving 9 og øving 10 før oppsummeringen. Valideringsforløpet går via tekstreparasjon og eget prosjekt.
- Alle 19 deloppgaver i øving 5–10 har definerte startvalg. «Still inn første forsøk» fyller dem inn og fjerner forrige kjøring. Oppgavebytte alene overskriver ikke elevens innstillinger. Oppgaveindekser og scenario-ID-er er bevart.
- Fem læreropplegg dekker hele den veiledede rekken, med egne opplegg for validering og publisering. Private lærernotater ligger fortsatt bare på serveren. Eksisterende delankre og modulaliaser består.
- Labpartnerens modulgrunnlag gjenbruker prosjektoppgavene og omtaler Nattevakten som valgfri. Ingen nye elevdata sendes, og labpartneren får ikke tilgang til elevens eksterne kode.
- Den parallelle «Vis meg hvor»-endringen fra dev er flettet inn. Eksisterende frivillig elevtilbakemelding er bevart.

**Avgrensede kontroller:** 50 tester bestod i backendCourse, ovingModel, learningFlow, moduler, backendQuiz og reddChattenPilot. De dekker nye lenker og startvalg, uendret metadata/progresjon, labpartnerens validering og størrelsesgrense, læreroppleggenes rekkefølge, POST/GET, minne/fil, tilgangsmatrise, validering, reparasjonsoppdrag og repetisjon. JavaScript-syntaks og diff er kontrollert. Dette er ikke en full API- eller nettleserprøve.

**Før main:** kjør full testsuite, Svelte-sjekk og produksjonsbygg på den samlede versjonen, og prøv elev-/lærerflyten i nettleseren. SvelteKit-avhengigheter og Svelte MCP er ikke tilgjengelige i dette arbeidsmiljøet; en eksisterende navigasjonstest stoppet ved manglende @sveltejs/kit. Samlet kontroll før main følger repoets dev-arbeidsflyt.

Prøv særlig: direkte lenker og tilbakeknapp, valideringssløyfen, ny og eksisterende konto, gjest, lærer-/øvingsmodus, modulstatus og lagringsfeil, bytte av oppgave og nullstilling, «Vis meg hvor» sammen med startknappen, og veien til egen kode. Kontroller tastaturfokus, 320 px, zoom og lyst/mørkt tema. Sammenlign tidligere resultater og XP. Prøv den faktiske undervisningsadressen fra en elevmaskin før første time.

## Respons på forsøket og hjelp til egen kode – neste dev-leveranse

Brukerbestilt videreføring av strategiens punkt 1 og 2, 31. oktober 2026. Samme målgruppe, forkunnskaper og læreplanavgrensning som ovenfor gjelder. Særlig UTV-08 følges opp ved at eleven bruker et resultat til å velge neste test, og deretter undersøker egen løsning. Endringen i seg selv dokumenterer ikke bedre forståelse eller læringseffekt.

Etter siste kjøringssteg viser alle øvingene 5–10 tre korte deler: **Dette skjedde**, **Derfor** og **Prøv videre**. Responsen kommer fra den fullførte kjøringens data, ikke fra nåværende feltverdier eller en generell påstand om at eleven er ferdig. Den skiller blant annet mellom:

- avvist tekst, skrivefeil og feil ved oppstart; oppstart omtales ikke som et HTTP-svar
- valgt ID og metode i CRUD, lagring og frontendens neste GET
- feil passord, cookie som ikke sendes, utlogging og sessioner som forsvinner ved omstart
- offentlig lesing, innlogging, ukjent ID, feil eier og ugyldig tekst
- HTTP 200 og riktig publisert versjon, feil og rettet API-adresse, og hva backup og omstart bevarer

`exerciseFeedback.js` gjenbruker responsen fra øving 7 og beskriver de øvrige modellene. Modeller, scenarier, vurdering og poengregler er uendret. Oppsummeringen vises bare ved siste steg. Endrede input fjerner den gamle kjøringen som før. Prøv-videre-teksten foreslår en undersøkelse uten å endre elevens valg eller kjøre automatisk.

Prosjektoppgavene i øving 5, 6, 8, 9 og 10 bruker felles metadata i `backendProjectGuides.js`. De viser arbeidssted, første lille endring og konkrete tester. **Hjelp til å bygge videre** åpner forkunnskaper, en kort arbeidsrekkefølge og råd ved vanlige feil. Eleven som allerede har funksjonen, kan gå rett til testene. Filnavnene tilpasses eget prosjekt. Øving 7 beholder visningsnavnoppgaven. Egen kode er fortsatt utenfor IT-labens automatiske vurdering.

Lærerens oppfølging: Be eleven forutsi ett resultat, bruke responsen til å velge neste forsøk og vise tilsvarende kontroll i egen chat. Etterpå kan eleven foreslå en test som ikke er oppgitt i listen. I en senere time brukes en beslektet rute med mindre hjelp, som beskrevet ovenfor. Observer om responsen faktisk brukes, om arbeidsstedet er forståelig og om eleven kommer videre. Dette prøves i ordinære timer.

Labpartnerens eksisterende kontekst gjenbruker prosjektstøtten. Ved siste steg får den også respons beregnet fra de godkjente eksempelverdiene. Kilden merkes som rekonstruerte eksempeldata; tall og tekst er ikke elevens faktiske input. Ingen ny rå fritekst, prosjektkode, forsøksstatus eller klientkontrakt er lagt til.

**Kontroll av denne leveransen:** 46 avgrensede tester bestod i exerciseFeedback, backendCourse, ovingModel og learningFlow, etter retting og ny kjøring av den nye testfilen. De kontrollerer respons for alle valgbare kombinasjoner, konkrete feiltilfeller, uendrede data ved avvisning, koblingen til riktig kjøring, eksisterende validering og labpartnerens kontekstgrense og avgrensede deling. JavaScript-syntaks og diff er kontrollert. Full testsuite, Svelte-sjekk, produksjonsbygg og nettleserprøving gjenstår før main etter repoets arbeidsflyt; Svelte-avhengigheter og MCP er ikke tilgjengelige her. Før publisering må særlig respons ved siste/forrige steg, nytt forsøk, oppgavebytte, prosjektstøttens detaljer, tastatur og smal skjerm prøves i den samlede versjonen.
