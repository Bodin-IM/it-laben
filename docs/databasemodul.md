# Databaser – fra tabeller til dokumenter

Første runde i utviklingsfaget, Vg2 IT. Modul: `/moduler/databaser/`.
Elevene bør ha sett objekter/lister i JavaScript og vite at frontend og backend har ulike oppgaver. Innføringen forklarer databasebegrepet fra starten; den forutsetter ikke at eleven husker MySQL fra Vg1. Node.js-driveren, `await`, forbindelsen og databaseoperasjonene introduseres med forklart kode.

Modulen starter som **kommende**. Læreren kan gjennomgå innholdet og aktivere modulen fra **Lærerpanel → Undervisning**, i kortet «Databaser – fra tabeller til dokumenter». Før aktivering må elevene ha tilgang til MongoDB for kodeoppgaven. Modulstatus er separat fra lokal øvingsstatus og oppretter ingen poeng eller vurderingsdata.

## Læreplan og avgrensning

Læreplan ITK02-01, programfag **utvikling**. Referansene er lokale, ikke offisielle målkoder.

- **UTV-09:** «modellere og opprette databaser for informasjonsflyt i systemer».
- **UTV-10:** «beskrive ulike datalagringsmodeller og metoder for å hente ut og sette inn bestemte data fra databaser som brukes av andre systemer».
- Støttemål **UTV-08:** «anvende relevant testmiljø og utføre testing tilpasset IT-løsningen som utvikles».

