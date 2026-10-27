# Grunnlag for webdesign og brukeropplevelse i IT-laben

**Status:** Felles grunnlag, versjon 1.0 · **Dato:** 27. oktober 2026

**Målgruppe:** Lærere, utviklere og KI-agenter som arbeider med IT-laben.

Dette dokumentet supplerer [det pedagogiske grunnlaget](pedagogisk-grunnlag.md). Pedagogikken bestemmer hva eleven skal lære, gjøre og få tilbakemelding på. Dette grunnlaget beskriver hvordan grensesnittet skal gjøre arbeidet forståelig, tilgjengelig og mulig å gjennomføre.

Dokumentet bygger på fire forskningsarbeider, to fagartikler fra Nielsen Norman Group og W3Cs standard og veiledninger. Kildegjennomgangen i del 3 skiller mellom **hva kilden sier**, **hvordan vi bruker det**, og **hva kilden ikke dokumenterer**. Kildekodene U1–U8 holdes atskilt fra S1–S9 i det pedagogiske grunnlaget.

## 1. Slik skal agenter bruke grunnlaget

1. Les dette sammen med det pedagogiske grunnlaget ved arbeid med elevflyt, navigasjon, layout og interaksjon. Bruk [aktivitetsmalen](aktivitetsmal.md) når oppgaven også endrer det pedagogiske opplegget.
2. Undersøk den aktuelle siden, felles komponenter og stiler før du foreslår endringer. Utvikle videre det som fungerer og passer oppdraget.
3. Beskriv kort hvilket brukerproblem endringen skal løse, og hvilke prinsipper som er relevante. Små rettinger trenger ikke en omfattende plan.
4. Bruk kildene med riktig styrke. Et forskningsfunn, et WCAG-kriterium og vårt valg av kortfarge eller tekststørrelse er forskjellige begrunnelser.
5. Kontroller den endrede flyten, og oppgi hva som er teknisk kontrollert og hva som fortsatt trenger utprøving med elever. En agentgjennomgang erstatter ikke en elevtest.
6. Hold arbeidet innenfor det avklarte oppdraget. Grunnlaget er ikke en bestilling på å redesigne andre sider eller endre XP, vurdering eller oppgavelogikk.

**Arbeidsprinsipp:** Gjør det enkelt å finne fram og betjene verktøyet, samtidig som eleven får gjøre det faglige arbeidet. En feilsøkingsoppgave kan med hensikt inneholde feil kode. Navigasjonen, kontrollene og resultatvisningen skal likevel være forståelige.

### Kortversjonen for daglig arbeid

- Vis hvor eleven er, hva hen kan gjøre og hva en handling førte til. [U1, U6]
- Gi innhold et tydelig hierarki. Prioriter dagens oppgave, og gjør øvrig innhold lett å finne. [U3, U6]
- Bevar gjenkjennelige knapper, begreper og mønstre på tvers av fag. [U1, U6]
- Prioriter lesbar tekst og kode; kontroller også mobil, zoom og begge temaer. [U2, U7]
- Gi hjelp, tilbakevei og nye forsøk uten at betjeningen skaper unødvendig arbeid. Følg pedagogikkens rammer for øving og vurdering. [U1, pedagogisk grunnlag]
- Behandle tilgjengelighet som en del av vanlig kvalitet. Relevante funksjoner skal fungere med tastatur, berøring og hjelpemidler. [U5, U7]
- Vurder både hvordan siden oppleves, og om eleven faktisk får utført oppgaven. [U4, U8]
- Skill mellom estetisk inntrykk, brukervennlighet og læring. Ingen av dem dokumenterer automatisk de andre. [U3, U4, U8, pedagogisk grunnlag]

## 2. Samspill med det pedagogiske grunnlaget

Disse avklaringene viderefører særlig del 3–8 i det pedagogiske grunnlaget:

