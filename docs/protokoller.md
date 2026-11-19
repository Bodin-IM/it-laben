# Protokoller – importert modul på dev

Modulen åpnes direkte på `/moduler/protokoller/` under Driftsstøtte. Læreren styrer synlighet med vanlig moduladministrasjon; nye moduler er kommende til læreren åpner dem.

## Kilde og avgrensning

Brukerens App.svelte, protocols.js og style.css er grunnlaget. Fagstoff, rekkefølge, illustrasjoner, pakkesteg, kommandoer, spørsmål, svarforklaringer og praktiske oppgaver er beholdt. protocols.js er kopiert byte for byte. Originalens lokale sidemeny og oppsett er beholdt etter uttrykkelig bestilling. IT-labens hovedmeny arves fra layouten. CSS er avgrenset til komponenten; ekstern fontimport er erstattet med lokal standardskrift. Originalens mørke palett er beholdt i dette utkastet.

Tekniske tilpasninger: importsti, SvelteKit sin historikkfunksjon og felles hopplenke. Modulen gir ikke XP eller serverlagret fremgang. Lokale riktige svar er respons på oppgavene, ikke dokumentasjon på forståelse. Labpartneren har modulens faste metadata, men får ikke elevsvar, fasit eller lokalt animasjonssteg.

## Faglig ramme

Vg2 informasjonsteknologi, ITK02-01, driftsstøtte. Hovedmål DRS-05 (lokal henvisning): «utforske og beskrive relevante nettverksprotokoller, nettverkstjenester og serverroller». Se [læreplanen](laereplan/ITK02-01.md#drs-05).

Eleven undersøker åtte forenklede pakkeforløp, styrer tempoet, leser pakkeopplysninger, prøver kommandoer og svarer på spørsmål med forklaring og nytt forsøk. Dette gir avgrenset øving i protokollenes funksjon og samspill; konfigurering og drift av reelle tjenester må øves praktisk. Forkunnskaper: PC, switch, ruter og enkel IP-adressering. Kjerneelementet løsningsarkitektur og systemutvikling og muntlig bruk av fagterminologi er relevante.

Læreren kan følge opp de opprinnelige praktiske oppgavene ved å be eleven forklare et nytt pakkeforløp uten animasjonen, eksempelvis et DNS-oppslag med cachetreff eller to klienter bak PAT. Be om begrunnelse for neste hopp og hvilke adresser/porter som endres. Ikke endre elevinnholdet som del av importen.

## Kontroll

Import og diff er gjennomgått, og originalens datafil er sammenlignet med kopien. Samlet testing gjenstår før main: testsuite, Svelte-sjekk, bygg og nettleserprøving av alle åtte emner, DNS-modus, animasjon, spørsmålsrespons, nytt forsøk, kopiering, dyplenker, lærerens synlighet, tastatur, smal skjerm og tema. Originalens mørke palett og små etiketter må vurderes ved visuell kontroll. Ingen påstand om dokumentert læringseffekt eller utført elevtesting.
