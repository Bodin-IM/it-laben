# Felles kontekst for labpartneren

Labpartneren er elevstøtte. Den vises ikke på `/laerer` eller `/admin`, heller ikke i hovedmenyen. De tidligere lærer-ID-ene avvises av API-et uavhengig av rolle. Lærere kan bruke labpartneren på vanlige elevsider. Presentasjonsvisningen beholder fraværet av elevverktøy.

## Faglig hensikt

Eleven velger et steg eller gjør et forsøk, ber om et hint og undersøker én endring. Responsen skal knytte fagbegrepet til det aktuelle arbeidet, ikke bare gjenta sidens overskrift. Be eleven forklare årsaken og prøve en beslektet situasjon med mindre støtte for å undersøke forståelse. Klikk, KI-samtale og rapportert kjøring er ikke bevis på læring. Oppgavetester, XP, tidsfrister og vurderingsregler er uendret.

## To lag med kontekst

1. **Faglig grunnlag på serveren:** `partnerPages.js` bygger sidegrunnlag fra innholdskatalogen, modulene og øvingsarkene. `page-context.js` henter mål, rekkefølge, relevante lenker, kode og forklaringer fra de samme kildene som grensesnittet. Det kopierer ikke lærerfasit eller vurderingsinnhold. En modulparameter godtas bare når modulen faktisk inneholder siden.
2. **Avgrenset arbeidsstatus fra fanen:** `PartnerContext.svelte` publiserer navngitte felt i en kanal som eies av layout-instansen. `partnerContext.js` validerer felter og versjon både i nettleseren og på serveren. Statusen sendes først når eleven spør. Det brukes ikke DOM-skraping eller generell logging av tastatur og klikk.

En kanal er lokal for én layout, også ved serverrendering. En komponent som forsvinner, kan bare rydde sin egen publisering. Konto, læringsmodus og åpnet lærerøkt inngår i det lokale omfanget, men konto-ID-er sendes ikke til modellen. Ny side, modul, spilloppdrag eller quizspørsmål tømmer samtalen og avbryter en pågående forespørsel. Andre statusendringer merker tidligere svar som utdaterte. Historikk følger bare med når arbeidsstatusen er den samme.

## Hva sidene deler

| Side                                  | Delt kontekst                                                                             | Avgrensning                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Forside, fag og moduler               | Temaer, mål, forkunnskaper, modulens rekkefølge og elevlenker                             | Ingen søketekst, fremgang eller lærerlenker                                                          |
| Kom i gang, Min lab og toppliste      | Fast hjelp om siden                                                                       | Ingen profil, nøkkel, elevliste eller poengdata                                                      |
| Tutorial | Fast veiledning, valgt eksempel, trim-valg og eventuelt siste kjøring | Bare to kjente eksempeltekster; ingen fri tekst, XP eller lagring. Gamle resultater merkes. |
| Backend                               | GET/POST, kodevisning, valgt linje, tekstegenskaper, steg, status og antall meldinger     | Selve meldingsteksten og avsenderteksten utelates                                                    |
| Chatrom                               | Rom, fiktiv øvingsbruker, kodevalg, steg, status, antall og det separate romlisteforsøket | Ingen meldingsinnhold eller ekte session-ID                                                          |
| Fillagring                            | Operasjon, lagringsvalg, aktiv/valgt linje, fil/minnestatus og antall                     | Ingen filinnhold                                                                                     |
| Sessions                              | Seksjon, trinn, eksperiment, fiktiv profil A/B, cookietilstedeværelse og status           | Ingen cookieverdi, navn eller kontohemmelighet; backendkoden er faglig referanse                     |
| Øving 5–10 og nye ark i `ExerciseLab` | Menyvalg, egenskaper ved tekstfelt, synlig kjøringssteg, kodelinje og åpnet deloppgave    | Backend bruker eksempelverdier til å velge riktig modellgren; råtekst og modellens datadump utelates |
| To nettlesere, én chat                | Oppdrag, kodekort, valgt kodevisning og synlig kjøringssteg                               | Ingen fremtidige steg eller ferdigresultat fra en uferdig visning                                    |
| Meldingsdetektiven                    | Sak, kodevalg, undersøkelse og valgt hendelse fra siste viste kjøring                     | Gamle kjøringer merkes; komplette kontrollsett og fremtidige hendelser utelates                      |
| Redd chatten                          | Eksisterende detaljerte kode-, test- og handlingskontekst, nå også modul                  | Se [pilotbeskrivelsen](labpartner-ki-pilot.md)                                                       |
| Redd chatten-pilot                    | Fase, kodeblokker, valgt eksempelsteg, om test er kjørt og åpnede hint                    | Egen testtekst, refleksjon og selvvurdering utelates; test kjørt betyr ikke bestått                  |
| Backend-oppsummering                  | Gjeldende spørsmål, alternativer, valg og allerede vist respons                           | Riktig svarindeks eller usette alternativforklaringer sendes ikke                                    |
| Nattevakten                           | Arbeidsfase, hendelsesnummer og om økten er uten tidsfrist                                | Ingen scenario, oppgavetekst, elevsvar eller vurderingsfasit; bare generell metodehjelp              |

