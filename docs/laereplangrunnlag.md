# Læreplangrunnlag for Vg2 informasjonsteknologi

Dette er IT-labens arbeidsveiledning for å bruke læreplanen når vi utvikler eller endrer moduler, aktiviteter, undervisning, leksjoner og elevøvinger for Vg2 informasjonsteknologi. Veiledningen er vår anvendelse av læreplanen, ikke en erstatning for den eller en tekst fra Udir.

## Kilde og versjon

- **Læreplan:** Læreplan i vg2 informasjonsteknologi, ITK02-01, bokmål, Utdanningsdirektoratet.
- **Original:** [Vedlagt PDF, uendret](laereplan/ITK02-01.pdf), ni sider. Lagt til i repoet 28. oktober 2026.
- **Lesbar fulltekst:** [Hele læreplanen i Markdown](laereplan/ITK02-01.md), med alle fellesdeler, 33 kompetansemål og vurderingstekster.
- **Offisiell kilde:** [Udir](https://www.udir.no/lk20/ITK02-01). [Gyldighet og innføring](https://www.udir.no/lk20/itk02-01/gyldighet-og-innfoering) ble kontrollert 28. oktober 2026 og oppgir ITK02-01 som gjeldende versjon fra 1. august 2021.

DRS-, BRU- og UTV-referansene i fullteksten er lokale henvisninger til målenes rekkefølge, ikke Udirs offisielle målkoder. Ordlyden og programfaget skal alltid følge med når et mål velges. Henvisningene gjelder denne versjonen; en ny læreplan må gjennomgås før referanser og koblinger oppdateres.

Ved tvil om tekstgjengivelsen kontrolleres originalen. Ved nye læreplanversjoner eller spørsmål om gjeldende regler kontrolleres Udir. Behold eldre versjoner med tydelig merking dersom eksisterende opplegg fortsatt henviser til dem. Ikke endre originaltekst eller målreferanser stille.

## Slik henger grunnlagene sammen

| Grunnlag                                                          | Rolle i utviklingsarbeidet                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [Læreplanen](laereplan/ITK02-01.md)                               | Hva opplæringen skal bidra til: faglig kompetanse, verdier, kjerneelementer, tverrfaglige temaer, ferdigheter og vurdering. |
| [Pedagogisk grunnlag](pedagogisk-grunnlag.md)                     | Hvordan elevhandlinger, progresjon, støtte og tilbakemeldinger utformes.                                                    |
| [Webdesign og brukeropplevelse](webdesign-og-brukeropplevelse.md) | Hvordan innhold og interaksjon gjøres forståelig, tilgjengelig og brukbart.                                                 |
| [Aktivitetsmal](aktivitetsmal.md)                                 | Hvor vi dokumenterer den konkrete koblingen mellom mål, oppgave, respons og lærerens oppfølging.                            |
| [Labpartnerens kontekst](labpartner-kontekst.md)                  | Hvordan godkjent faglig grunnlag og avgrenset arbeidsstatus kan brukes i KI-veiledningen.                                   |

Læreplanen angir ikke at vi skal bruke Svelte, Ollama, JSON-filer, spill, en bestemt modulstruktur eller bestemte poengregler. Dette er lokale valg som må begrunnes faglig. Ved innhold for andre trinn eller utdanningsprogram må riktig læreplan brukes; Vg2-mål skal ikke fremstilles som offisielle mål for Vg1 eller Vg3.

## Arbeidsmåte for agenter og lærere

1. **Les sammenhengen først.** Les læreplanens fellesdeler og kompetansemål med underveis- og standpunktvurdering for de aktuelle programfagene. Et enkelt mål skal ikke tolkes løsrevet fra fagets formål og vurderingstekster.
2. **Velg en avgrenset faglig kobling.** Oppgi læreplankode, programfag og ett eller noen få hovedmål med nøyaktig ordlyd og lokal referanse. Andre mål kan nevnes som støttemål når elevens arbeid faktisk berører dem. Dette antallet er et praktisk valg, ikke et læreplankrav.
3. **Gjør målet konkret.** Beskriv hva eleven skal gjøre, forklare eller produsere i akkurat dette opplegget. Behold betydningen av verb som utforske, planlegge, implementere, vurdere, begrunne og dokumentere. En begrepsquiz kan støtte et praktisk mål, men oppfyller ikke alene hele handlingskravet.
4. **Beskriv omfanget ærlig.** Marker om opplegget introduserer et begrep, gir avgrenset øving eller lar eleven anvende kompetanse i en større oppgave. Skriv hvilken del av målet som øves, og hva som krever annet arbeid. Ikke kall et helt mål dekket bare fordi et nøkkelord finnes i teksten.
5. **Knytt respons til elevens arbeid.** Beskriv hva systemet kan vise, hva eleven kan bruke i neste forsøk, og hva læreren må følge opp gjennom dialog, begrunnelse, dokumentasjon eller en ny situasjon. Bruk [aktivitetsmalen](aktivitetsmal.md).
6. **Se på forløpet samlet.** Fordel mål og ferdigheter mellom undervisning, øving og ny anvendelse i modulen. Beskriv forkunnskaper og videre arbeid. Det er ikke nødvendig at hver liten aktivitet trener alle mål eller alle kjerneelementer.

For nye moduler dokumenteres koblingen i modulens veiledning eller arbeidsplan. For enkeltsider holder det med en kort, konkret beskrivelse i relevant dokumentasjon. Små tekniske rettinger trenger ikke en ny målmatrise. Eksisterende opplegg får måltilknytningen gjennomgått når det er relevant for bestillingen; dette dokumentet påstår ikke at hele IT-laben allerede er kartlagt mot læreplanen.

## Felles deler som skal påvirke oppgavene

Dette avsnittet er en kort arbeidsorientering. Den fullstendige ordlyden står i [læreplanen](laereplan/ITK02-01.md).

- **Verdier og yrkesutøvelse:** Bruk gjenkjennelige arbeidsoppgaver som gir rom for utforsking, selvstendighet, samarbeid og begrunnede etiske valg. Ta brukernes behov på alvor.
- **Kjerneelementer:** Vurder sammenhengen mellom etikk og regelverk, IT-støtte og kommunikasjon, løsningsarkitektur og systemutvikling, informasjonssikkerhet og kreativ problemløsing. Sikkerhet og personvern bør inngå i relevante løsninger fra starten.
- **Tverrfaglige temaer:** Ta opp demokrati og medborgerskap når sikkerhet, algoritmer, informasjonsflyt eller misbruk er relevant. Ta opp bærekraft gjennom livssyklus, ressursbruk, miljøavtrykk og begrunnede teknologivalg der det passer.
- **Grunnleggende ferdigheter:** Gi elevene erfaring med å lese kode, spesifikasjoner og veiledninger; forklare til ulike mottakere; skrive dokumentasjon; regne med tekniske størrelser eller kostnader; og vurdere digitale verktøy, kilder, opphavsrett og personvern.

Disse hensynene skal påvirke oppgaven og responsen, ikke bare legges til som merkelapper.

## Eksempler på presis måltilknytning

Dette er mulige utviklingsgrep, ikke en ferdig vurdering av eksisterende moduler eller elevers kompetanse. Fulltekstlenkene viser målenes ordlyd.

| Eksempel                          | Aktuelle mål                                                                                                           | Konkret elevarbeid og avgrensning                                                                                                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Publisering og drift i Backend    | [DRS-06](laereplan/ITK02-01.md#drs-06), [UTV-08](laereplan/ITK02-01.md#utv-08)                                         | Eleven planlegger og dokumenterer oppstart, tester tjenesten og forklarer feilsøkingen. En simulert omstart er forberedelse; eleven må også arbeide med et relevant faktisk test-/driftsmiljø i forløpet.                                   |
| Feilsøking og brukerveiledning    | [BRU-06](laereplan/ITK02-01.md#bru-06), [BRU-03](laereplan/ITK02-01.md#bru-03), [BRU-05](laereplan/ITK02-01.md#bru-05) | Eleven velger og begrunner en feilsøkingsstrategi, retter feilen og lager en veiledning etter å ha undersøkt mottakerens behov. Det å klikke på et hint alene viser ikke denne kompetansen.                                                 |
| Brukervennlig og sikker tjeneste  | [UTV-02](laereplan/ITK02-01.md#utv-02), [UTV-03](laereplan/ITK02-01.md#utv-03), [UTV-07](laereplan/ITK02-01.md#utv-07) | Eleven undersøker behov, begrunner funksjonelle krav, prøver grensesnittet med en bruker og vurderer relevante trusler og tiltak. En ferdig side uten behovsarbeid eller begrunnelser dekker bare deler av dette.                           |
| Lagring i JSON før databasearbeid | [UTV-09](laereplan/ITK02-01.md#utv-09), [UTV-10](laereplan/ITK02-01.md#utv-10) som videre mål                          | Arbeid med JSON kan forberede forståelse av dataflyt og lagring. Det erstatter ikke å modellere/opprette databaser eller bruke data fra databaser i andre systemer. Nåværende opplegg uten database skal beskrives med denne avgrensningen. |

## Underveisvurdering og samlet kompetanse

Læreplanens underveisvurdering legger vekt på elevmedvirkning, varierte arbeidsoppgaver, dialog, refleksjon over egen utvikling og veiledning som eleven kan bruke videre. Derfor skal nye opplegg gi rom for at eleven forklarer valg, vurderer resultatet og prøver igjen med støtte. Oppgaver kan knytte sammen flere programfag når det er faglig relevant.

Standpunkttekstene retter oppmerksomheten mot samlet kompetanse, varierte måter å vise den på og elevens evne til å planlegge, gjennomføre, vurdere og dokumentere. IT-labens tester, progresjon, XP og KI-svar skal ikke brukes som automatisk dokumentasjon på et helt kompetansemål eller som karaktergrunnlag alene. Læreren må vurdere forståelse, refleksjon, kritisk tenkning og anvendelse i ulike sammenhenger.

Vurderingsordningen er bevart i fullteksten for å beholde hele kilden. Dette grunnlaget endrer ikke poengordninger, fagsjekker, eksamensopplegg eller aktivitetenes vurderingslogikk.

## Bruk sammen med labpartneren

Dette er først og fremst grunnlag for KI som utvikler IT-laben. Nye aktiviteter skal få tydelige faglige mål i sine vanlige metadata og sin veiledning. Labpartneren kan senere gjenbruke relevant godkjent målgrunnlag gjennom den etablerte kontekstbyggeren. Det krever en egen konkret kodeendring; å legge denne dokumentasjonen i repoet sender ikke læreplanen automatisk til Ollama.

Ikke legg hele læreplanen, lærerfasit eller vurderingsopplysninger ved hvert elevspørsmål. Behold prinsippet om relevant, avgrenset faglig kontekst og skillet mellom KI-veiledning og lærerens vurdering.

## Kontroll før levering av nytt innhold

- Er riktig læreplanversjon og programfag oppgitt, med korrekt måltekst?
- Er de konkrete læringsmålene skilt fra de offisielle kompetansemålene?
- Gjør eleven noe som svarer til de valgte verbene og den delen av målet vi sier at opplegget øver?
- Er relevante fellesdeler brukt i utformingen, og er forenklinger og videre arbeid beskrevet?
- Kan responsen brukes til videre læring, og er tegn på forståelse og lærerens oppfølging beskrevet?
- Er teknisk gjennomføring, funksjonstest, egenvurdering og dokumentert forståelse skilt fra hverandre?

Følg også de eksisterende pedagogiske og tekniske kontrollene i [AGENTS.md](../AGENTS.md). Dokumentasjon av måltilknytning er ikke i seg selv dokumentasjon på læringseffekt.