| Situasjon | Konsekvens for utformingen |
| --- | --- |
| Eleven skal tenke selv | Gjør betjeningen tydelig. Behold faglige valg, prediksjoner og undersøkelser som hører til målet. |
| Eleven trenger støtte | Plasser hjelp nær det den forklarer. La utdyping åpnes uten at kode, oppgave eller elevens arbeid forsvinner. |
| Eleven får respons | Skill systemrespons som «Testen kjører» fra faglig respons på resultatet. Rask status betyr ikke at fasit alltid skal vises straks. |
| Eleven følger progresjon | Skill «åpnet», «gjennomført», «bestått test» og vurdert forståelse. Bruk bare status som faktisk finnes i datagrunnlaget. |
| Eleven ser en visualisering | Hold kode, data og resultat i samsvar. En gammel kjøring skal ikke framstå som gyldig etter kodeendringer. |
| Aktiviteten bruker spill | Gi rom for oppdrag, stemning og variasjon, med lesbarhet og tydelige kontroller. Poeng og pynt skal ikke skjule oppgaven. |

Gjenkjenning i grensesnittet betyr for eksempel at «Kjør» ser lik ut fra side til side. Det er ikke en anbefaling om å gjøre alle fagoppgaver til gjenkjenningsspørsmål eller flervalg. Oppgavetype, hint og utfordringsnivå styres av pedagogikken.

## 3. Hva vi tar med fra hver kilde

### U1 – Nielsen: ti heuristikker for brukervennlighet

**Kildetype:** Faglige tommelfingerregler for interaksjonsdesign. Den fullstendige nettartikkelen er brukt; plakaten alene er ikke grunnlaget.

**Hovedinnhold:** Nielsen framhever forståelig status og språk, styring og tilbakeveier, konsistens, forebygging av feil, synlige valgmuligheter, fleksibilitet, relevant innhold, hjelp ved feil og tilgjengelig veiledning. Dette er brede vurderingsprinsipper, ikke en dokumentasjon på læringseffekt.

**Vår anvendelse i IT-laben:**

- Skill «Kjør test», «Vis hint», «Prøv igjen» og «Start på nytt». Handlingene har ulike konsekvenser.
- Vis om et forsøk kjører, er ferdig eller feilet teknisk. Ikke presenter en teknisk feil som et galt elevsvar.
- Bevar elevens inndata ved feil der det er mulig. Gjør tap ved nullstilling tydelig.
- Gi feilmeldinger med en forståelig forklaring og en mulig neste handling. Faglige statuskoder kan vises når de inngår i undervisningen.
- La nødvendige opplysninger være synlige eller enkle å hente fram.

**Avgrensning:** «Enkelt» betyr ikke færrest mulig knapper eller minst mulig fagtekst. Det relevante er om informasjonen hjelper eleven i oppgaven.