Se [full læreplan](laereplan/ITK02-01.md#utv-09), [læreplangrunnlag](laereplangrunnlag.md), [pedagogisk grunnlag](pedagogisk-grunnlag.md) og [aktivitetsmal](aktivitetsmal.md).

Denne runden introduserer databasebegrepet, dokumentmodellen og metoder for å hente og sette inn bestemte data. Eleven følger data mellom frontend, backend og database, leser et gjennomarbeidet Node.js-eksempel og oppretter en øvingscollection fra et startprosjekt. Dette støtter UTV-09 gjennom en enkel, ferdig modell, UTV-10 gjennom sammenligning av tabell/dokument og konkret `find()`/`insertOne()`, og UTV-08 gjennom testdata og kjøringer i eget øvingsmiljø. Selvstendig modellering, full CRUD, relasjoner, produksjonssikkerhet og systemintegrasjon krever videre arbeid. Runden dekker ikke hele kompetansemålene.

Sikkerhet inngår gjennom egen øvingsdatabase, avgrensede tilganger og tilkoblingshemmeligheter utenfor Git og KI-kontekst. Datasettene er fiktive. Muntlig forklaring, lesing av kode og sammenligning av modeller inngår i arbeidet.

## Forløp og respons

| Del                      | Elevens arbeid                                                                                        | Respons og grunnlag for oppfølging                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Databaser fra grunnen av | Lese kode, følge dataflyt, sammenligne tabell/dokument og forklare tilkobling, henting og innsetting. | Trinnvis kodeforklaring og synlige eksempelresultater. Et åpnet avsnitt er ikke dokumentert læring.     |
| Finn riktig utstyr       | Forutsi, kjøre og reparere tre filtre. Undersøke dokumenter som blir med og faller utenfor.           | Rekonstruert resultat, kontroll per betingelse og sammenligning med prediksjonen. Hint uten poengtrekk. |
| Kod ditt eget register   | Koble Node.js til ekte MongoDB. Skrive egne søk, legge til et fiktivt testdokument og prøve igjen.    | Synlig terminalresultat og testkriterier. Læreren følger opp kode, forklaring og valg av testdata.      |

### Innføring før grunnøvingene

Åtte korte deler vises én om gangen, med nummer, tittel, forrige/neste og direkte kapittelvalg. På smal skjerm erstatter en merket nedtrekksmeny sidemenyen. URL-parameteren `del` gjør det mulig å åpne riktig kapittel igjen, også fra tilbakemeldinger. Bytte med kapittelknapp flytter fokus til den nye overskriften. Valgt del formidles med tekst og `aria-current`, ikke bare farge.

1. **Hva er en database?** Et konkret JavaScript-objekt først; deretter forskjellen på data i minnet, JSON-fil og database, og hvorfor Utstyrsboden trenger varig lagring.
2. **Frontend → backend → database.** En figur med nettleser, server og databaselager. Eleven følger henting eller lagring i fem manuelle hendelser, med koden ved siden av forklaringen. HTTP/JSON mellom frontend og backend skilles fra MongoDB-driveren på serversiden. Diagrammet viser roller, ikke et krav om tre separate maskiner.
3. **Tabell og dokument.** Samme utstyr som tabellrad og dokument; database, collection, dokument, felt og unik `_id`. JSON/BSON og modellforskjeller forklares uten å likestille modellene.
4. **Felter og datatyper.** Tekst, tall og boolsk verdi i kode. Eleven begrunner forskjellen på `true` og `'true'` før en forklaring kan åpnes.
5. **Koble til med kode.** Driver, adresse, `MongoClient`, `connect()`, `db()` og `collection()`, med forklaring til hver kodeform. Driverinstallasjon er ikke installasjon av databaseserver. Tilkoblingsopplysninger holdes på serversiden og utenfor Git.
6. **Hente data.** Fire kjente filtre vises som kode før eleven åpner resultatet. Eksemplene dekker alle dokumenter, kategori, flere betingelser og tomt resultat. Et nytt filter skjuler det gamle resultatet.
7. **Legge inn data.** `insertOne()` vises først, deretter objekt → lagring → ny henting. Seks dokumenter blir sju. Unik ID, duplikatfeil og behov for validering forklares.
8. **Hele kodeeksemplet.** Samme `eksempel.mjs` som i nedlastingen: tilkobling, henting, innsetting, ny henting, feilhåndtering og lukking. Kjørbar før eleven begynner på den mer selvstendige søkeoppgaven.

Eleven skal etter innføringen kunne forklare hva databasen lagrer, hvor operasjonene kjører, hvordan et dokument er bygget opp og hvilke linjer som kobler til, henter og legger inn data. Kode og forklaring vises sammen, og elevstyrte steg avgrenser mengden ny informasjon. Dette er lokale designvalg i tråd med grunnlagenes råd om forkunnskaper, gjennomarbeidede eksempler, segmentering og gradvis mindre støtte. PRIMM-inspirert lesing, forutsigelse og undersøkelse kommer før egen koding. Diagrammet støtter forklaringen; antall gjennomklikkede steg måler ikke forståelse.

Dataflyten og resultatvisningen er forklarte modeller uten databaseforbindelse. Tilbake i lagringseksemplet viser et tidligere stadium; det sletter ikke data. Alle gjennomganger starter med de samme seks dokumentene og påvirker ikke grunnøvingenes datasett. Webkodefragmentene i figuren er uttrykkelig ufullstendige; de er ikke en ferdig Express-app. Det kjørbare terminaleksemplet i del 8 er samlet separat og bruker et ferdig, fiktivt dokument.

Grunnøvingene prøver likhet, implisitt AND og en inkluderende tallgrense (`$lte`) mot seks kjente dokumenter. Menyene bygger ekte, lesbare MongoDB-filtre, men kjøringen er en tydelig merket, avgrenset modell i nettleseren. Ingen `eval`, fri databasekommando eller forbindelse til MongoDB inngår i nettstedet. Modellen simulerer ikke full MongoDB, BSON, arrayer, null/manglende felt, collation eller indekser.

Oppdragene godtar like resultatsett i dette datasettet, også ulike filtre som gir samme resultat. Det er ikke bevis på at filteret uttrykker samme krav for alle mulige data. Derfor legger eleven til egne testdata i kodeoppgaven og forklarer virkningen. Feil prediksjon er formativ og hindrer ikke videre arbeid.

Tre søk som består med nåværende filter, åpner den normale veien til kodeoppgaven. Oppgaveteksten kan åpnes for gjennomgang med lærer uten å fabrikere ferdigstatus. Dette støtter repetisjon, elever som allerede kan stoffet og situasjoner der lokal lagring er blokkert. Dette er en pedagogisk rekkefølge, ikke en tilgangs- eller vurderingsgrense.

## Progresjon og bevaring

Ingen nye XP-regler, fagsjekker eller serverregistrerte karakter-/mestringsdata innføres. Aktivitetene er offentlig øvingsinnhold utenfor serverens progresjonskatalog. Moduler kan nå gruppere teori og praksis i tillegg til eksisterende typer. Bare registrerte aktiviteter telles i den eksisterende serverstatusen; moduler uten slike aktiviteter viser ikke en misvisende 0/0-status.

Filterutkast, siste kjøringsvalg og prediksjoner lagres lokalt med innholdsversjon og profil/øvingsmodus/åpning som omfang. Gjestestatus deles mellom gjester i samme nettleser. Lokal status følger ikke eleven til en annen maskin. Lagringsfeil vises, og øvingen kan fortsatt kjøres. Kjøringsresultat og ferdigstatus beregnes på nytt fra valgene; lagrede «bestått»-flagg stoles ikke på. Endret filter gjør forrige resultat og ferdigstatus utdatert til ny kjøring. Profilbytte rydder visningen og henter bare den nye profilens lokale forsøk.

## Praktisk oppsett og startprosjekt

Eleven trenger Node.js 22+ og MongoDB tilgjengelig fra maskinen som kjører Node. Læreren klargjør en database med avgrenset tilgang per elev/gruppe, eller eleven bruker sin egen lokale MongoDB. Ingen ny MongoDB installeres på IT-labens server av denne endringen. Eksisterende Atlas kan brukes, men det er ikke krav om skykonto.

ZIP-en under `static/ressurser/utstyrsboden-start.zip` inneholder `.env.example`, `.gitignore`, `package.json`, `utstyr.json`, `klargjor.mjs`, `eksempel.mjs`, `finn.mjs` og `LES-MEG.md`. Ingen faktiske tilkoblingsopplysninger følger med. Eleven installerer driveren med `npm install mongodb`. Klargjøringen validerer typer og unike ID-er før den skriver, og bruker `$setOnInsert` med `upsert` for å legge til manglende dokumenter uten å overskrive eller slette eksisterende arbeid. En avbrutt klargjøring kan kjøres igjen.

Etter klargjøring i en ny database kan eleven kjøre `node --env-file=.env eksempel.mjs`. Det viser tre kameraer, legger til Mikrofon Bord med ID M203 og viser tre mikrofoner. Databasen har da sju dokumenter. Gjentatt innsetting gir en forklart duplikatfeil og beholder det eksisterende dokumentet. Dette håndteres også i testkriteriene for den senere kodeoppgaven: de seks startdokumentene må være til stede, og M203 er forventet hvis eksemplet er kjørt. Eksemplet lukker klienten når terminalprogrammet avsluttes; siden forklarer at en webserver normalt gjenbruker klienten mellom forespørsler.

Datasett, øvingsmodell og startkode eies av `src/lib/databaseCourse.js`. Innføringens kapittelmetadata, dataflyt, eksempler og hele `eksempel.mjs` eies av `src/lib/databaseIntro.js`. Siden, labpartnerens servergrunnlag og arkivbyggeren gjenbruker disse kildene. Generer ZIP-en på nytt med `node scripts/build-database-starter.mjs` når datasettet eller startkoden endres. Pakking bruker Python 3 på utviklermaskinen, ikke på elevmaskinen eller under nettsidens bygg. Samme innhold gir samme arkiv. Testen kontrollerer at arkivet samsvarer med kildene.

## Labpartner

Følger [felles kontekstsystem](labpartner-kontekst.md). Tre eksplisitte adaptere har kontraktversjon 1:

- Teori deler én av åtte kjente deler, valgt hente-/lagreflyt og hendelse, kjent søkeeksempel og om resultatet er åpnet, samt innsettingssteget. Backend rekonstruerer det aktuelle offentlige eksemplet. Et uåpnet søkeresultat følger ikke med. Bare kjente enumverdier, boolsk verdi og avgrensede heltall godtas. Kontraktversjon 1 utvides med valgfrie felt med standardverdier, slik at eldre klienter som bare sender `section` fortsatt virker.
- Søkeøvingen deler kjente oppdrags-ID-er, enumverdier for filteret, prediksjon som kjente dokument-ID-er, tidligere kjøringsvalg, valgt dokument, siste navngitte handling og antall åpnede hint. Backend rekonstruerer filter og resultat fra samme modell. Gamle resultater merkes. Bare allerede åpnede hint og undersøkt forklaring følger med.
- Praksis deler bare oppgavesteget. Backend supplerer med oppdrag, startkode på kodesteget og synlige testkriterier på oppsummeringssteget. Modellen får uttrykkelig beskjed om at den ikke ser lokal kode, terminal eller database.

Bytte av teorikapittel, hente-/lagreflyt, oppdrag eller praksissteg tømmer samtalen. Endring av eksempelsteg, filter eller resultat gjør eldre svar utdaterte. Ingen automatisk deling av fritekst, URI, passord, DOM eller rå filer. Elevens eget spørsmål behandles som i resten av labpartneren.

## Overføring og lærerens oppfølging

Vanlige misforståelser: et JavaScript-objekt er allerede lagret; frontend kobler direkte til MongoDB; driverinstallasjon installerer databasen; `db()` henter dokumenter; collection er bare et nytt ord for tabell; NoSQL betyr ingen struktur; `"true"` og `true` er like; filterets flere felt virker som OR; `find()` er allerede en ferdig liste; tomt resultat betyr databasefeil; samme `_id` overskrives av `insertOne()`.

Be eleven plassere `fetch`, `find` og `insertOne` i systemskissen og begrunne det med kode. La eleven peke ut hvilken linje som faktisk lagrer, vise ett treff og ett dokument som faller utenfor, og legge til et nytt dokument som utfordrer en antakelse. Som beslektet oppgave med mindre støtte lager eleven tre fiktive supportsaker, velger felter og søker etter åpne saker med høy prioritet. Vurder forklaring, testing og overføring; antall klikk, prediksjon og automatisk søketest dokumenterer ikke forståelse alene.

Planlagt videre arbeid (tydelig merket som upublisert i modulen): CRUD og validering → Express/Svelte → modellvalg og utlån → ny selvstendig anvendelse. Hver runde veksler mellom avgrenset øving og praktisk kode.

## Kilder

- [MongoDB: datamodellering](https://www.mongodb.com/docs/manual/data-modeling/)
- [MongoDB: skjemavalidering](https://www.mongodb.com/docs/manual/core/schema-validation/)
- [Node.js-driver: hente dokumenter](https://www.mongodb.com/docs/drivers/node/current/crud/query/retrieve/)
- [Node.js-driver: MongoClient og tilkobling](https://www.mongodb.com/docs/drivers/node/current/connect/mongoclient/)
- [Node.js-driver: sette inn dokumenter](https://www.mongodb.com/docs/drivers/node/current/crud/insert/)
- [Node.js: kommandolinje og miljøfiler](https://nodejs.org/api/cli.html#--env-filefile)
- [MongoDB: likhetsoperator](https://www.mongodb.com/docs/manual/reference/operator/query/eq/)
- [Svelte: reaktiv tilstand](https://svelte.dev/docs/svelte/$state)

## Kontroll og elevutprøving

29. oktober 2026, utvidet innføring: Alle 209 tester består, inkludert nye kontroller av eksempelresultater, avgrensede eksempelsteg, bakoverkompatibel KI-kontrakt og samsvar mellom nettsidens kode og ZIP-en. Den kjørbare filen er syntakskontrollert og kjørt mot en kontrollert driverdobbel: henting, innsetting, gjentakelse, forbindelses-/skrivefeil og lukking. Dette er ikke en prøve mot en faktisk MongoDB-server. `npm run check` gir ingen feil eller advarsler, og produksjonsbygget består. Svelte MCP var fortsatt utilgjengelig; offisiell dokumentasjon og prosjektets kontroller ble brukt.

Produksjonsbygget er prøvd med åtte kapitler, direkte kapittellenker, ukjent kapittel, nettleserens tilbake/frem, tastatur og overskriftsfokus. Hente- og lagreflyt, alle fire søkeresultater, skjuling av gammelt resultat, innsettingens seks/sju dokumenter, nedlasting og overgang til de tre eksisterende søkeoppgavene er kontrollert. Et feil søk kunne rettes og alle tre oppdrag fullføres. Fire kontrollerte modellkall bekreftet riktig tilkoblingskode, skjult/vist søkeresultat og valgt lagrehendelse. Kapittelbytte fjernet tidligere samtale, og endret eksempel merket et eldre svar. Ingen XP- eller utstyrs-API-kall ble sendt fra eksemplene. Teorien virket også med utilgjengelig API og blokkert lokal lagring.

De åtte kapitlene ble kontrollert i 48 kombinasjoner av 1440/390/320 CSS-piksler og lyst/mørkt tema, med synlige eksempler i de interaktive delene. Axe fant ingen avvik i de prøvde A/AA-reglene. Ytterligere 16 kontroller ved 320 piksler med 200 % tekst og økt tekst-/ord-/linjeavstand fant ingen horisontal sideoverflyt. Tabellens interne rulleområde kan nås med tastatur. Emulert berøring og mobilens kapittelvalg er prøvd, og figuren er visuelt gjennomgått på desktop og mobil. Nettleserflyten ga ingen registrerte JavaScript-feil. Dette er ikke en full WCAG-revisjon eller prøve med virkelig skjermleser.

Tidligere kontroll av den opprinnelige søke-/praksisrunden:

28. oktober 2026: 195 tester består, inkludert fire nye testgrupper for spørringssemantikk, lagret/utdatert arbeid, KI-kontrakt og startarkiv. Svelte-sjekk har ingen feil eller advarsler, og statisk bygg er bestått. Svelte MCP var ikke tilgjengelig; offisiell dokumentasjon og prosjektets egne kontroller ble brukt.

Nettleserprøven kontrollerte kommende status og læreraktivering, og gjennomførte hele læringsrunden med feilforsøk, feil prediksjon uten sperre, nye filtre, gjenåpning, profilbytte, nedlasting og fire modellkall mot en kontrollert testtjeneste. Tastatur og åtte visningskontroller på 1440, 390 og 320 CSS-piksler, i begge temaer og med 200 % tekst/økt tekstavstand, ga ingen registrerte JavaScript-/hydreringsfeil, relevant axe A/AA-feil eller horisontal siderulling. Prøven uten backend og med blokkert nettleserlagring bestod også. Reaktiv lokal lagring avhenger av faktisk profilomfang, slik at endret forbindelsesstatus ikke nullstiller arbeid. Kode i ZIP-en er syntakskontrollert; faktisk MongoDB-tilkobling er ikke prøvd her.

Kontrollene skal dekke datatype og grenseverdier, gyldige alternativer, utdatert resultat, lokal lagring, avvisning av ugyldig KI-kontekst og samsvar med nedlastingen. Nettleserprøven skal dekke hele veien fra modul til kodeoppgave, mobil, tastatur, tema, forstørrelse, profilbytte og hjelp uten KI.

Teknisk kontroll erstatter ikke elevutprøving. Prøv først med 3–5 elever med ulike forkunnskaper. Undersøk om de kan plassere kodeoperasjonene i frontend/backend/database, skille tilkobling fra henting og innsetting, forklare et tomt resultat og en duplikatfeil, og bruke forklaringen til å rette et filter og lage et eget søk med mindre støtte. Tilkobling til skolens faktiske MongoDB, kvaliteten på lokale Ollama-svar og pedagogisk utprøving må kontrolleres i skolens miljø.