Fagsjekker har ingen kontekstkobling. Labpartneren får eventuelt grunnlaget for den omkringliggende øvingen, ikke fagsjekkens spørsmål eller svar.

**Databaser:** Teoridelen deler én av åtte kjente deler, hente-/lagreflyt og hendelse, valgt kodeeksempel og om søkeresultatet er åpnet, samt innsettingssteget. Backend bygger konteksten fra felles, offentlige eksempler; uåpnet søkeresultat deles ikke. Kapittel- og flytbytte tømmer samtalen, mens endret eksempelsteg merker eldre svar som utdaterte. Søkeøvingen deler oppdrag, kjente filtervalg, prediksjon, forrige kjøringsvalg og undersøkt dokument; backend rekonstruerer resultatet og merker gamle kjøringer. Praksisdelen deler bare valgt oppgavesteg, uten lokale filer, terminal eller tilkoblingsopplysninger. Se [databasemodulen](databasemodul.md#labpartner).

## Deling og grenser

**VLAN-laben (utkast):** Deler kjent oppdrag, valgt enhet/port, åpne hint, om en test er kjørt/utdatert og revisjonsnummer. Serveren henter mål og teori fra `vlanLab.js`. IP-adresser, VLAN-konfigurasjon og testresultat deles ikke; veilederen får en uttrykkelig begrensning og skal ikke anta at oppsettet er riktig. Se [VLAN-laben](vlan-lab.md). Kontrakttester er skrevet, men samlet kjøring gjenstår før `main`.

Panelets **Dette følger med spørsmålet** beskriver delingen og lar eleven åpne de faktiske statusfeltene. Øvingens fritekst klassifiseres lokalt, for eksempel som tom, bare mellomrom, utfylt eller for lang. Registreringsøvingens passord deles bare som lengdekategori; brukernavn som gyldig/ugyldig. Selvskrevet tekst i **spørsmålet til labpartneren** sendes uendret.

Serveren stoler ikke på klientens titler, kode, instruksjoner eller resultater. Felter må samsvare med den valgte aktivitetstypens skjema. Ukjente felter, ugyldige ID-er, feil versjon, urimelige indekser og for store payloads avvises før modellkallet. Kode og synlige modellsteg rekonstrueres fra kjente kilder når modellen støtter dette. En rapport fra nettleseren er fortsatt ikke et registrert eller faglig godkjent elevforsøk.

- `page-help` bruker protokollversjon 2 og en adapterkontrakt med `version: 1`.
- Arbeidsstatus er begrenset til 6000 UTF-8-byte. Hele innsendelsen har fortsatt 16 KiB-grense.
- Spørsmål har 800 tegn, svar 3000 tegn og historikk høyst to par fra samme status.
- Sidegrunnlag og arbeid begrenses samlet til 22 000 UTF-8-byte. Eldre samtale fjernes først. Et for stort grunnlag avvises, ikke lydløst kuttet midt i et viktig kodeutdrag.
- Gamle klienter kan fortsatt bruke `page-help` versjon 1 som ren sidehjelp. De gamle lærer-ID-ene støttes ikke.
- Redd chatten beholder sin eksisterende versjon 1-protokoll. Valgfri `moduleId` valideres på samme måte som annen modulkontekst.

Ugyldig lokal status stopper KI-spørringen med en synlig melding. Sidehjelp virker fortsatt. Automatisk avspilling må settes på pause eller fullføres før eleven spør; manuelle steg kan undersøkes underveis. Ingen samtale eller arbeidsstatus lagres permanent av denne koblingen.

## Nye moduler, øvinger og leksjoner

**Ny modul:** Registrer den i `moduler.js` med gyldige innholds-ID-er. Mål, forkunnskaper og rekkefølge følger automatisk med. Bruk `moduleLink`/`ModuleContext` slik at tilhørigheten bevares mellom sider.

**Nytt øvingsark i `ExerciseLab`:** Registrer leksjonen i `ovingene.js` og dens modell i `ovingModel.js`, samt den vanlige innholdsruten. Felleskomponenten publiserer status automatisk. Menyfelter får tillatte verdier fra leksjonsmetadataene. Et nytt fritekstfelt må få en eksplisitt klassifiseringsregel i `partnerContext.js` og en tilsvarende eksempelverdi i serverens kontekstbygger. Ikke fall tilbake til å sende teksten. `validatePartnerLessons()` stopper manglende delingsregler tidlig; kontrakttesten går gjennom alle leksjonenes valg og synlige steg.

**Ny aktivitetstype:**

1. Registrer offentlig sidegrunnlag og `kind` i `partnerPages.js`. Sider uten egen adapter har bare fast sidegrunnlag; modellen skal ikke påstå at den ser lokalt arbeid.
2. Definer en strengt avgrenset kontrakt i `readPartnerState`. Bruk kjente ID-er, enumverdier, boolske verdier og begrensede tall. Beskriv hvorfor hvert felt hjelper veiledningen.
3. Publiser fra aktiviteten med `PartnerContext`. Bruk bare klassifisert eller ufølsom status, aldri hele skjema-, konto- eller modellobjekter. Eksempel fra en leksjon:

```svelte
<PartnerContext
	pageId={`oving-${lesson.number}`}
	values={{
		choices: lessonChoices(lesson, values),
		step: current ? index : -1,
		line: current ? selectedLine : -1,
		task: partnerTask
	}}
/>
```

4. Utvid `pageWork` på serveren. Slå opp kjent kildekode og oppgavebeskrivelse, og send bare steget eleven ser. Skill tydelig mellom nåværende valg og en kjøring av tidligere kode. Ikke legg skjulte tester, fremtidige resultater eller fasit i konteksten.
5. Ved et nytt internt oppdrag: ta med en stabil oppdrags-ID i kontrakten og i samtalens `taskKey`, slik at spørsmål fra forrige oppdrag avbrytes. Øk kontraktversjonen ved inkompatible endringer, og oppdater begge sider samtidig.
6. Utvid de samlede kontrakttestene med gyldig status, ugyldige felt og fravær av følsomt innhold. Prøv flyten i nettleser, inkludert sidebytte uten omlasting, feil, nytt forsøk og gammel respons. Unngå tester som bare gjentar implementasjonen.

Gjenbruk kilder. `storageLesson.js`, `sessionLesson.js` og `CHATROOM_LESSONS` er offentlig undervisningsinnhold som nå deles av side og server. Behold pedagogiske instruksjoner og KI-kontekstbygger på serveren.

## Kontroll og videre utprøving

De automatiske kontrollene tester kontrakter, samtlige leksjoners valgbaserte modellgrener, synlige steg, ugyldige felt, skjult innhold, læreravgrensning og isolerte kanaler. Nettleserprøving bruker ekte lokal API med en kontrollert Ollama-testtjeneste, ikke skolens modell. Endelig faglig kontroll av svar, responstid og hjelpens nytte må gjøres på skoleserveren og med elever. En systeminstruksjon alene garanterer ikke gode KI-svar.

Den gjennomførte kontrollen omfatter 169 beståtte tester (tre nye samlede grupper), kodekontroll uten feil/advarsler og vellykket bygging. De elleve labpartnergruppene er også kjørt etter de siste kontraktkontrollene. Nettleserprøven besøkte 21 elevsider/fag-/modulvisninger og fire lærersider, og sendte 33 kontrollerte modellforespørsler. Den prøvde oppdatert steg, historikk, skrevne øvingspassord, modulvalidering, navigering uten omlasting og avbrudd av et ventende svar. Ingen JavaScript-/hydreringsfeil ble registrert.

Panelet ble kontrollert ved 1920, 1440, 390 og 320 CSS-piksler, med begge temaer fordelt på visningene, tastatur/Escape og 200 % tekst med økt tekstavstand. Axe fant ingen relevante WCAG A/AA-avvik i det kontrollerte panelet. Små rettinger lar øvingsarkets lange ord og labpartnerens knapper flyte ved tekstforstørring. Dette er en teknisk kontroll, ikke dokumentasjon på læringseffekt eller en full tilgjengelighetsrevisjon av nettstedet.

Backend-modulen samler de tidligere tre utviklingsmodulene. Gamle modulparametre kan fortsatt leses og peker til Backend. Tutorialens `kind: tutorial` bruker en egen streng kontrakt med kjent omvisningssteg (`all`, `finn`, `les`, `prov`, `hjelp`, `videre`), eksempelvalg og valgene i siste kjøring. Manglende steg fra eldre klienter tolkes som `all`. Serveren henter stegets innhold fra `studentGuide.js` og rekonstruerer det viste resultatet med `tutorialResult`; et utestet valg gir ikke et påstått testresultat.