**Lesested:** Heuristikk 1–10 i [originalartikkelen](https://www.nngroup.com/articles/ten-usability-heuristics/).

### U2 – Rello, Pielot og Marcos: skriftstørrelse og linjeavstand

**Kildetype og opplegg:** Øyesporingsstudie med 104 deltakere. De leste korte Wikipedia-tekster i Arial på en 17-tommers skjerm. Studien sammenlignet seks skriftstørrelser fra 10 til 26 punkter og fire linjeavstander.

**Hovedfunn:** Større tekst ga bedre resultater på flere mål enn de små størrelsene. Forfatterne anbefalte 18 punkter i sitt oppsett. Gevinsten fortsatte ikke ubegrenset. Linjeavstand ga svakere og mer sammensatte utslag; svært liten og svært stor avstand kunne være uheldig.

**Vår anvendelse i IT-laben:** Prioriter lesbare oppgaver, forklaringer og kode framfor å presse mer inn på skjermen. Bruk skalerbare størrelser og prøv den faktiske kombinasjonen av skrifttype, linjelengde, avstand og skjermbredde. Bevar muligheten til å forstørre innholdet.

**Avgrensning:** Studien fastsetter ikke én optimal størrelse for mobil, kode eller alle skrifttyper. Artikkelens 18 punkter skal ikke gjengis som et forskningskrav om 18 CSS-piksler. Studien undersøker lesing, ikke effekten av IT-labens undervisning.

**Lesested:** PDF-s. 3–5 om opplegget og s. 8–10 om funn, begrensninger og anbefalinger. [Original PDF](https://pielot.org/pubs/Rello2016-Fontsize.pdf) · [DOI](https://doi.org/10.1145/2858036.2858204).

### U3 – Tuch mfl.: visuelt førsteinntrykk

**Kildetype og opplegg:** To eksperimenter med svært kort visning av skjermbilder av virksomhetsnettsteder. Studien undersøker visuell kompleksitet og hvor typisk et nettsted framstår for sin kategori.

**Hovedfunn:** Kombinasjonen av lav visuell kompleksitet og høy prototypiskhet fikk de beste estetiske vurderingene. Resultatene støtter at kjente oppsett og et oversiktlig uttrykk kan være viktige for førsteinntrykket.

**Vår anvendelse i IT-laben:** La fag, moduler, undervisning og aktiviteter være lette å skille og plassere i en sammenheng. Bruk tydelige overskrifter og et begrenset antall konkurrerende framhevinger. Bevar gjenkjennelig navigasjon selv om en aktivitet får et eget visuelt uttrykk.

**Avgrensning:** Deltakerne vurderte skjermbilder; de gjennomførte ikke læringsaktiviteter. Studien dokumenterer verken bedre læring eller at færrest elementer alltid er best. Den isolerer heller ikke effekten av bestemte farger, ikoner eller kortformer. Våre konkrete utformingsvalg må derfor prøves.

**Lesested:** Preprintens PDF-s. 21–24, særlig del 6.4–6.5. [Original preprint hos Google](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/38315.pdf) · [DOI](https://doi.org/10.1016/j.ijhcs.2012.06.003).

### U4 – Tuch mfl.: forholdet mellom estetikk og brukervennlighet

**Kildetype og opplegg:** Laboratoriestudie med 80 deltakere og fire varianter av samme nettbutikk, med ulik estetikk og brukervennlighet.

**Hovedfunn:** I dette forsøket forbedret estetikk ikke opplevd brukervennlighet. Dårlig brukervennlighet reduserte enkelte estetiske vurderinger etter bruk. Resultatene viser hvorfor et førsteinntrykk bør suppleres med vurdering etter at brukeren har løst oppgaver.

**Vår anvendelse i IT-laben:** Ved designgjennomgang skal vi også prøve å finne en modul, åpne en øving, forstå responsen og komme videre. Fjern problemer som uklare handlinger, tapt arbeid og uventede layoutendringer. Spør om utseende og gjennomføring hver for seg.

**Avgrensning:** Resultatene gjelder én nettbutikk, bestemte manipulasjoner og målrettede oppgaver. De viser ikke at estetikk er uviktig. Analysen av følelsesmessig respons gir heller ikke alene sikker dokumentasjon på en årsakskjede.

**Lesested:** Trykte s. 1604–1606, del 5.1–5.4. I vår PDF med biblioteksforside er dette PDF-s. 10–12. [DOI og originalreferanse](https://doi.org/10.1016/j.chb.2012.03.024).

### U5 – Schmutz, Sonderegger og Sauer: tilgjengelighet og brukere uten funksjonsnedsettelser

**Kildetype og opplegg:** Studie med 61 deltakere uten rapporterte synsvansker. Tre varianter av et kommunalt nettsted hadde ulike nivåer av tilgjengelighet etter WCAG 2.0.

**Hovedfunn:** Varianten med høy tilgjengelighet ga bedre oppgaveløsning enn de to andre. Flere brukervurderinger var også gunstigere. Forskjellene var ikke like for alle mål og parvise sammenligninger.

**Vår anvendelse i IT-laben:** Behandle tilgjengelighet som en del av den vanlige kvaliteten: forståelige overskrifter og lenker, god kontrast, feltetiketter og tydelig feilretting. Vurder helheten i elevflyten når slike grep kombineres.

**Avgrensning:** Studien endret flere forhold samtidig og fastsetter ikke effekten av hvert enkelt kriterium. Den undersøkte verken WCAG 2.2, læring eller alle interaktive formater vi bruker. Resultatet gir ikke grunnlag for å love at alle brukere alltid arbeider raskere.

**Lesested:** Artikkelen fra 2016 er lest i forfatterens avhandling fra 2018, kapittel 3.5: trykte s. 18–39 / PDF-s. 23–44. Se særlig metode på s. 24–28 og drøfting på s. 32–36. [Avhandling](https://folia.unifr.ch/unifr/documents/306592) · [Artikkelens DOI](https://doi.org/10.1177/0018720816640962).

### U6 – W3C: tydelig sidestruktur og konsistent design

**Kildetype:** Supplerende veiledning om kognitiv tilgjengelighet. Dette er anbefalinger utover de testbare WCAG-kriteriene.

**Hovedinnhold:** Veiledningen om sidestruktur anbefaler logiske seksjoner, tydelig hierarki og visuelle signaler som viser sammenhenger. Overskrifter, mellomrom, rammer og bakgrunner kan gjøre grupper synlige. Veiledningen advarer også mot rot og overdreven ikonbruk. Veiledningen om konsistens framhever at elementer med samme rolle bør ha gjenkjennelig utseende og plassering, inkludert tilstander og tastaturfokus.

**Vår anvendelse i IT-laben:**

- Vis moduler først på fagsiden, i tråd med den avklarte retningen. Gi modulkort en moderat visuell forskjell og en tydelig tekstlig betegnelse.
- La øvrig undervisning, øvinger og spill være tilgjengelige lenger ned, med forståelige seksjonsnavn.
- Skill en modul som organiserer innhold fra en enkelt aktivitet. Gjør det tydelig hva et kort åpner.
- Bruk felles mønstre for navigasjon, hint og handlinger. Aktivitetenes faglige innhold og arbeidsform kan variere.
- Skill hovedoppgaven fra utdyping uten å skjule nødvendige instruksjoner.

**Avgrensning:** Kildene foreskriver ikke moduler først, blå modulkort eller én bestemt meny. Dette er prosjektvalg. Konsistens betyr ikke at alle aktiviteter må ha samme antall steg eller samme layout.

**Lesesteder:** «What to Do», «How it Helps», «More Details» og «Examples» i [Page Structure](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o2p03-page-structure/) og [Consistent Visual Design](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p03-consistent-design/).

### U7 – WCAG 2.2: testbare krav til tilgjengelighet

**Kildetype:** W3C-standard. Her brukes den daterte anbefalingen fra 12. desember 2024.

**Hovedinnhold:** Kriteriene beskriver tilgjengelighet som kan undersøkes på tvers av teknologier. Nivå AA omfatter både A- og AA-kriteriene. Samsvar gjelder hele sider og komplette prosesser, ikke bare utvalgte knapper.

**Vår anvendelse i IT-laben:** Vi bruker **WCAG 2.2 nivå AA som arbeidsmål** for nye og vesentlig endrede brukerflyter. Del 5 prioriterer kontroller som er særlig relevante for nettstedet. Ved arbeid med andre funksjoner må også øvrige relevante kriterier undersøkes.

**Avgrensning:** Listen i denne filen er ikke en full samsvarsvurdering. At den består, eller at et automatisk verktøy finner null feil, dokumenterer ikke full WCAG-oppfyllelse. Standarden dokumenterer heller ikke læring eller at grensesnittet dekker alle elevers behov. Arbeidsmålet her er et prosjektvalg, ikke en vurdering av hvilke lovkrav som gjelder.

**Lesested:** [WCAG 2.2, datert standard](https://www.w3.org/TR/2024/REC-WCAG22-20241212/), de enkelte kriteriene og kapittel 5 om samsvar.

### U8 – Moran: brukertesting med realistiske oppgaver

**Kildetype:** Fagartikkel om brukertesting. Den fullstendige nettartikkelen er brukt.

**Hovedinnhold:** Representative brukere utfører realistiske oppgaver mens en testleder observerer og lytter. Oppgaveformulering og ledende hjelp kan påvirke resultatet. Kvalitativ testing brukes til å finne problemer; kvantitativ testing kan sammenligne mål som gjennomføring og tid. Artikkelen foreslår fem deltakere som et vanlig utgangspunkt for en liten kvalitativ studie av én brukergruppe.

**Vår anvendelse i IT-laben:** Gjennomfør korte, gjentatte runder. Bruk pedagogikkens forslag om 3–5 elever som et praktisk omfang, med variasjon i forkunnskaper og relevante bruksbehov. Observer hvor de leter, misforstår eller trenger hjelp. Del 6 gir konkrete oppgaver.

**Avgrensning:** Et lite utvalg finner ikke alle problemer og dokumenterer ikke representativitet eller læringseffekt. Flere brukergrupper og særskilte tilgjengelighetsbehov kan kreve egne runder. Elevtesting er en annen kontroll enn agentens egen gjennomgang.

**Lesesteder:** «Elements of Usability Testing» og «Types of Usability Testing» i [originalartikkelen](https://www.nngroup.com/articles/usability-testing-101/).

## 4. Prosjektvalg for utforming

Punktene nedenfor er vår praktiske anvendelse av kildene og tidligere avklaringer. De er ikke direkte forskningsresultater eller en beskrivelse av at alt allerede er implementert.

### 4.1 Struktur og orientering

- La eleven se hvilket fag, hvilken modul og hvilken aktivitet hen er i. Tilby en forståelig vei tilbake.
- Gi kort en tydelig tittel, innholdstype og kort forklaring på hva eleven skal gjøre. Vis omfang eller progresjon bare når opplysningene er pålitelige.
- Behold en synlig oversikt over aktiviteten, samtidig som det aktuelle arbeidet får størst plass. Ikke tving all hjelp, alle resultater og alle kontrollpaneler fram samtidig.
- Bruk funksjonsnavn konsekvent. Skill eksempelvis «Tilbake til modul» fra «Forrige steg» og «Nullstill forsøk».
- Bruk farge sammen med tekst og struktur. En annen kortfarge alene skal ikke forklare forskjellen mellom modul og spill.

**Grunnlag:** U3 og U6. Rekkefølgen på fagsiden følger brukerens avklaring.

### 4.2 Lesbarhet, tema og kode

- Bruk felles komponenter, temavariabler og typografisk skala. Unngå lokale stilvarianter uten en konkret grunn.
- Som utgangspunkt for utprøving kan forklarende brødtekst bruke `1.125rem`, linjehøyde rundt `1.5–1.6` og tekstbredde rundt `65ch`. Dette er foreslåtte lokale startverdier, ikke tall utledet fra U2 eller WCAG. Tilpass etter eksisterende design og faktisk lesing; behold brukerens skriftinnstillinger.
- Kontroller kode, hint, etiketter og feilmeldinger spesielt. Ikke krymp viktig tekst for å få et panel til å passe.
- Bruk normal venstrejustering av lengre norsk tekst. La overskrifter, avsnitt og mellomrom vise strukturen.
- Kode skal kunne leses og markeres som tekst. Marker aktuell linje og endret verdi med mer enn bare farge. Bevar innrykk og logisk sammenheng når visningen tilpasses liten skjerm.
- Kontroller lyst og mørkt tema hver for seg, inkludert syntaksfarger, valgte svar, deaktivert tilstand og fokus.

**Grunnlag:** U2, U6, U7 og det pedagogiske grunnlagets del 5. Tallene over er et utgangspunkt for testing.

### 4.3 Interaksjon og respons

- La knapper ha synlige handlingsnavn. Bruk semantiske kontroller, for eksempel knapper for handlinger og lenker for navigasjon.
- Reserver en stabil plass til respons, eller plasser den slik at viktige kontroller ikke hopper uventet ved klikk. På mobil skal hjelp fortsatt være nær og tilgjengelig.
- Hvis lagring inngår, skill mellom «Lagrer», «Lagret» og «Kunne ikke lagre». Bekreft lagring først når den faktisk er bekreftet.
- Vis en forståelig tomtilstand og en vei videre ved lasting og teknisk feil. Tilby nytt forsøk når funksjonen støtter det.
- La eleven velge tempo ved stegvis kjøring. Skille mellom simulert systemtilstand og faktiske nettverkskall skal være forståelig når forskjellen er relevant.
- Hint og forklaringer må kunne åpnes med berøring og tastatur. En forklaring som bare finnes ved musepeker over kode er utilstrekkelig.
- I flervalgsoppgaver skal alternativene ha likeverdig visuell behandling før svaret vurderes. Korrekt svar skal ikke røpes av farge, ikon eller en annen knappestil.
- Ekstra lyd og bevegelse er valgfrie etter det pedagogiske grunnlaget. Ta hensyn til redusert bevegelse, og behold faglig informasjon også uten animasjon og lyd.

**Grunnlag:** U1, U4, U7 og det pedagogiske grunnlagets del 3–6. Dette er prosjektets anvendelse på egne oppgavetyper.

## 5. Tilgjengelighet som kan kontrolleres

Dette er en prioritert arbeidsliste, ikke hele WCAG. Kriteriehenvisningene peker til den daterte originalstandarden. Les kriteriet og dets unntak når de er relevante; ikke bruk et unntak som en generell fritakelse for en hel side.

| Område | Kontroll i IT-laben | WCAG 2.2 |
| --- | --- | --- |
| Tastatur | Relevante funksjoner kan betjenes uten mus, i logisk rekkefølge og uten tastaturfeller. | [2.1.1](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#keyboard), [2.1.2](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#no-keyboard-trap), [2.4.3](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#focus-order) |
| Fokus | Fokus er synlig. Elementet med fokus er ikke helt skjult av sidens egne overlegg, eksempelvis et fast panel. | [2.4.7](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#focus-visible), [2.4.11](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#focus-not-obscured-minimum) |
| Tekstkontrast | Vanlig tekst har minst 4,5:1 kontrast. Tekst som oppfyller standardens definisjon av stor tekst kan bruke 3:1. Kontroller begge temaer. | [1.4.3](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#contrast-minimum) |
| Farge og grafikk | Farge er ikke eneste signal. Nødvendige visuelle kjennetegn ved kontroller, tilstander og grafikk har normalt minst 3:1 kontrast mot tilstøtende farger. Kriteriets unntak gjelder. | [1.4.1](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#use-of-color), [1.4.11](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#non-text-contrast) |
| Zoom og smal visning | Tekst tåler 200 % forstørring uten tap av innhold eller funksjon. Vertikalt innhold omflytes ved 320 CSS-pikslers bredde uten rulling i to retninger. Unntak for nødvendig todimensjonalt innhold vurderes konkret. | [1.4.4](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#resize-text), [1.4.10](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#reflow) |
| Tekstavstand | Innhold tåler at brukeren setter linjehøyde 1,5, avstand etter avsnitt 2 ganger skriftstørrelsen, bokstavavstand 0,12 em og ordavstand 0,16 em samtidig. Dette er toleransekrav, ikke pålagte standardstiler. | [1.4.12](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#text-spacing) |
| Trykkflater | Pekermål er minst 24 × 24 CSS-piksler, eller oppfyller kriteriets avstandsvilkår eller andre unntak. Som lokalt komfortmål kan sentrale mobilknapper sikte mot 44 × 44; dette er ikke AA-minimumet. | [2.5.8](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#target-size-minimum) |
| Dra og slipp | Tilby betjening med én peker uten dragging, eksempelvis velg og plasser eller flytt opp/ned. Tastaturstøtte må også finnes; den oppfyller ikke alene kravet om et pekeralternativ. | [2.5.7](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#dragging-movements), [2.1.1](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#keyboard) |
| Struktur og navn | Overskrifter og relasjoner er maskinlesbare. Kontroller har navn, rolle og tilstand. Skjemafelt har forståelige etiketter. | [1.3.1](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#info-and-relationships), [3.3.2](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#labels-or-instructions), [4.1.2](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#name-role-value) |
| Feil og status | Identifiser feil i tekst og gi forslag til retting når det er kjent og hensiktsmessig. Relevante statusmeldinger kan formidles av hjelpemidler uten at fokus må flyttes. | [3.3.1](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#error-identification), [3.3.3](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#error-suggestion), [4.1.3](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#status-messages) |
| Hint ved hover/fokus | Ekstra innhold oppfyller kravene til å kunne avvises, holdes åpent og nås med peker, der kriteriet gjelder. Viktig hjelp må dessuten fungere på berøringsskjerm. | [1.4.13](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#content-on-hover-or-focus) |
| Tid og bevegelse | Undersøk tidsgrenser og automatisk bevegelse/oppdatering mot kriteriene for justering, pause, stopp og skjuling. En spillramme gir ikke automatisk unntak. | [2.2.1](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#timing-adjustable), [2.2.2](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#pause-stop-hide) |
| Innlogging | Støtt blant annet innliming og passordhåndtering. Vurder hele innloggingsflyten mot kravet om tilgjengelig autentisering. | [3.3.8](https://www.w3.org/TR/2024/REC-WCAG22-20241212/#accessible-authentication-minimum) |

Ved nytt bilde-, lyd- eller videoinnhold må relevante kriterier om tekstalternativer, teksting og mediealternativer også gjennomgås. Støtte for redusert bevegelse er et lokalt tillegg; det erstatter ikke kontroll av automatisk bevegelse eller blinkende innhold.

## 6. Hvordan vi prøver brukeropplevelsen

### Teknisk gjennomgang

Prøv den endrede flyten på desktop og smal skjerm, med tastatur og begge temaer. Kontroller zoom, kontrast, fokus og relevante meldinger. Prøv også feil, tomtilstand, hjelp og nytt forsøk der disse inngår. Bruk automatiske kontroller som støtte, og suppler med manuell gjennomgang og relevante hjelpemidler.

### Kort utprøving med elever

Velg oppgaver som svarer til det som er endret. Gi målet uten å fortelle hvilken knapp eller meny eleven skal velge. Eksempler:

1. «Finn det du skal starte med i denne modulen.»
2. «Du står fast i øvingen. Finn hjelp og fortsett arbeidet.»
3. «Undersøk hva resultatet av forsøket forteller deg.»
4. «Gå tilbake og finn en annen aktivitet i samme fag.»

Noter om oppgaven ble løst selvstendig, med hjelp eller ikke løst; hvor eleven lette; og hva hen misforsto. Spør etterpå om forventninger og opplevelse. Skill navigasjonsvansker fra faglige misforståelser. Tidsbruk kan hjelpe oss å finne problemer, men kortest mulig tid er ikke målet for læringsarbeidet.

Små runder med 3–5 elever følger det eksisterende pedagogiske grunnlagets praktiske forslag. Utvid ved flere brukergrupper eller behov som ikke ble dekket. Ikke framstill dette som statistisk dokumentasjon.

**Grunnlag:** U4 og U8. Oppgavene og registreringen over er lokale forslag.

## 7. Sjekkliste før levering

Bruk punktene som passer endringen. Dokumenter kort hva som ble prøvd og hva som gjenstår. Dette kommer i tillegg til den pedagogiske sjekklisten og repoets tekniske rutiner.

- [ ] Formålet og den viktigste elevhandlingen er tydelige.
- [ ] Fag, modul, innholdstype og tilbakevei er forståelige der de er relevante.
- [ ] Tekst, kode, hjelp og kontroller er lesbare på aktuell skjermstørrelse og i begge temaer.
- [ ] Betegnelser, kontroller og tilstander følger felles mønstre, med begrunnede tilpasninger.
- [ ] Tastatur, fokus, berøring, zoom og relevante WCAG-kriterier er kontrollert.
- [ ] Lasting, tekniske feil og faglig respons kan skilles fra hverandre.
- [ ] Det er mulig å få hjelp og fortsette uten utilsiktet tap av arbeid.
- [ ] Progresjon, lagring og teststatus beskriver det systemet faktisk vet.
- [ ] Pynt, lyd og bevegelse konkurrerer ikke med nødvendig innhold eller betjening.
- [ ] Påstander om brukervennlighet er skilt fra det som faktisk er observert med elever, og fra påstander om læring.

Et kort leveransenotat kan oppgi: **Endring → brukerproblem → relevant kilde/prinsipp → utført kontroll → gjenstående utprøving.** Bruk det ved vesentlige endringer, ikke som et ekstra skjema for hver liten retting.

## 8. Kilderegister og etterprøvbarhet

Formuleringene i dette dokumentet er norske sammenfatninger og lokale anvendelser, ikke oversettelser av hele artikler. PDF-sider er telt fra filens første side. Sidetallene nedenfor gjelder versjonene i kildesamlingen fra 27. oktober 2026.

| Kode | Referanse og brukt versjon |
| --- | --- |
| U1 | Nielsen, J. (1994; gjennomgått 2024). *10 Usability Heuristics for User Interface Design*. Nielsen Norman Group. [Full nettartikkel](https://www.nngroup.com/articles/ten-usability-heuristics/). Den nedlastede plakaten er et supplement. |
| U2 | Rello, L., Pielot, M. og Marcos, M.-C. (2016). *Make It Big! The Effect of Font Size and Line Spacing on Online Readability*. CHI. [DOI: 10.1145/2858036.2858204](https://doi.org/10.1145/2858036.2858204). Fil: `02_Rello_2016_Make_It_Big.pdf`, 12 sider. |
| U3 | Tuch, A. N., Presslaber, E. E., Stöcklin, M., Opwis, K. og Bargas-Avila, J. A. (2012). *The role of visual complexity and prototypicality regarding first impression of websites: Working towards understanding aesthetic judgments*. International Journal of Human-Computer Studies, 70(11), 794–811. [DOI](https://doi.org/10.1016/j.ijhcs.2012.06.003). Lest som preprint: `03_Tuch_2012_Visual_Complexity.pdf`, 31 sider. |
| U4 | Tuch, A. N., Roth, S. P., Hornbæk, K., Opwis, K. og Bargas-Avila, J. A. (2012). *Is beautiful really usable? Toward understanding the relation between usability, aesthetics, and affect in HCI*. Computers in Human Behavior, 28(5), 1596–1607. [DOI](https://doi.org/10.1016/j.chb.2012.03.024). Fil: `04_Tuch_2012_Is_Beautiful_Really_Usable.pdf`, 13 sider inkludert biblioteksforside. |
| U5 | Schmutz, S., Sonderegger, A. og Sauer, J. (2016). *Implementing Recommendations From Web Accessibility Guidelines: Would They Also Provide Benefits to Nondisabled Users*. Human Factors, 58(4), 611–629. [DOI](https://doi.org/10.1177/0018720816640962). Lest i kap. 3.5 av Schmutz’ avhandling *Disability-Friendly Website Design* (2018): `05_Schmutz_2018_avhandling.pdf`. |
| U6 | W3C WAI (innhold først publisert 2021; eget grensesnitt 2022). *Use a Clear and Understandable Page Structure* og *Use a Consistent Visual Design*. Supplerende veiledning om kognitiv tilgjengelighet. Lenker står ved U6. PDF-kopier: `06a_W3C_Page_Structure.pdf` og `06b_W3C_Consistent_Design.pdf`. |
| U7 | W3C (2024). *Web Content Accessibility Guidelines (WCAG) 2.2*. Recommendation, 12. desember 2024. [Datert original](https://www.w3.org/TR/2024/REC-WCAG22-20241212/). PDF-kopi: `07_WCAG_2_2.pdf`. Bruk kriteriets nummer framfor PDF-side som hovedhenvisning. |
| U8 | Moran, K. (2019; gjennomgått 2026). *Usability (User) Testing 101*. Nielsen Norman Group. [Full nettartikkel](https://www.nngroup.com/articles/usability-testing-101/). Den nedlastede A4-plakaten er et supplement. |

Dette er den operative versjonen i repoet. [AGENTS.md](../AGENTS.md) krever at agenter leser og bruker begge grunnlagsfilene ved relevant arbeid. Det pedagogiske grunnlaget og aktivitetsmalen er gjennomgått sammen med dette dokumentet ved innføringen. Nye beslutninger og revisjoner skal begrunnes her og føres i endringsloggen; endringer i kildesamlingen overføres ikke automatisk.

## Endringslogg

- **27. oktober 2026 – v0.1, forslag:** Første kildebaserte utkast. Skiller originalfunn, veiledning, WCAG-kriterier og prosjektvalg. Supplerer det pedagogiske grunnlaget uten å endre det.
- **27. oktober 2026 – v1.0, tatt i bruk:** Innført som felles grunnlag etter brukerens avklaring. Koblet til agentinstruksjoner, pedagogisk grunnlag og aktivitetsmal. Forskningsfunn og avgrensninger er videreført fra utkastet.
