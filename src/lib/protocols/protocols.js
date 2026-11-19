// Innholdet er laget for undervisning: representativ IPv4-trafikk, ikke pakkefangst.
/** @param {string} title @param {string} from @param {string | string[]} to @param {string} label @param {string} explanation @param {string[]} packet @param {Record<string, unknown>} [extra] */
const step = (title, from, to, label, explanation, packet, extra = {}) => ({ title, from, to, label, explanation, packet, ...extra });
/** @param {string} question @param {string[]} choices @param {number} correct @param {string} explanation */
const q = (question, choices, correct, explanation) => ({ question, choices, correct, explanation });

export const protocols = [
  {
    id: 'arp', name: 'ARP', full: 'Address Resolution Protocol', layer: 'Lenkelag / grenseflaten mot IPv4',
    ports: 'Ingen TCP/UDP-port · EtherType 0x0806', color: '#58d2b3', short: 'Hvem har denne IPv4-adressen?',
    intro: 'På et Ethernet-LAN leveres rammene ved hjelp av MAC-adresser. IP-adressen identifiserer hvilken enhet vi ønsker å nå logisk, mens ARP hjelper oss å finne MAC-adressen til neste hopp.',
    points: [
      'På et Ethernet-LAN leveres hver ramme til en lokal MAC-adresse (eller broadcast/multicast). IP-adresser brukes av nettverkslaget til å angi avsender og endelig IP-mottaker – switchen ruter ikke etter disse.',
      'Tenk første skoledag: Læreren kjenner navnet Ole (IP-adressen), men vet ikke hvem han er. Læreren spør hele klassen: «Hvem er Ole?» Ole rekker opp hånden, og læreren kjenner ham nå igjen (MAC-adressen). En nyttig analogi – ikke en bokstavelig beskrivelse av MAC-adresser.',
      'ARP knytter en IPv4-adresse til en MAC-adresse på samme lokale nettverk (broadcast-domene).',
      'ARP Request er normalt broadcast til FF:FF:FF:FF:FF:FF. Den som eier IP-adressen svarer normalt med unicast.',
      'Oppslag lagres i en ARP-/nabotabell, slik at ny forespørsel ikke trengs for hver pakke.',
      'Skal PC-en nå et annet subnett, slår den opp MAC-adressen til neste hopp, vanligvis standard-gatewayen.',
      'ARP mangler innebygd autentisering. Dynamisk ARP Inspection på kompatible switcher kan beskytte, ofte ved hjelp av DHCP-snooping-data.'
    ],
    nodes: [
      { id: 'a', name: 'PC A', sub: '192.168.1.5', icon: '💻', x: 115, y: 150 },
      { id: 'sw', name: 'Switch', sub: 'Lag 2', icon: '🔀', x: 370, y: 150 },
      { id: 'b', name: 'PC B', sub: '192.168.1.10', icon: '💻', x: 625, y: 100 },
      { id: 'c', name: 'PC C', sub: '192.168.1.20', icon: '💻', x: 625, y: 225 },
      { id: 'd', name: 'PC D', sub: '192.168.1.30', icon: '💻', x: 365, y: 285 }
    ],
    links: [['a','sw'], ['sw','b'], ['sw','c'], ['sw','d']],
    steps: [
      step('PC A mangler oppføring', 'a','a','ARP-cache?', 'PC A vil sende til 192.168.1.10, men finner ingen oppføring i sin ARP-tabell.', ['Oppslag: 192.168.1.10', 'MAC-adresse: ukjent']),
      step('ARP Request via switch', 'a','sw','ARP REQUEST', 'PC A sender en Ethernet-broadcast. Switchen videresender den i aktuell VLAN / broadcast-domene.', ['Ethernet dst: FF:FF:FF:FF:FF:FF', 'Sender IP: 192.168.1.5', 'Sender MAC: 02:00:00:00:00:05', 'Target IP: 192.168.1.10', 'Target MAC: 00:00:00:00:00:00']),
      step('Forespørselen når alle', 'sw',['b','c','d'],'HVEM HAR .10?', 'PC B, C og D mottar broadcast-rammen. Bare PC B har den etterspurte IPv4-adressen.', ['Ethernet: broadcast', 'Spørsmål: Hvem har 192.168.1.10?']),
      step('PC B svarer', 'b','sw','ARP REPLY', 'PC B sender normalt unicast-svar til PC A via switchen.', ['Sender IP: 192.168.1.10', 'Sender MAC: 02:00:00:00:00:10', 'Mottaker IP: 192.168.1.5', 'Mottaker MAC: 02:00:00:00:00:05']),
      step('Svaret når PC A', 'sw','a','ARP REPLY', 'PC A lærer at 192.168.1.10 hører til MAC 02:00:00:00:00:10.', ['ARP-cache:', '192.168.1.10 → 02:00:00:00:00:10']),
      step('Cache brukes ved ny sending', 'a','a','CACHE-TREFF', 'PC A skal kontakte 192.168.1.10 enda en gang. Den finner MAC-adressen i ARP-cache og trenger ikke sende en ny ARP Request.', ['ARP-cache: 192.168.1.10 → 02:00:00:00:00:10', 'Ingen ny broadcast']),
      step('Data sendes som unicast', 'a','b','UNICAST', 'PC A sender en Ethernet-ramme med PC B sin MAC-adresse. Switchen videresender rammen til riktig port. IP-mottakeren er fremdeles 192.168.1.10.', ['IPv4 dst: 192.168.1.10', 'Ethernet dst: 02:00:00:00:00:10'])
    ],
    commands: [{ code: 'arp -a', detail: 'Vis ARP-/nabotabell i Windows.' }, { code: 'arp -d *', detail: 'Slett ARP-oppføringer (typisk administratorrettigheter).'}],
    questions: [
      q('Hvilken MAC-adresse brukes som mottaker for en vanlig ARP Request?', ['MAC-adressen til DNS-serveren', 'FF:FF:FF:FF:FF:FF', '00:00:00:00:00:00'], 1, 'Ethernet-broadcast gjør at alle i samme VLAN kan motta forespørselen.'),
      q('PC A skal nå en server på et annet subnett. Hvilken MAC-adresse trenger PC A vanligvis?', ['Serverens MAC', 'Standard-gatewayens MAC', 'DNS-serverens MAC'], 1, 'På lokalt Ethernet adresseres rammen til neste hopp, normalt gatewayen.'),
      q('Hvorfor har maskinen en ARP-cache?', ['For å lagre HTML-sider', 'For å slippe ARP-forespørsel for hver sending', 'For å kryptere IP-pakker'], 1, 'Tidligere lærte IP/MAC-koblinger gjenbrukes så lenge de er gyldige.')
    ],
    challenge: 'Åpne CMD og kjør «arp -a». Finn en IPv4-adresse og dens MAC-adresse. Hvilke oppføringer tror du er dynamiske? Prøv deretter å forklare hvorfor en ekstern webserver ikke står med sin MAC-adresse i tabellen.'
  },
  {
    id: 'dhcp', name: 'DHCP', full: 'Dynamic Host Configuration Protocol', layer: 'Applikasjonslag / UDP',
    ports: 'UDP 67 (server) / 68 (klient) i DHCPv4', color: '#78aaff', short: 'Hvordan får PC-en IP-innstillinger?',
    intro: 'DHCP kan automatisk gi en klient IP-adresse, subnettmaske, standard-gateway, DNS-servere og leietid. Vi følger en vanlig DHCPv4-oppstart: DORA.',
    points: [
      'DORA står for Discover, Offer, Request, Acknowledge (ACK).',
      'En klient uten IP-adresse bruker typisk 0.0.0.0 som kildeadresse og 255.255.255.255 som kringkastingsmål i starten.',
      'Discover og første Request sendes normalt som broadcast. Offer og ACK kan sendes som broadcast eller unicast avhengig av situasjonen.',
      'DHCP-serveren tilbyr en tidsbegrenset leieavtale; klienten kan fornye den før utløp.',
      'En DHCP-relay på ruteren kan videresende forespørsler til en server på et annet subnett.'
    ],
    nodes: [
      { id: 'a', name: 'Klient', sub: 'Ingen IP ennå', icon: '💻', x: 110, y: 160 },
      { id: 'sw', name: 'Switch', sub: 'VLAN 10', icon: '🔀', x: 365, y: 160 },
      { id: 'b', name: 'DHCP-server', sub: '192.168.1.2', icon: '🖥️', x: 635, y: 80 },
      { id: 'c', name: 'PC B', sub: '192.168.1.20', icon: '💻', x: 635, y: 195 },
      { id: 'd', name: 'PC C', sub: '192.168.1.30', icon: '💻', x: 365, y: 285 }
    ], links: [['a','sw'], ['sw','b'], ['sw','c'], ['sw','d']],
    steps: [
      step('Discover', 'a','sw','DISCOVER', 'Klienten leter etter en DHCP-tjener, vanligvis med broadcast.', ['UDP 68 → 67', 'IP src: 0.0.0.0', 'IP dst: 255.255.255.255', 'DHCPDISCOVER']),
      step('Discover når alle', 'sw',['b','c','d'],'BROADCAST', 'Switchen flommer forespørselen til alle andre porter i samme VLAN. PC B og C mottar den, men det er DHCP-serveren som tilbyr konfigurasjon.', ['Klientens identitet fremgår av DHCP-feltene', 'Forespørsel om konfigurasjon']),
      step('Offer', 'b','a','OFFER', 'Serveren tilbyr en ledig adresse og andre parametre. Svaret kan være broadcast eller unicast.', ['DHCPOFFER', 'Tilbudt IP: 192.168.1.100', 'Maske: 255.255.255.0', 'Gateway: 192.168.1.1', 'DNS: 192.168.1.2']),
      step('Request', 'a',['b','c','d'],'REQUEST / BC', 'Klienten kunngjør vanligvis via broadcast hvilket tilbud og hvilken DHCP-server den velger. Andre klienter i samme LAN kan også motta rammen.', ['DHCPREQUEST', 'Ønsket IP: 192.168.1.100', 'Valgt DHCP-server: 192.168.1.2']),
      step('Acknowledge', 'b','a','ACK', 'Serveren bekrefter leien, og klienten kan konfigurere nettverksgrensesnittet.', ['DHCPACK', 'Leie: eksempelvis 24 timer', 'Tildelt IP: 192.168.1.100'])
    ],
    commands: [{code:'ipconfig /all', detail:'Vis DHCP-aktivert, leietid, DNS, gateway og IP.'},{code:'ipconfig /release',detail:'Frigi IPv4-leie på aktuelle DHCP-grensesnitt.'},{code:'ipconfig /renew',detail:'Be om/forny DHCP-konfigurasjonen.'}],
    questions: [
      q('Hva er korrekt DORA-rekkefølge?', ['Discover → Offer → Request → ACK', 'Discover → Request → Offer → ACK', 'Offer → Discover → ACK → Request'], 0, 'Først finner klienten serveren, mottar tilbud, velger og får bekreftelse.'),
      q('Hvorfor brukes broadcast ofte i starten?', ['Klienten har kanskje ikke IP eller vet ikke hvem serveren er', 'Broadcast gir kryptering', 'For å nå servere på hele internett'], 0, 'En ny klient kjenner ikke nødvendigvis DHCP-serverens adresse.'),
      q('DHCP-serveren ligger i et annet VLAN. Hva trengs ofte?', ['DNS-cache', 'DHCP-relay på ruteren', 'ARP-poisoning'], 1, 'Vanlige broadcasts rutes ikke mellom VLAN; relay hjelper forespørselen frem.')
    ],
    challenge: 'Kjør «ipconfig /all» og finn DHCP-server, IPv4-adresse, nettverksmaske og standard-gateway. Tegn DORA-pakkene, og forklar hvilke deler som kan være broadcast.'
  },
  {
    id: 'dns', name: 'DNS', full: 'Domain Name System', layer: 'Applikasjonslag / UDP, TCP og eventuelt kryptert transport',
    ports: 'Vanlig DNS: UDP/TCP 53 · DoT: 853 · DoH: HTTPS', color: '#d3a2ff', short: 'Hvordan blir et domenenavn til en adresse?',
    intro: 'DNS gjør det mulig å slå opp ressursoppføringer (for eksempel A- eller AAAA-adresser) for domenenavn. Her viser vi et forenklet oppslag når svaret ikke allerede ligger i cache.',
    points: [
      'Klienten kan bruke informasjon fra lokal DNS-cache, hosts-fil og navneoppløser før den spør en DNS-tjener. Eksakt sjekkerekkefølge varierer med system og program.',
      'Den rekursive resolveren spør ved cache-miss typisk DNS-hierarkiet: rot → TLD → autoritativ navnetjener.',
      'Rot- og TLD-servere svarer normalt med henvisninger, ikke selve IP-adressen til nettstedet.',
      'En DNS-utveksling har normalt spørsmål og svar, men én brukerhandling kan utløse mange DNS-meldinger, også A-, AAAA- og CNAME-oppslag.',
      'DNS bruker ofte UDP 53 og kan bruke TCP 53. DNS over HTTPS og DNS over TLS er andre varianter.'
    ],
    nodes: [
      {id:'a',name:'PC',sub:'Klient',icon:'💻',x:68,y:155},
      {id:'gw',name:'Gateway',sub:'LAN',icon:'📡',x:200,y:155},
      {id:'r',name:'Resolver',sub:'8.8.8.8',icon:'🖥️',x:345,y:155},
      {id:'net',name:'Ruter',sub:'Internett',icon:'📡',x:475,y:155},
      {id:'root',name:'Rot',sub:'.',icon:'🌐',x:665,y:50},
      {id:'tld',name:'TLD',sub:'.com',icon:'🌐',x:665,y:155},
      {id:'auth',name:'Autoritativ',sub:'example.com',icon:'🖥️',x:665,y:260}
    ], links: [['a','gw'],['gw','r'],['r','net'],['net','root'],['net','tld'],['net','auth']],
    steps: [
      step('Klienten spør resolver', 'a','r','DNS QUERY', 'Klienten spør 8.8.8.8 etter A-oppføringen for www.example.com. Svaret 192.0.2.80 er en illustrasjonsadresse, ikke et faktisk DNS-svar.', ['Spørsmål: A www.example.com', 'UDP dst port: 53 (vanlig DNS)', 'Transaksjons-ID: 0x1234']),
      step('Resolver → rot', 'r','root','QUERY', 'Resolveren spør en rotserver hvor den finner navnetjenerne for .com.', ['Query: A www.example.com', 'Svar forventes som henvisning']),
      step('Rot → resolver', 'root','r','REFERRAL', 'Rotserveren henviser til TLD-navnetjenere. I praksis har resolveren ofte slik informasjon i cache.', ['Henvisning til .com-navnetjenere']),
      step('Resolver → TLD', 'r','tld','QUERY', 'Resolveren spør en TLD-server om autoritative navnetjenere for example.com.', ['Query: A www.example.com']),
      step('TLD → resolver', 'tld','r','REFERRAL', 'TLD-serveren viser til navnetjenerne som er autoritative for example.com.', ['NS: eksempel-navnetjener']),
      step('Resolver → autoritativ', 'r','auth','QUERY', 'Resolveren ber den autoritative navnetjeneren om selve adresseoppføringen.', ['Query: A www.example.com']),
      step('Autoritativ → resolver', 'auth','r','DNS ANSWER', 'Den autoritative tjeneren returnerer en eksempeladresse og TTL.', ['A: 192.0.2.80', 'TTL: 300 sekunder (eksempel)']),
      step('Resolver → PC', 'r','a','DNS RESPONSE', 'Resolveren videresender svaret til PC-en og kan cache det i henhold til TTL.', ['www.example.com → 192.0.2.80', 'Samme transaksjons-ID som klientspørsmål'])
    ],
    localNodes: [
      {id:'a',name:'Nettleser',sub:'www.example.com',icon:'🌐',x:105,y:155},
      {id:'bc',name:'Nettleser-cache',sub:'Lokal cache',icon:'📚',x:285,y:65},
      {id:'hc',name:'OS / hosts',sub:'Navneoppløser',icon:'💻',x:285,y:235},
      {id:'r',name:'DNS-resolver',sub:'8.8.8.8',icon:'🖥️',x:605,y:155}
    ],
    localLinks: [['a','bc'],['bc','hc'],['hc','r']],
    localSteps: [
      step('Nettleserens egne opplysninger', 'a','bc','CACHE?', 'Nettleseren kan ha en egen hurtigbuffer over tidligere navneoppslag. I eksempelet er det ingen gyldig oppføring.', ['Nettleser-cache: ingen treff']),
      step('OS og hosts-fil', 'bc','hc','LOKALT SØK', 'Systemets navneoppløser kan bruke hosts-fil og lokal DNS-cache. Rekkefølgen mellom disse varierer med system og program. Vi antar her at ingen av dem gir treff.', ['hosts-fil: ingen treff', 'OS DNS-cache: ingen treff']),
      step('DNS-server kontaktes', 'hc','r','DNS QUERY', 'Nå sendes en DNS-forespørsel til konfigurert resolver, her 8.8.8.8. For å levere den på LAN-et brukes MAC-adressen til neste hopp, ofte standard-gatewayen, hentet fra ARP-cache eller via ARP.', ['A www.example.com', 'IP dst: 8.8.8.8', 'UDP dst: 53', 'ARP er ikke en DNS-oppslagsfase']),
      step('Svar til klienten', 'r','a','DNS RESPONSE', 'Resolveren returnerer en A-post. Navnesvaret kan caches til TTL utløper. Deretter kan nettleseren opprette tilkoblingen til nettstedet.', ['Eksempelsvar: 192.0.2.80', 'DNS-cache oppdateres'])
    ],
    commands: [{code:'nslookup example.com',detail:'Utfør et DNS-oppslag.'},{code:'ipconfig /displaydns',detail:'Vis Windows DNS-resolvercache.'},{code:'ipconfig /flushdns',detail:'Tøm Windows DNS-resolvercache.'}],
    questions: [
      q('Hvem gjør vanligvis oppslag mot rot-, TLD- og autoritative servere?', ['Nettleseren direkte i alle tilfeller', 'Den rekursive DNS-resolveren', 'Ethernet-switchen'], 1, 'Den rekursive resolveren utfører oppslaget på vegne av klienten.'),
      q('Hva inneholder et vanlig DNS A-svar?', ['En IPv4-adresse', 'En MAC-adresse', 'En TCP-sekvensverdi'], 0, 'En A-oppføring knytter et navn til en IPv4-adresse.'),
      q('Er DNS alltid nøyaktig to pakker?', ['Ja', 'Nei, et oppslag kan involvere flere servere, spørsmål og svar', 'Ja, men bare på IPv6'], 1, 'Hver forespørsel kan ha svar, men en hel navneoppløsning involverer ofte flere utvekslinger.')
    ],
    challenge: 'Kjør «nslookup example.com». Finn serveren som svarte og IP-adressen(e). Kjør kommandoen på nytt og diskuter hvordan cache kan endre hvem som faktisk må spørres.'
  },
  {
    id: 'ip', name: 'IP', full: 'Internet Protocol', layer: 'Nettverkslag (lag 3)',
    ports: 'Ingen porter i selve IP · IPv4 / IPv6', color: '#ffce76', short: 'Hvordan finner pakker veien gjennom nett?',
    intro: 'IP adresserer og frakter pakker mellom nettverk. Rutere undersøker IP-destinasjonen og velger neste hopp ved hjelp av rutingtabellen.',
    points: [
      'En IPv4-pakke har kilde- og destinasjonsadresse; transportprotokollen (TCP/UDP) angis i feltet Protocol.',
      'Ruteren velger neste hopp basert på lengste prefikstreff i rutingtabellen.',
      'IPv4 TTL reduseres ved hver ruter for å hindre uendelige løkker. IPv6 bruker Hop Limit.',
      'IP er best effort: protokollen garanterer ikke levering, rekkefølge eller at en pakke ikke dupliseres.',
      'En IP-pakke kapsles inn i en ny lenkelagsramme ved hvert hopp; MAC-adressene endres normalt underveis, mens IP-adressene vanligvis består dersom NAT ikke brukes.'
    ],
    nodes: [
      {id:'a',name:'PC A',sub:'203.0.113.10',icon:'💻',x:65,y:155},
      {id:'sw',name:'Switch',sub:'LAN 1',icon:'🔀',x:185,y:155},
      {id:'g',name:'Gateway',sub:'203.0.113.1',icon:'📡',x:305,y:155},
      {id:'r1',name:'Ruter 2',sub:'Internett',icon:'📡',x:430,y:110},
      {id:'r2',name:'Ruter 3',sub:'Internett',icon:'📡',x:545,y:205},
      {id:'b',name:'Server',sub:'198.51.100.20',icon:'🖥️',x:680,y:155}
    ], links:[['a','sw'],['sw','g'],['g','r1'],['r1','r2'],['r2','b']],
    steps:[
      step('IP-pakken opprettes','a','a','IPv4','Avsender lager IP-pakken. Mål-IP ligger utenfor eget /24-subnett; standardruten peker mot gateway.', ['Kilde-IP: 203.0.113.10','Mål-IP: 198.51.100.20','TTL: 64']),
      step('Til gateway via LAN','a','g','NESTE HOPP','PC A kapsler IP-pakken i Ethernet-ramme til gatewayens MAC. Switchen videresender basert på MAC, ikke IP.', ['Ethernet dst: gatewayens MAC','IP dst: 198.51.100.20','TTL: 64']),
      step('Gateway ruter','g','r1','TTL 63','Gateway slår opp destinasjons-IP i rutingtabellen, reduserer TTL og sender pakken i en ny lenkelagsramme.', ['IP dst: 198.51.100.20','TTL: 63']),
      step('Internett-ruter 2','r1','r2','TTL 62','Ruter 2 gjør nytt oppslag etter destinasjons-IP og reduserer TTL. Andre MAC-adresser brukes på denne forbindelsen.', ['IP dst: 198.51.100.20','TTL: 62']),
      step('Internett-ruter 3','r2','b','TTL 61','Ruter 3 velger neste hopp mot serverens nett. Destinasjons-IP er den samme gjennom hele eksempelet; NAT vises separat.', ['IP dst: 198.51.100.20','TTL: 61']),
      step('Svar kan følge annen vei','b','a','SVAR','Serveren sender svar med sin egen kilde-IP. Rutingen i retur bestemmes uavhengig og kan bruke andre rutere.', ['Kilde-IP: 198.51.100.20','Mål-IP: 203.0.113.10','Eksempeladresser fra dokumentasjonsområder (ikke faktiske Internett-ruter)'])
    ],
    commands:[{code:'ipconfig',detail:'Vis IP-informasjon i Windows.'},{code:'route print',detail:'Vis rutingtabellen.'},{code:'tracert example.com',detail:'Undersøk IP-hopp mot en destinasjon.'}],
    questions:[
      q('Hvilket felt ser en ruter normalt på for å velge vei?', ['Destinasjons-IP', 'HTTP-metode', 'Kilde-MAC på fjernserveren'], 0, 'Ruting er basert på IP-destinasjonen og rutingtabellen.'),
      q('Hva skjer med IPv4 TTL ved passering av én ruter?', ['Øker med én', 'Reduseres med minst én', 'Er alltid uendret'], 1, 'TTL reduseres for å begrense hvor lenge en pakke kan sirkulere.'),
      q('Garanterer IP at alle pakker kommer frem?', ['Ja', 'Nei', 'Bare på Wi-Fi'], 1, 'IP er en best-effort-tjeneste.')
    ],
    challenge:'Kjør «route print» og finn standardruten (ofte 0.0.0.0/0). Forklar hvorfor PC-en sender til gatewayen når destinasjonen ligger utenfor eget subnett.'
  },
  {
    id: 'tcp', name: 'TCP', full: 'Transmission Control Protocol', layer: 'Transportlag (lag 4)',
    ports: 'Portnummer 0–65535 · eksempel TCP 443', color: '#fd9b85', short: 'Pålitelig og ordnet transport',
    intro: 'TCP tilbyr en pålitelig, ordnet bytestrøm mellom to endepunkter. Vi viser etablering av forbindelse, dataoverføring og en forenklet retransmisjon.',
    points:[
      'En TCP-forbindelse etableres vanligvis med SYN → SYN-ACK → ACK (three-way handshake).',
      'Sekvensnumre, ACK og retransmisjon hjelper mottakeren å få data i riktig rekkefølge uten hull.',
      'TCP bruker flytkontroll (mottakervindu) og overbelastningskontroll.',
      'Portnummer identifiserer tjenesten og hjelper operativsystemet å skille forbindelser.',
      'TCP er en bytestrøm og bevarer ikke applikasjonens meldingsgrenser.'
    ],
    nodes:[
      {id:'a',name:'Klient',sub:'TCP 51514',icon:'💻',x:75,y:155},
      {id:'g',name:'Gateway',sub:'LAN',icon:'📡',x:235,y:155},
      {id:'r1',name:'Ruter 2',sub:'Internett',icon:'📡',x:405,y:105},
      {id:'r2',name:'Ruter 3',sub:'Internett',icon:'📡',x:530,y:210},
      {id:'b',name:'Webserver',sub:'TCP 443',icon:'🖥️',x:680,y:155}
    ], links:[['a','g'],['g','r1'],['r1','r2'],['r2','b']],
    steps:[
      step('SYN','a','b','SYN','Klienten ber om å opprette forbindelse. Segmentet går gjennom flere IP-rutere.', ['TCP 51514 → 443','Flags: SYN','SEQ: 1000 (eksempel)']),
      step('SYN-ACK','b','a','SYN + ACK','Serveren bekrefter SYN og sender sitt eget SYN.', ['Flags: SYN, ACK','SEQ: 5000','ACK: 1001']),
      step('ACK','a','b','ACK','Klienten bekrefter serverens SYN. Forbindelsen er etablert.', ['Flags: ACK','SEQ: 1001','ACK: 5001']),
      step('Data','a','b','DATA','Klienten sender 100 byte fra bytestrømmen.', ['Payload: 100 byte','SEQ: 1001','ACK: 5001']),
      step('Datasegment går tapt','a','r1','TAP','Vi illustrerer et datasegment som går tapt i nettet. TCP kan oppdage tap og retransmittere.', ['SEQ: 1101','Payload: 100 byte','Mottaker får ikke dette segmentet']),
      step('Retransmisjon','a','b','RETRANSMIT','Ved tap sender TCP de manglende bytene på nytt.', ['SEQ: 1101','Payload: 100 byte']),
      step('Bekreftelse','b','a','ACK','Serveren bekrefter neste byte den forventer.', ['ACK: 1201'])
    ],
    commands:[{code:'netstat -ano -p tcp',detail:'Vis TCP-forbindelser og lyttende porter.'},{code:'Test-NetConnection example.com -Port 443',detail:'Kjør i PowerShell for å teste TCP-tilgang.'}],
    questions:[
      q('Hvilken rekkefølge har TCP-handshaken?', ['ACK → SYN → FIN', 'SYN → SYN-ACK → ACK', 'SYN → DATA → FIN'], 1, 'Treveis håndtrykk oppretter en TCP-forbindelse.'),
      q('Hva brukes sekvensnummer og ACK hovedsakelig til?', ['Ordnet og pålitelig dataoverføring', 'Å slå opp domenenavn', 'Å finne MAC-adresser'], 0, 'TCP kan registrere manglende byte og bevirke retransmisjon.'),
      q('Bevarer TCP grensene mellom to send-kall?', ['Ja, alltid', 'Nei, det er en bytestrøm', 'Bare ved port 80'], 1, 'Applikasjonen må selv vite hvordan meldinger avgrenses.')
    ],
    challenge:'Kjør «netstat -ano -p tcp». Finn en etablert forbindelse og noter lokal/ekstern IP og port. Forklar hvilken av portene som vanligvis er klientens midlertidige port.'
  },
  {
    id: 'udp', name: 'UDP', full: 'User Datagram Protocol', layer: 'Transportlag (lag 4)',
    ports: 'Portnummer 0–65535 · eksempel UDP 53', color: '#7ddfdc', short: 'Små datagrammer uten forbindelse',
    intro: 'UDP sender selvstendige datagrammer uten å opprette TCP-lignende forbindelse. Protokollen har lite overhead, men gir ingen garanti for levering, rekkefølge eller retransmisjon.',
    points:[
      'UDP har kildeport, destinasjonsport, lengde og checksum i headeren.',
      'UDP har ingen SYN/SYN-ACK/ACK-handshake og ingen innebygd retransmisjon.',
      'Hvert datagram bevarer meldingsgrensen, i motsetning til TCPs bytestrøm.',
      'Applikasjoner kan selv implementere kontroll for tap, rekkefølge eller levering ved behov.',
      'Brukes blant annet til DNS, sanntidskommunikasjon og QUIC (som HTTP/3 bygger på).'
    ],
    nodes:[
      {id:'a',name:'Klient',sub:'UDP 53000',icon:'💻',x:75,y:155},
      {id:'g',name:'Gateway',sub:'LAN',icon:'📡',x:235,y:155},
      {id:'r1',name:'Ruter 2',sub:'Internett',icon:'📡',x:405,y:105},
      {id:'r2',name:'Ruter 3',sub:'Internett',icon:'📡',x:530,y:210},
      {id:'b',name:'Server',sub:'UDP 53',icon:'🖥️',x:680,y:155}
    ], links:[['a','g'],['g','r1'],['r1','r2'],['r2','b']],
    steps:[
      step('Datagram 1','a','b','UDP #1','Klienten sender UDP uten en egen transport-handshake.', ['UDP src: 53000','UDP dst: 53','Datagram: 1']),
      step('Svar på datagram 1','b','a','UDP SVAR','Serveren kan svare med et eget datagram. UDP gir ikke en innebygd leveringsbekreftelse.', ['UDP src: 53','UDP dst: 53000','DNS response (eksempel)']),
      step('Datagram 2 går tapt','a','r1','UDP #2 TAP','Et datagram går tapt underveis. UDP retransmitterer ikke automatisk.', ['Datagram: 2','Ingen UDP-retransmisjon']),
      step('Datagram 3 leveres','a','b','UDP #3','Et senere datagram kan nå frem selv om et tidligere ble mistet.', ['Datagram: 3','Meldingsgrense bevart'])
    ],
    commands:[{code:'netstat -ano -p udp',detail:'Vis lokale UDP-endepunkter i Windows.'},{code:'nslookup example.com',detail:'Demonstrer en vanlig DNS-klientforespørsel (ofte UDP).'}],
    questions:[
      q('Hva skjer hvis UDP-datagrammet går tapt?', ['UDP retransmitterer alltid', 'UDP retransmitterer ikke selv', 'Ruteren sender SYN'], 1, 'Eventuell retransmisjon må løses på et annet nivå.'),
      q('Hva er en forskjell fra TCP?', ['UDP har ingen porter', 'UDP bevarer datagramgrensene', 'UDP har alltid handshake'], 1, 'UDP leverer selvstendige datagrammer til applikasjonen.'),
      q('Hvilken teknologi bruker UDP som transport?', ['QUIC', 'ARP', 'Ethernet'], 0, 'QUIC implementerer blant annet pålitelig transport over UDP.')
    ],
    challenge:'Se etter UDP-endepunkter med «netstat -ano -p udp». Hvorfor kan ikke listen tolkes som en oversikt over etablerte forbindelser på samme måte som TCP?'
  },
  {
    id: 'http', name: 'HTTP', full: 'Hypertext Transfer Protocol', layer: 'Applikasjonslag',
    ports: 'HTTP: vanligvis 80 · HTTPS: vanligvis 443', color: '#f6abdc', short: 'Forespørsel og svar på web',
    intro: 'HTTP beskriver hvordan klienter ber om ressurser og servere svarer. HTTPS er HTTP over en kryptert forbindelse. En moderne nettside krever ofte mange separate forespørsler.',
    points:[
      'En request har metode, URL-/path-informasjon, headere og eventuelt body. Serveren svarer med statuskode, headere og eventuelt body.',
      'GET brukes til å hente ressurser; POST til å sende data for behandling; PUT til å opprette/erstatte en ressurs; DELETE til å be om sletting.',
      'HTTP 200 betyr OK, 301/302 omdirigering, 404 ikke funnet, 500 intern serverfeil.',
      'HTTP/1.1 og HTTP/2 bruker normalt TCP. HTTP/3 bruker QUIC over UDP.',
      'HTTPS bruker TLS og beskytter HTTP-innholdet under transport. «ping» og «nslookup» tester ikke HTTP-tjenesten direkte.'
    ],
    nodes:[{id:'a',name:'Nettleser',sub:'Klient',icon:'💻',x:100,y:155},{id:'r',name:'Nettverk',sub:'IP + transport',icon:'🌐',x:370,y:155},{id:'b',name:'Webserver',sub:'HTTPS 443',icon:'🖥️',x:635,y:155}], links:[['a','r'],['r','b']],
    steps:[
      step('Navneoppløsning og tilkobling','a','r','DNS / TLS','Nettleseren finner serverens IP og oppretter en sikker forbindelse. Forløpet er forenklet her.', ['DNS-oppslag om nødvendig','TCP + TLS for HTTP/1.1 og HTTP/2','Alternativt QUIC + TLS for HTTP/3']),
      step('HTTP GET','a','b','GET /','Nettleseren ber om startsiden med en HTTP-forespørsel.', ['GET / HTTP/1.1','Host: example.com','Accept: text/html']),
      step('HTTP Response','b','a','200 OK','Webserveren svarer med status og HTML-dokument.', ['HTTP/1.1 200 OK','Content-Type: text/html','Body: <html>…</html>']),
      step('Flere ressurser','a','b','GET /style.css','HTML kan peke på CSS, bilder og skript som nettleseren henter med flere forespørsler.', ['GET /style.css','GET /logo.svg (separat forespørsel)']),
      step('Flere svar','b','a','200 OK','Serveren sender de øvrige ressursene. Nettleseren setter dem sammen på skjermen.', ['Content-Type: text/css','Content-Type: image/svg+xml'])
    ],
    commands:[{code:'curl.exe -I https://example.com',detail:'Se HTTP-svarheadere i Windows CMD/PowerShell.'},{code:'curl.exe -v https://example.com',detail:'Se detaljer om tilkobling, forespørsel og svar.'}],
    questions:[
      q('Hva betyr HTTP-status 404?', ['OK', 'Ikke funnet', 'Serveren ber om ARP'], 1, '404 betyr at den forespurte ressursen ikke ble funnet.'),
      q('Hva er forskjellen på HTTP og HTTPS?', ['HTTPS bruker kryptert transport med TLS', 'HTTP har ikke metoder', 'HTTPS er en MAC-adresse'], 0, 'HTTPS er HTTP over en TLS-beskyttet transport.'),
      q('Hvilken transport bruker HTTP/3?', ['Kun TCP', 'QUIC over UDP', 'ARP'], 1, 'HTTP/3 benytter QUIC, som kjører over UDP.')
    ],
    challenge:'Kjør «curl.exe -I https://example.com» i CMD. Finn statuskoden og minst to HTTP-headere. Hva forteller Content-Type dersom den er oppgitt?'
  },
  {
    id: 'nat', name: 'NAT', full: 'Network Address Translation', layer: 'Ruterfunksjon (ikke en egen transportprotokoll)',
    ports: 'PAT oversetter ofte også TCP-/UDP-porter', color: '#ffc47e', short: 'Flere private klienter deler offentlig IP',
    intro: 'NAT endrer adresser i IP-pakker. Den vanlige løsningen for mange hjemmenett er PAT/NAPT: flere private klienter deler én offentlig IPv4-adresse ved at ruteren også oversetter porter.',
    points:[
      'Private IPv4-adresser rutes normalt ikke direkte på internett. En NAT-ruter kan oversette kildeadressen til en offentlig adresse. 203.0.113.5 og 198.51.100.20 er dokumentasjonsadresser i eksempelet.',
      'PAT/NAPT kan også bytte kildeport og lagre koblinger for aktive trafikkflyter i en oversettelses-/tilstandstabell.',
      'Når svaret kommer, bruker ruteren tabellen for å finne riktig intern klient og port.',
      'En NAT-oppføring knyttes vanligvis til en trafikkflyt, ikke en ny tabelloppføring per pakke.',
      'NAT bidrar til å spare offentlige IPv4-adresser, men er ikke det samme som en brannmur. IPv6 er designet med et langt større adresserom.'
    ],
    nodes:[
      {id:'a',name:'PC A',sub:'192.168.1.10:51514',icon:'💻',x:95,y:75},
      {id:'c',name:'PC B',sub:'192.168.1.11:52625',icon:'💻',x:95,y:250},
      {id:'sw',name:'Switch',sub:'LAN 192.168.1.0/24',icon:'🔀',x:285,y:160},
      {id:'r',name:'NAT-ruter',sub:'203.0.113.5',icon:'📡',x:475,y:160},
      {id:'b',name:'Webserver',sub:'198.51.100.20:443',icon:'🖥️',x:660,y:160}
    ], links:[['a','sw'],['c','sw'],['sw','r'],['r','b']],
    steps:[
      step('PC A sender','a','r','TCP SYN','PC A bruker kildeport 51514. NAT-ruteren får pakken via switchen.', ['Src: 192.168.1.10:51514','Dst: 198.51.100.20:443']),
      step('PAT oppretter oppføring A','r','b','NAT :40001','Ruteren lagrer tilstand og bytter kilde til sin offentlige adresse og port 40001.', ['Før: 192.168.1.10:51514','Etter: 203.0.113.5:40001']),
      step('PC B sender','c','r','TCP SYN','PC B har en annen kildeport: 52625. Den går også via switchen.', ['Src: 192.168.1.11:52625','Dst: 198.51.100.20:443']),
      step('PAT oppretter oppføring B','r','b','NAT :40002','Ruteren lager en separat tilstandsoppføring for PC B.', ['Før: 192.168.1.11:52625','Etter: 203.0.113.5:40002']),
      step('Svar til PC B kommer','b','r','TIL :40002','Svar fra serveren kommer til offentlig IP og NAT-port 40002. Ruteren slår opp denne oppføringen.', ['Src: 198.51.100.20:443','Dst: 203.0.113.5:40002']),
      step('Ruteren leverer til PC B','r','c','192.168.1.11:52625','Tabelltreff: 40002 hører til PC B. Ruteren endrer destinasjon til 192.168.1.11:52625 og sender via switchen.', ['Etter NAT: dst 192.168.1.11:52625','Via LAN-switch til PC B']),
      step('Svar til PC A kommer','b','r','TIL :40001','Et annet svar kommer inn på 40001. Tabellen gir en annen mottaker.', ['Dst: 203.0.113.5:40001']),
      step('Ruteren leverer til PC A','r','a','192.168.1.10:51514','Tabelltreff: 40001 peker på PC A. Ruteren sender tilbake via switchen.', ['Etter NAT: dst 192.168.1.10:51514'])
    ],
    commands:[{code:'ipconfig',detail:'Finn klientens private IPv4-adresse.'},{code:'tracert example.com',detail:'Se første hopp, ofte lokal gateway. NAT-oversettelser vises ikke direkte.'}],
    questions:[
      q('Hva skiller vanlig PAT fra ren adresseoversettelse?', ['PAT oversetter også transportporter', 'PAT fjerner IP-adresser', 'PAT erstatter DHCP'], 0, 'PAT gjør det mulig for flere forbindelser å dele en offentlig adresse.'),
      q('Hvordan finner ruteren riktig PC for et svar?', ['DNS-svar alene', 'Tilstands-/oversettelsestabellen', 'ARP-tabellen hos webserveren'], 1, 'Ruteren slår opp oversettelsen for den aktive forbindelsen.'),
      q('Er NAT det samme som en brannmur?', ['Ja, alltid', 'Nei, funksjonene er forskjellige', 'Bare ved HTTP'], 1, 'En brannmur filtrerer trafikk etter regler; NAT oversetter adresser/porter.')
    ],
    challenge:'To PC-er har 192.168.1.10:50000 og 192.168.1.11:50000 og besøker samme nettsted. Lag en liten PAT-tabell med én offentlig IP og to ulike porter, og vis hvordan svarene finner tilbake til riktig PC.'
  }
];
export const protocolById = Object.fromEntries(protocols.map(p => [p.id, p]));
