# Databaser – fra tabeller til dokumenter

Første runde i utviklingsfaget, Vg2 IT. Modul: `/moduler/databaser/`.
Elevene kjenner MySQL fra Vg1 og objekter/lister i JavaScript. Node.js og `await` introduseres med startkode.

Modulen starter som **kommende**. Læreren kan gjennomgå innholdet og aktivere modulen fra **Lærerpanel → Undervisning**, i kortet «Databaser – fra tabeller til dokumenter». Før aktivering må elevene ha tilgang til MongoDB for kodeoppgaven. Modulstatus er separat fra lokal øvingsstatus og oppretter ingen poeng eller vurderingsdata.

## Læreplan og avgrensning

Læreplan ITK02-01, programfag **utvikling**. Referansene er lokale, ikke offisielle målkoder.

- **UTV-09:** «modellere og opprette databaser for informasjonsflyt i systemer».
- **UTV-10:** «beskrive ulike datalagringsmodeller og metoder for å hente ut og sette inn bestemte data fra databaser som brukes av andre systemer».
- Støttemål **UTV-08:** «anvende relevant testmiljø og utføre testing tilpasset IT-løsningen som utvikles».

Se [full læreplan](laereplan/ITK02-01.md#utv-09), [læreplangrunnlag](laereplangrunnlag.md), [pedagogisk grunnlag](pedagogisk-grunnlag.md) og [aktivitetsmal](aktivitetsmal.md).

Denne runden introduserer dokumentmodellen og gir øving i å hente bestemte data. Eleven oppretter en øvingscollection fra et ferdig eksempel og bruker dataene i Node.js. Selvstendig modellering, innsetting fra egen kode, relasjoner og full systemintegrasjon krever videre arbeid. Runden dekker ikke hele kompetansemålene.

Sikkerhet inngår gjennom egen øvingsdatabase, avgrensede tilganger og tilkoblingshemmeligheter utenfor Git og KI-kontekst. Datasettene er fiktive. Muntlig forklaring, lesing av kode og sammenligning av modeller inngår i arbeidet.

## Forløp og respons

| Del                     | Elevens arbeid                                                                                     | Respons og grunnlag for oppfølging                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Fra tabell til dokument | Sammenligne MySQL-tabell og dokument; undersøke felt, typer og filter.                             | Korte forklaringer og felles eksempel. Et åpnet avsnitt er ikke dokumentert læring.                     |
| Finn riktig utstyr      | Forutsi, kjøre og reparere tre filtre. Undersøke dokumenter som blir med og faller utenfor.        | Rekonstruert resultat, kontroll per betingelse og sammenligning med prediksjonen. Hint uten poengtrekk. |
| Kod ditt eget register  | Koble Node.js til ekte MongoDB. Skrive egne søk, legge til et fiktivt testdokument og prøve igjen. | Synlig terminalresultat og testkriterier. Læreren følger opp kode, forklaring og valg av testdata.      |

Grunnøvingene prøver likhet, implisitt AND og en inkluderende tallgrense (`$lte`) mot seks kjente dokumenter. Menyene bygger ekte, lesbare MongoDB-filtre, men kjøringen er en tydelig merket, avgrenset modell i nettleseren. Ingen `eval`, fri databasekommando eller forbindelse til MongoDB inngår i nettstedet. Modellen simulerer ikke full MongoDB, BSON, arrayer, null/manglende felt, collation eller indekser.

Oppdragene godtar like resultatsett i dette datasettet, også ulike filtre som gir samme resultat. Det er ikke bevis på at filteret uttrykker samme krav for alle mulige data. Derfor legger eleven til egne testdata i kodeoppgaven og forklarer virkningen. Feil prediksjon er formativ og hindrer ikke videre arbeid.

Tre søk som består med nåværende filter, åpner den normale veien til kodeoppgaven. Oppgaveteksten kan åpnes for gjennomgang med lærer uten å fabrikere ferdigstatus. Dette støtter repetisjon, elever som allerede kan stoffet og situasjoner der lokal lagring er blokkert. Dette er en pedagogisk rekkefølge, ikke en tilgangs- eller vurderingsgrense.

## Progresjon og bevaring

Ingen nye XP-regler, fagsjekker eller serverregistrerte karakter-/mestringsdata innføres. Aktivitetene er offentlig øvingsinnhold utenfor serverens progresjonskatalog. Moduler kan nå gruppere teori og praksis i tillegg til eksisterende typer. Bare registrerte aktiviteter telles i den eksisterende serverstatusen; moduler uten slike aktiviteter viser ikke en misvisende 0/0-status.

Filterutkast, siste kjøringsvalg og prediksjoner lagres lokalt med innholdsversjon og profil/øvingsmodus/åpning som omfang. Gjestestatus deles mellom gjester i samme nettleser. Lokal status følger ikke eleven til en annen maskin. Lagringsfeil vises, og øvingen kan fortsatt kjøres. Kjøringsresultat og ferdigstatus beregnes på nytt fra valgene; lagrede «bestått»-flagg stoles ikke på. Endret filter gjør forrige resultat og ferdigstatus utdatert til ny kjøring. Profilbytte rydder visningen og henter bare den nye profilens lokale forsøk.

## Praktisk oppsett og startprosjekt

Eleven trenger Node.js 22+ og MongoDB tilgjengelig fra maskinen som kjører Node. Læreren klargjør en database med avgrenset tilgang per elev/gruppe, eller eleven bruker sin egen lokale MongoDB. Ingen ny MongoDB installeres på IT-labens server av denne endringen. Eksisterende Atlas kan brukes, men det er ikke krav om skykonto.

ZIP-en under `static/ressurser/utstyrsboden-start.zip` inneholder `.env.example`, `.gitignore`, `package.json`, `utstyr.json`, `klargjor.mjs`, `finn.mjs` og `LES-MEG.md`. Ingen faktiske tilkoblingsopplysninger følger med. Eleven installerer driveren med `npm install mongodb`. Klargjøringen validerer typer og unike ID-er før den skriver, og bruker `$setOnInsert` med `upsert` for å legge til manglende dokumenter uten å overskrive eller slette eksisterende arbeid. En avbrutt klargjøring kan kjøres igjen.

Kildeinnholdet eies av `src/lib/databaseCourse.js`; generer ZIP-en på nytt med `node scripts/build-database-starter.mjs` når datasettet eller startkoden endres. Pakking bruker Python 3 på utviklermaskinen, ikke på elevmaskinen eller under nettsidens bygg. Samme innhold gir samme arkiv. Testen kontrollerer at arkivet samsvarer med kildene.

## Labpartner

Følger [felles kontekstsystem](labpartner-kontekst.md). Tre eksplisitte adaptere har kontraktversjon 1:

- Teori deler bare hvilket av tre forklaringsavsnitt som er valgt.
- Søkeøvingen deler kjente oppdrags-ID-er, enumverdier for filteret, prediksjon som kjente dokument-ID-er, tidligere kjøringsvalg, valgt dokument, siste navngitte handling og antall åpnede hint. Backend rekonstruerer filter og resultat fra samme modell. Gamle resultater merkes. Bare allerede åpnede hint og undersøkt forklaring følger med.
- Praksis deler bare oppgavesteget. Backend supplerer med oppdrag, startkode på kodesteget og synlige testkriterier på oppsummeringssteget. Modellen får uttrykkelig beskjed om at den ikke ser lokal kode, terminal eller database.

Oppdrags-/praksisstegbytte tømmer samtalen. Endring av filter eller resultat gjør eldre svar utdaterte. Ingen automatisk deling av fritekst, URI, passord, DOM eller rå filer. Elevens eget spørsmål behandles som i resten av labpartneren.

## Overføring og lærerens oppfølging

Vanlige misforståelser: collection er bare et nytt ord for tabell; NoSQL betyr ingen struktur; `"true"` og `true` er like; filterets flere felt virker som OR; `find()` er allerede en ferdig liste; tomt resultat betyr databasefeil.

Be eleven vise ett treff og ett dokument som faller utenfor, forklare betingelsene og legge til et nytt dokument som utfordrer en antakelse. Som beslektet oppgave med mindre støtte lager eleven tre fiktive supportsaker, velger felter og søker etter åpne saker med høy prioritet. Vurder forklaring, testing og overføring; antall klikk, prediksjon og automatisk søketest dokumenterer ikke forståelse alene.

Planlagt videre arbeid (tydelig merket som upublisert i modulen): CRUD og validering → Express/Svelte → modellvalg og utlån → ny selvstendig anvendelse. Hver runde veksler mellom avgrenset øving og praktisk kode.

## Kilder

- [MongoDB: datamodellering](https://www.mongodb.com/docs/manual/data-modeling/)
- [MongoDB: skjemavalidering](https://www.mongodb.com/docs/manual/core/schema-validation/)
- [Node.js-driver: hente dokumenter](https://www.mongodb.com/docs/drivers/node/current/crud/query/retrieve/)
- [MongoDB: likhetsoperator](https://www.mongodb.com/docs/manual/reference/operator/query/eq/)
- [Svelte: reaktiv tilstand](https://svelte.dev/docs/svelte/$state)

## Kontroll og elevutprøving

28. oktober 2026: 195 tester består, inkludert fire nye testgrupper for spørringssemantikk, lagret/utdatert arbeid, KI-kontrakt og startarkiv. Svelte-sjekk har ingen feil eller advarsler, og statisk bygg er bestått. Svelte MCP var ikke tilgjengelig; offisiell dokumentasjon og prosjektets egne kontroller ble brukt.

Nettleserprøven kontrollerte kommende status og læreraktivering, og gjennomførte hele læringsrunden med feilforsøk, feil prediksjon uten sperre, nye filtre, gjenåpning, profilbytte, nedlasting og fire modellkall mot en kontrollert testtjeneste. Tastatur og åtte visningskontroller på 1440, 390 og 320 CSS-piksler, i begge temaer og med 200 % tekst/økt tekstavstand, ga ingen registrerte JavaScript-/hydreringsfeil, relevant axe A/AA-feil eller horisontal siderulling. Prøven uten backend og med blokkert nettleserlagring bestod også. Reaktiv lokal lagring avhenger av faktisk profilomfang, slik at endret forbindelsesstatus ikke nullstiller arbeid. Kode i ZIP-en er syntakskontrollert; faktisk MongoDB-tilkobling er ikke prøvd her.

Kontrollene skal dekke datatype og grenseverdier, gyldige alternativer, utdatert resultat, lokal lagring, avvisning av ugyldig KI-kontekst og samsvar med nedlastingen. Nettleserprøven skal dekke hele veien fra modul til kodeoppgave, mobil, tastatur, tema, forstørrelse, profilbytte og hjelp uten KI.

Teknisk kontroll erstatter ikke elevutprøving. Prøv først med 3–5 elever med ulike forkunnskaper. Undersøk om de kan bruke forklaringen til å rette et filter og lage et eget søk med mindre støtte. Tilkobling til skolens faktiske MongoDB, kvaliteten på lokale Ollama-svar og pedagogisk utprøving må kontrolleres i skolens miljø.
