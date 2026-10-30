import { portFeedback } from './networkCheckFeedback.js';

// A deliberately bounded Layer 2 teaching model, not a switch operating system.
/** @typedef {'excluded'|'untagged'|'tagged'} Membership */
/** @typedef {{pvid:number,members:Record<string,Membership>}} PortConfig */
/** @typedef {{vlans:number[],ports:Record<string,PortConfig>}} SwitchConfig */
/** @typedef {{ips:Record<string,string>,switches:Record<string,SwitchConfig>}} VlanConfig */
/** @typedef {{id:string,name:string,switchId:string,port:string,vlan:number,network:string,x:number,y:number}} VlanPc */
/** @typedef {{id:string,name:string,x:number,y:number,ports:{id:string,peer:string}[]}} VlanSwitch */
/** @typedef {{id:string,a:string,aPort:string,b:string,bPort:string}} VlanLink */
/** @typedef {{id:string,title:string,goal:string,ready:string,steps:string[],theory:string[],hints:string[],reflect:string,switchCount:number,groups:number[],networkNames:string[],networks:string[],discoverPorts?:boolean,editableSwitches:boolean,preconfigured:boolean,pcs:VlanPc[],switches:VlanSwitch[],links:VlanLink[]}} VlanTask */
/** @typedef {{node:string,port?:string}} TracePoint */
/** @typedef {{text:string,node:string,link?:string,ok:boolean,from:TracePoint,to:TracePoint}} TraceStep */
/** @typedef {{ok:boolean,code:string,message:string,steps:TraceStep[],vlanDiagnostic?:boolean}} PingResult */

export const vlanActivity = {
	id: 'vlan-lab', tittel: 'VLAN-lab 1 · Switcher',
	beskrivelse: 'Gi PC-er IP-adresser, skill nettverk med VLAN og bygg trunk mellom tre switcher.',
	href: '/nettverk/vlan/', fag: 'drift', audience: 'student', format: 'aktivitet',
	type: 'Interaktiv nettverkslab',
	emner: ['IP-adresser', 'VLAN', 'PVID', 'Trunk'],
	sokeord: ['switch', 'svitsj', 'tagged', 'untagged', 'native', 'default', 'nettverk', 'ping'],
	symbol: '↔'
};

/** @type {Omit<VlanTask,'pcs'|'switches'|'links'>[]} */
const definitions = [
	{
		id: 'ip', title: 'Få to PC-er på nett', switchCount: 1, groups: [1], networkNames: ['Ansatt'],
		networks: ['192.168.10'],
		editableSwitches: false, preconfigured: true,
		goal: 'To ansatte skal kunne bruke samme lokalnett. Få ping til å svare mellom Ansatt-PC 1 og Ansatt-PC 2 i 192.168.10.0/24.',
		ready: 'Switchen og VLAN 1 er ferdig satt opp. Én av PC-ene har IP-adresse i feil nett.',
		steps: ['Velg PC-ene og sammenlign IP-adressene. Rett adressen som er i feil nett; PC-ene skal ha ulike adresser.', 'Prøv ping mellom Ansatt-PC 1 og Ansatt-PC 2. Du er i mål når ping får svar og oppdragskontrollen består.'],
		theory: [
			'En switch kobler enheter sammen. Først bruker begge portene standard VLAN 1.',
			'Alle PC-ene i laben har masken /24 (255.255.255.0). De tre første tallene angir nettet; siste tall skiller PC-ene.',
			'I 192.168.10.0/24 kan du bruke vertsadresser fra .1 til .254. .0 er nettadressen og .255 er broadcast. PC-ene må ha ulike adresser.'
		],
		hints: ['Sammenlign de tre første tallene i IP-adressene.', 'Ansatt-PC 1 har 192.168.10.11. Ansatt-PC 2 kan for eksempel bruke 192.168.10.12.'],
		reflect: 'Hvorfor er det ikke nok at begge PC-ene er koblet til samme switch?'
	},
	{
		id: 'to-nett', title: 'Finn nettet bak porten', switchCount: 1, groups: [1, 2], networkNames: ['Ansatt', 'Gjest'],
		networks: ['10.24.8', '172.18.6'], discoverPorts: true,
		editableSwitches: false, preconfigured: true,
		goal: 'Finn hvilket VLAN hver PC er koblet til, og gi den en adresse fra riktig IP-nett. VLAN 1 bruker 10.24.8.0/24, og VLAN 2 bruker 172.18.6.0/24. PC-er i samme VLAN skal nå hverandre; nettverkene skal være adskilt.',
		ready: 'Switchen er ferdig konfigurert og låst. Fire PC-er mangler IP-adresser. PC-navn og plassering forteller ikke hvilket VLAN de tilhører.',
		steps: ['Følg kabelen fra hver PC til eth-porten på S1. Undersøk U og PVID på denne porten i switchtabellen. Bruk VLAN-planen til å velge IP-nett og sett en unik vertsadresse.', 'Forutsi hvilke PC-er som kan nå hverandre. Prøv ping innenfor begge VLAN og mellom dem, og kontroller deretter hele oppdraget.'],
		theory: [
			'Et VLAN er et eget logisk lokalnett i switchen. Portens oppsett bestemmer hvilket VLAN en PC uten tagging tilhører.',
			'Finn portkolonnen i tabellen. U betyr at VLAN-et sendes uten tag til PC-en. PVID bestemmer VLAN for umerket trafikk fra PC-en. Disse er ferdig satt til samme VLAN her.',
			'VLAN-ID og IP-nett er ulike ting. VLAN 2 betyr ikke at IP-adressen må inneholde tallet 2. Bruk den avtalte VLAN-planen.',
			'Ingen ruter er med i laben. Hvert par skal kunne kommunisere innenfor sitt nett; trafikk mellom de to IP-nettene trenger ruting.'
		],
		hints: ['Velg en PC og bruk portsnarveien. Følg den markerte kolonnen og finn VLAN-raden med U. Sammenlign med PVID under tabellen.', 'Har porten U og PVID i VLAN 1, velger du en unik adresse i 10.24.8.0/24. Har den VLAN 2, bruker du 172.18.6.0/24.'],
		reflect: 'Vis hvilken port og hvilke innstillinger du undersøkte for én PC. Hvorfor ville en IP-adresse fra det andre nettet ikke flytte PC-en til et annet VLAN?'
	},
	{
		id: 'porter', title: 'Sett VLAN på PC-portene', switchCount: 1, groups: [10, 20], networkNames: ['Ansatt', 'Gjest'],
		networks: ['192.168.60', '10.18.3'],
		editableSwitches: true, preconfigured: false,
		goal: 'Del S1 i to lokalnett: Ansatt i VLAN 10 og Gjest i VLAN 20. PC-ene i samme nett skal nå hverandre, mens Ansatt og Gjest skal være adskilt på VLAN-nivå.',
		ready: 'Alle IP-adressene er riktige, men switchportene ligger fortsatt i standard VLAN 1. Ulike IP-nett alene lager ikke VLAN-skillet.',
		steps: ['Opprett VLAN 10 og 20 på S1. Velg hver PC-port og sett Untagged og PVID til PC-ens planlagte VLAN. Andre VLAN på PC-porten skal være Exclude.', 'Prøv ping mellom de to Ansatt-PC-ene og mellom de to Gjest-PC-ene. Begge par skal få svar. Oppdragskontrollen skal også bekrefte VLAN-skillet.'],
		theory: [
			'PC-ene i denne laben sender og mottar rammer uten VLAN-tag.',
			'PVID er portens VLAN for innkommende rammer uten tag. Untagged betyr at switchen sender dette VLAN-et uten tag på porten. Begge valgene må passe PC-ens nett.',
			'Default VLAN er VLAN 1 i startoppsettet. Det er ikke det samme som en default gateway. Exclude betyr at porten ikke er medlem av VLAN-et. Å velge et annet untagged VLAN her setter det tidligere untagged-medlemskapet til Exclude, men endrer ikke PVID automatisk.'
		],
		hints: ['Velg S1 og opprett VLAN-ene. Finn PC-ens portnummer under tabellen, og følg samme portkolonne i VLAN-radene. Trykk på en rute for å bytte mellom U, E og T.', 'På porten til Ansatt-PC 1: sett U (Untagged) i raden for VLAN 10 og PVID til 10. Andre VLAN skal være E (Exclude) på denne PC-porten.'],
		reflect: 'Hva forteller PVID om trafikk inn, og hva forteller untagged om trafikk ut?'
	},
	{
		id: 'trunk', title: 'Frakt to VLAN mellom switcher', switchCount: 2, groups: [10, 20], networkNames: ['Ansatt', 'Gjest'],
		networks: ['10.42.7', '172.20.55'],
		editableSwitches: true, preconfigured: false,
		goal: 'Utvid Ansatt (VLAN 10) og Gjest (VLAN 20) til to switcher. Ansatt-PC-ene skal nå hverandre på tvers av S1 og S2, og det samme skal Gjest-PC-ene. Nettverkene skal fortsatt være adskilt.',
		ready: 'IP-adressene er klare: Ansatt bruker 10.42.7.0/24 og Gjest bruker 172.20.55.0/24. Begge switchene har bare VLAN 1. Du må opprette arbeids-VLAN-ene og konfigurere både PC-porter og trunk.',
		steps: ['Opprett VLAN 10 og 20 på både S1 og S2. Sett PC-portenes Untagged og PVID etter nettverksplanen, med andre VLAN Exclude på PC-portene.', 'Finn eth-portene på kabelen mellom switchene. Frakt VLAN 10 og 20 Tagged i begge ender, og behold samsvar for native VLAN. Test begge nett på tvers av switchene og kontroller oppdraget.'],
		theory: [
			'En trunk er en forbindelse som kan frakte flere VLAN. En 802.1Q-tag forteller mottakerswitchen hvilket VLAN rammen tilhører.',
			'På uplinken skal både VLAN 10 og 20 være Tagged. Et VLAN må finnes og være tillatt på begge switchene. PC-portene skal fortsatt være Untagged.',
			'En trunk kan også ha et untagged/native VLAN. Her starter begge uplinkene med VLAN 1 untagged og PVID 1. Hvis du endrer native VLAN, må begge ender være enige, ellers kan umerket trafikk havne i feil VLAN.'
		],
		hints: ['Et VLAN må opprettes på begge switchene før det kan brukes. Finn PC-portene og eth2-forbindelsen mellom switchene i kartet.', 'Sett VLAN 10 og 20 til Tagged på S1 eth2 og S2 eth2. PC-portene trenger U og riktig PVID. Behold det matchende native VLAN 1 på trunken.'],
		reflect: 'Hvorfor er det ikke nok å konfigurere trunk bare på S1?'
	},
	{
		id: 'tre-switcher', title: 'Bygg gjennom tre switcher', switchCount: 3, groups: [30, 40], networkNames: ['Admin', 'Gjest'],
		networks: ['172.16.24', '10.90.8'],
		editableSwitches: true, preconfigured: false,
		goal: 'Bygg Admin (VLAN 30) og Gjest (VLAN 40) gjennom S1–S2–S3. Alle tre Admin-PC-er skal nå hverandre, og alle tre Gjest-PC-er skal nå hverandre. Admin og Gjest skal være adskilt.',
		ready: 'IP-adressene er klare: Admin bruker 172.16.24.0/24 og Gjest bruker 10.90.8.0/24. Alle switchporter starter i VLAN 1.',
		steps: ['Planlegg og opprett VLAN-ene på alle tre switchene. Sett PC-portenes PVID og Untagged, og frakt begge nett Tagged over begge switchforbindelsene. Andre VLAN på PC-portene skal være Exclude.', 'Test innenfor begge nett, også fra S1 helt til S3. Bruk oppdragskontrollen for å undersøke alle forbindelsene og skillet mellom Admin og Gjest.'],
		theory: [
			'Samme VLAN må være tilgjengelig hele veien, også på switchen i midten.',
			'Bruk portoversikten til å skille PC-porter fra forbindelser mellom switcher. Kontroller både et par som skal nå hverandre og skillet mellom gruppene.'
		],
		hints: ['Følg Admin-PC 1 → Admin-PC 3 gjennom begge kablene. Hvilke porter møter trafikken?', 'S2 har to uplinker. Begge må frakte VLAN 30 og 40 tagged, i tillegg til oppsettet på S1 og S3.'],
		reflect: 'Forklar hele reisen fra Admin-PC 1 til Admin-PC 3. Hva ville skjedd med Gjest-nettet om VLAN 40 manglet på én av uplinkene?'
	},
	{
		id: 'nettverksnott', title: 'Nettverksnøtta', switchCount: 3, groups: [17, 83, 206], networkNames: ['Ansatt', 'Gjest', 'Admin'],
		networks: ['172.22.14', '10.63.5', '192.168.147'], editableSwitches: true, preconfigured: false,
		goal: 'Bygg tre adskilte nett gjennom S1–S2–S3: Ansatt i VLAN 17, Gjest i VLAN 83 og Admin i VLAN 206. Hvert PC-par med samme rolle skal nå hverandre. Begge trunkene skal frakte alle tre VLAN.',
		ready: 'PC-ene bruker andre porter og adresser enn før. Noen adresser er riktige, én er i feil nett og to mangler. Alle switchporter starter i VLAN 1. Bruk kartet og nettverksplanen; ikke kopier portmønsteret fra del 5.',
		steps: ['Lag en port- og adresseplan ut fra kablene. Kontroller hver IP-adresse mot VLAN-planen og rett det som mangler eller er feil. Opprett VLAN-ene på alle tre switchene.', 'Konfigurer PC-porter og begge trunkene. Forutsi og prøv forbindelser innenfor og mellom nettverkene. Feilsøk med pakkens stoppested og bestå hele oppdragskontrollen.'],
		theory: ['VLAN-ID, portnavn og IP-nett er uavhengige valg. Det er dokumentasjonen og kablene som avgjør hvilket oppsett du trenger.', 'På en trunk må sender og mottaker være enige. Kontroller begge ender av hver kabel, også når portene har forskjellige navn.'],
		hints: ['Begynn med én PC: følg kabelen, finn riktig portkolonne og sammenlign adressen med nettverksplanen. Få ett nett til å virke før du undersøker resten.', 'S2 har to ulike trunkporter. Følg begge kablene i kartet. Alle tre arbeids-VLAN må finnes og være Tagged i begge ender av begge forbindelsene.'],
		reflect: 'Velg ett PC-par og forklar portene, VLAN-ID-en og IP-nettet langs hele veien. Hvordan fant du fram når portnummer og VLAN-ID ikke fulgte mønsteret fra de første oppdragene?'
	}
];

/** @param {typeof definitions[number]} definition @returns {VlanTask} */
function topology(definition) {
	const n = definition.switchCount;
	/** @type {VlanSwitch[]} */
	const switches = Array.from({ length: n }, (_, i) => ({
		id: `s${i + 1}`, name: `S${i + 1}`, x: ((i + 0.5) / n) * 900, y: 220, ports: []
	}));
	/** @type {VlanPc[]} */
	let pcs = [];
	const perGroup = n === 1 ? 2 : n;
	definition.groups.forEach((vlan, group) => {
		for (let i = 0; i < perGroup; i++) {
			const sw = switches[n === 1 ? 0 : i];
			const index = group * perGroup + i;
			pcs.push({
				id: `pc${index + 1}`, name: `${definition.networkNames[group]}-PC ${i + 1}`,
				switchId: sw.id, port: `eth${n === 1 ? index : group}`,
				vlan, network: definition.networks[group],
				x: n === 1 ? 270 + i * 360 : sw.x, y: group === 0 ? 65 : 375
			});
		}
	});
	if (definition.discoverPorts) {
		// Neutral names and mixed locations: only the switch configuration reveals membership.
		const assignments = [{ port: 'eth2', group: 1 }, { port: 'eth0', group: 0 }, { port: 'eth3', group: 0 }, { port: 'eth1', group: 1 }];
		pcs = pcs.map((pc, i) => ({ ...pc, name: `PC ${i + 1}`, port: assignments[i].port,
			vlan: definition.groups[assignments[i].group], network: definition.networks[assignments[i].group] }));
	}
	/** @type {VlanLink[]} */
	let links = Array.from({ length: n - 1 }, (_, i) => ({
		id: `s${i + 1}-s${i + 2}`, a: `s${i + 1}`, aPort: i === 0 ? 'eth2' : 'eth3', b: `s${i + 2}`, bPort: 'eth2'
	}));
	if (definition.id === 'nettverksnott') {
		const plan = [
			{ group: 0, sw: 0, port: 'eth5', y: 65, number: 1 },
			{ group: 1, sw: 0, port: 'eth1', y: 375, number: 1 },
			{ group: 2, sw: 1, port: 'eth0', y: 65, number: 1 },
			{ group: 0, sw: 1, port: 'eth6', y: 375, number: 2 },
			{ group: 1, sw: 2, port: 'eth4', y: 65, number: 2 },
			{ group: 2, sw: 2, port: 'eth2', y: 375, number: 2 }
		];
		pcs = plan.map((item, i) => ({ id: `pc${i + 1}`, name: `${definition.networkNames[item.group]}-PC ${item.number}`,
			switchId: switches[item.sw].id, port: item.port, vlan: definition.groups[item.group], network: definition.networks[item.group],
			x: switches[item.sw].x, y: item.y }));
		links = [
			{ id: 's1-s2', a: 's1', aPort: 'eth7', b: 's2', bPort: 'eth3' },
			{ id: 's2-s3', a: 's2', aPort: 'eth5', b: 's3', bPort: 'eth0' }
		];
	}
	for (const pc of pcs) switches.find((sw) => sw.id === pc.switchId)?.ports.push({ id: pc.port, peer: pc.name });
	for (const link of links) {
		switches.find((sw) => sw.id === link.a)?.ports.push({ id: link.aPort, peer: `${link.b.toUpperCase()} · ${link.bPort}` });
		switches.find((sw) => sw.id === link.b)?.ports.push({ id: link.bPort, peer: `${link.a.toUpperCase()} · ${link.aPort}` });
	}
	for (const sw of switches) sw.ports.sort((a, b) => Number(a.id.slice(3)) - Number(b.id.slice(3)));
	return { ...definition, pcs, switches, links };
}
export const vlanTasks = definitions.map(topology);
/** @param {string} id */
export const vlanTask = (id) => vlanTasks.find((task) => task.id === id) ?? vlanTasks[0];

/** @typedef {{revision:number,check:{revision:number,result:{passed:boolean}}|null}} VlanProgress */
/** @param {VlanProgress|undefined} attempt */
export function vlanCheckPassed(attempt) {
	if (!attempt?.check) return false;
	return attempt.check.revision === attempt.revision && attempt.check.result.passed;
}
/** The first incomplete task stays open; later tasks require current checks for all prerequisites. @param {Record<string,VlanProgress>} work */
export function vlanAvailableThrough(work) {
	const firstIncomplete = vlanTasks.findIndex((task) => !vlanCheckPassed(work[task.id]));
	return firstIncomplete < 0 ? vlanTasks.length - 1 : firstIncomplete;
}

/** The task's intended network name, not a claim about the current port configuration. @param {VlanTask} task @param {number} id */
export function vlanLabel(task, id) {
	const name = task.networkNames[task.groups.indexOf(id)];
	return `VLAN ${id}${name ? ` · ${name}` : id === 1 ? ' · Default' : ''}`;
}

/** @param {VlanTask} task @returns {VlanConfig} */
export function initialVlanConfig(task) {
	/** @type {VlanConfig} */
	const config = { ips: {}, switches: {} };
	for (const sw of task.switches) {
		config.switches[sw.id] = {
			vlans: task.preconfigured ? [...new Set([1, ...task.groups])] : [1],
			ports: Object.fromEntries(sw.ports.map((port) => [port.id, { pvid: 1, members: { '1': 'untagged' } }]))
		};
	}
	task.pcs.forEach((pc, i) => {
		config.ips[pc.id] = task.discoverPorts ? '' : `${pc.network}.${task.id === 'ip' ? 11 + i : [38, 91, 126, 57, 203, 164][i]}`;
		if (task.preconfigured) {
			config.switches[pc.switchId].ports[pc.port] = { pvid: pc.vlan, members: { [pc.vlan]: 'untagged' } };
		}
	});
	if (task.id === 'ip') config.ips.pc2 = '192.168.20.12';
	if (task.id === 'nettverksnott') Object.assign(config.ips, { pc3: '', pc4: '172.22.41.117', pc5: '' });
	return config;
}

/** Return a usable unicast host address for this /24-only model. @param {string} raw */
export function hostAddress(raw) {
	if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(raw)) return null;
	const parts = raw.split('.').map(Number);
	if (parts.some((part) => part > 255) || parts[0] === 0 || parts[0] === 127 || parts[0] >= 224 || parts[3] === 0 || parts[3] === 255) return null;
	return { address: parts.join('.'), network: parts.slice(0, 3).join('.') };
}
/** @param {PortConfig} port @param {number} vlan */
export const membership = (port, vlan) => port.members[String(vlan)] ?? 'excluded';
/** @param {SwitchConfig} sw @param {PortConfig} port @param {number} vlan */
const allows = (sw, port, vlan) => sw.vlans.includes(vlan) && membership(port, vlan) !== 'excluded';

/** Physical anchor shared by cable drawing and packet playback. @param {VlanTask} task @param {TracePoint} point */
export function vlanPoint(task, point) {
	const pc = task.pcs.find((item) => item.id === point.node);
	if (pc) return { x: pc.x, y: pc.y };
	const sw = task.switches.find((item) => item.id === point.node);
	if (!sw) return { x: 450, y: 220 };
	if (!point.port) return { x: sw.x, y: sw.y };
	const attached = task.pcs.find((item) => item.switchId === sw.id && item.port === point.port);
	if (attached) {
		const above = attached.y < sw.y;
		const neighbours = task.pcs.filter((item) => item.switchId === sw.id && (item.y < sw.y) === above).sort((a, b) => a.x - b.x);
		return { x: sw.x + (neighbours.indexOf(attached) - (neighbours.length - 1) / 2) * 100, y: sw.y + (above ? -66 : 66) };
	}
	const link = task.links.find((item) => (item.a === sw.id && item.aPort === point.port) || (item.b === sw.id && item.bPort === point.port));
	const peer = task.switches.find((item) => item.id === (link?.a === sw.id ? link.b : link?.a));
	const offset = task.switches.length === 2 ? 140 : 108;
	return { x: sw.x + (peer && peer.x < sw.x ? -offset : offset), y: sw.y };
}

/** Trace the fixed, loop-free topology. Every movement ends at a real device or port.
 * @param {VlanTask} task @param {VlanConfig} config @param {string} sourceId @param {string} targetId
 * @returns {PingResult}
 */
export function traceVlan(task, config, sourceId, targetId) {
	const source = task.pcs.find((pc) => pc.id === sourceId);
	const target = task.pcs.find((pc) => pc.id === targetId);
	/** @type {TraceStep[]} */ const steps = [];
	/** @param {string} text @param {TracePoint} from @param {TracePoint} to @param {string} [link] */
	const travel = (text, from, to, link) => steps.push({ text, node: to.node, from, to, link, ok: true });
	/** @param {string} code @param {string} text @param {TracePoint} from @param {TracePoint} to @param {string} [link] */
	const stop = (code, text, from, to, link) => ({ ok: false, code, message: text, steps: [...steps, { text, node: to.node, from, to, link, ok: false }] });
	if (!source || !target || source === target) return stop('pair', 'Velg to forskjellige PC-er.', { node: sourceId }, { node: sourceId });
	let current = config.switches[source.switchId];
	const ingress = current.ports[source.port];
	let vlan = ingress.pvid;
	const firstPort = { node: source.switchId, port: source.port };
	travel(`${source.name} sender uten VLAN-tag til ${source.switchId.toUpperCase()} ${source.port}.`, { node: source.id }, firstPort, source.id);
	if (!allows(current, ingress, vlan)) return stop('pvid', `${source.switchId.toUpperCase()} ${source.port}: PVID ${vlan} er ikke et tillatt VLAN på porten.`, firstPort, firstPort);
	travel(`${source.switchId.toUpperCase()} ${source.port} plasserer umerket trafikk i VLAN ${vlan} (PVID).`, firstPort, { node: source.switchId });
	let index = task.switches.findIndex((sw) => sw.id === source.switchId);
	const targetIndex = task.switches.findIndex((sw) => sw.id === target.switchId);
	const direction = Math.sign(targetIndex - index);
	while (index !== targetIndex) {
		const here = task.switches[index], next = task.switches[index + direction];
		const link = task.links.find((item) => (item.a === here.id && item.b === next.id) || (item.b === here.id && item.a === next.id));
		if (!link) return stop('link', 'Ingen kabelforbindelse mellom switchene.', { node: here.id }, { node: here.id });
		const outId = link.a === here.id ? link.aPort : link.bPort;
		const inId = link.a === next.id ? link.aPort : link.bPort;
		const outPoint = { node: here.id, port: outId }, inPoint = { node: next.id, port: inId };
		const outgoing = current.ports[outId];
		if (!allows(current, outgoing, vlan)) return stop('egress', `${here.name} ${outId} slipper ikke ut VLAN ${vlan}. Undersøk VLAN-medlemskapet.`, { node: here.id }, outPoint);
		const tag = membership(outgoing, vlan) === 'tagged' ? vlan : null;
		travel(`${here.name} ${outId} sender ${tag === null ? `untagged fra VLAN ${vlan}` : `tagged med VLAN ${tag}`}.`, { node: here.id }, outPoint);
		travel(`Rammen går på kabelen fra ${here.name} ${outId} til ${next.name} ${inId}.`, outPoint, inPoint, link.id);
		current = config.switches[next.id];
		const incoming = current.ports[inId];
		vlan = tag ?? incoming.pvid;
		if (!allows(current, incoming, vlan)) return stop('ingress', `${next.name} ${inId} avviser VLAN ${vlan}. VLAN-et må finnes og være tillatt her.`, inPoint, inPoint, link.id);
		travel(`${next.name} tar imot i VLAN ${vlan}${tag === null ? `, bestemt av PVID ${incoming.pvid}` : ', bestemt av taggen'}.`, inPoint, { node: next.id });
		index += direction;
	}
	const destination = current.ports[target.port];
	const lastPort = { node: target.switchId, port: target.port };
	if (!allows(current, destination, vlan)) return stop('isolated', `${target.switchId.toUpperCase()} stopper rammen: ${target.port} er ikke med i VLAN ${vlan}. Rammen sendes ikke til ${target.name}.`, { node: target.switchId }, { node: target.switchId });
	travel(`${target.switchId.toUpperCase()} velger ${target.port} til ${target.name}.`, { node: target.switchId }, lastPort);
	if (membership(destination, vlan) !== 'untagged') return stop('pc-tag', `${target.name} mottar en tagged ramme. PC-ene i denne laben trenger untagged ut fra switchen.`, lastPort, { node: target.id }, target.id);
	travel(`${target.name} mottar rammen uten tag fra VLAN ${vlan}.`, lastPort, { node: target.id }, target.id);
	return { ok: true, code: 'delivered', message: 'Rammen når fram.', steps };
}

/** @param {VlanTask} task @param {VlanConfig} config @param {string} sourceId @param {string} targetId @returns {PingResult} */
export function pingVlan(task, config, sourceId, targetId) {
	/** @param {string} id */
	const name = (id) => task.pcs.find((pc) => pc.id === id)?.name ?? id;
	/** @param {string} code @param {string} message */
	const stop = (code, message) => ({ ok: false, code, message, steps: [{ text: `Ingen pakke sendt: ${message}`, node: sourceId, from: { node: sourceId }, to: { node: sourceId }, ok: false }] });
	if (sourceId === targetId) return stop('pair', 'Velg to forskjellige PC-er.');
	const source = hostAddress(config.ips[sourceId] ?? ''), target = hostAddress(config.ips[targetId] ?? '');
	if (!source || !target) return stop('ip', `${name(!source ? sourceId : targetId)} trenger en gyldig vertsadresse. Med /24 kan siste tall være 1–254.`);
	if (source.network !== target.network) {
		const routing = 'PC-ene er i ulike /24-nett. Trafikken trenger en ruter/default gateway; denne laben har ingen ruting.';
		const vlan = traceVlan(task, config, sourceId, targetId);
		// Show the actual VLAN barrier as a labelled diagnostic, without pretending an
		// off-subnet ICMP packet was sent or that a switch made an IP routing decision.
		if (['pvid', 'egress', 'ingress', 'isolated'].includes(vlan.code)) {
			return { ok: false, code: 'routing', vlanDiagnostic: true, message: `${vlan.message} ${routing}`,
				steps: vlan.steps.map((step, i) => i === 0 ? { ...step, text: `VLAN-visning: følger forbindelsen fra ${name(sourceId)} inn til switchen.` } : step) };
		}
		return stop('routing', routing);
	}
	for (const pc of task.pcs) {
		const address = hostAddress(config.ips[pc.id] ?? '');
		for (const id of [sourceId, targetId]) {
			if (pc.id !== id && address?.address === hostAddress(config.ips[id])?.address &&
				(traceVlan(task, config, id, pc.id).ok || traceVlan(task, config, pc.id, id).ok)) {
				return stop('duplicate', `${name(id)} og ${pc.name} har samme IP-adresse i et sammenkoblet VLAN. Gi dem forskjellige vertsadresser.`);
			}
		}
	}
	const outward = traceVlan(task, config, sourceId, targetId);
	if (!outward.ok) return outward;
	const back = traceVlan(task, config, targetId, sourceId);
	const steps = [...outward.steps, { text: 'Retur: mottakeren sender ping-svaret tilbake.', node: targetId, from: { node: targetId }, to: { node: targetId }, ok: true }, ...back.steps];
	return back.ok
		? { ok: true, code: 'reply', message: 'Ping får svar. Både veien fram og returveien virker i modellen.', steps }
		: { ok: false, code: back.code, message: `Returen stopper: ${back.message}`, steps };
}

/** @typedef {{deviceId:string,portId?:string}} VlanCheckTarget */
/** @typedef {{label:string,ok:boolean,error:string,targets:VlanCheckTarget[]}} VlanCheckRow */
/** @param {VlanTask} task @param {VlanConfig} config */
export function checkVlanTask(task, config) {
	/** @type {VlanCheckRow[]} */
	const rows = [];
	for (const pc of task.pcs) {
		const address = hostAddress(config.ips[pc.id]);
		const port = config.switches[pc.switchId].ports[pc.port];
		const location = `${pc.switchId.toUpperCase()} ${pc.port}`;
		rows.push({
			label: task.discoverPorts ? `${pc.name}: adressen passer VLAN-et på ${location}` : `${pc.name}: vertsadresse i ${pc.network}.0/24`,
			ok: address?.network === pc.network,
			error: !address
				? `${pc.name}: ${config.ips[pc.id] ? 'IP-adressen er ikke en gyldig vertsadresse.' : 'IP-adressen er tom.'} Skriv fire tall fra 0–255; siste tall må være 1–254.`
				: task.discoverPorts
					? `${pc.name}: ${address.address}/24 passer ikke VLAN-et på ${location}. Finn portens U/PVID, og bruk nettverksplanen til å velge IP-nett.`
					: `${pc.name} har ${address.address}/24 og ligger i feil IP-nett. Velg en vertsadresse i ${pc.network}.0/24.`,
			targets: [{ deviceId: pc.id }]
		});
		rows.push({ label: task.discoverPorts ? `${pc.name}: switchporten følger det ferdige oppsettet` : `${pc.name}: VLAN ${pc.vlan} Untagged, PVID ${pc.vlan} og andre VLAN Exclude`, ok:
			port.pvid === pc.vlan && membership(port, pc.vlan) === 'untagged' &&
			config.switches[pc.switchId].vlans.includes(pc.vlan) &&
			Object.entries(port.members).every(([id, mode]) => mode === 'excluded' || Number(id) === pc.vlan),
			error: task.discoverPorts ? `${location} avviker fra det låste startoppsettet. Start oppdraget på nytt for å gjenopprette portene.` : portFeedback(config.switches[pc.switchId], pc.switchId.toUpperCase(), pc.port, pc.vlan, 'untagged'),
			targets: [{ deviceId: pc.switchId, portId: pc.port }] });
	}
	if (task.discoverPorts) {
		const pairs = task.pcs.flatMap((a, i) => task.pcs.slice(i + 1).map((b) => ({ a, b })));
		rows.push({ label: 'PC-er i samme VLAN kan kommunisere, og de to VLAN-ene er adskilt',
			ok: pairs.every(({ a, b }) => a.vlan === b.vlan ? pingVlan(task, config, a.id, b.id).ok : !traceVlan(task, config, a.id, b.id).ok && !traceVlan(task, config, b.id, a.id).ok),
			error: 'Minst én forbindelse følger ikke VLAN-inndelingen. Undersøk hvilke porter som har samme U/PVID, sjekk IP-nettene mot nettverksplanen og prøv ping mellom PC-ene. PC-er i samme nett må ha ulike vertsadresser.',
			targets: [{ deviceId: 's1' }] });
	} else {
		for (let i = 0; i < task.pcs.length; i++) {
			for (const b of task.pcs.slice(i + 1)) {
				const a = task.pcs[i];
				const ping = a.vlan === b.vlan ? pingVlan(task, config, a.id, b.id) : null;
				rows.push(ping
					? { label: `${a.name} ↔ ${b.name}: ping får svar`, ok: ping.ok,
						error: `${a.name} ↔ ${b.name}: ${ping.message}`, targets: [{ deviceId: a.id }, { deviceId: b.id }] }
					: { label: `${a.name} / ${b.name}: adskilt på VLAN-nivå`, ok: !traceVlan(task, config, a.id, b.id).ok && !traceVlan(task, config, b.id, a.id).ok,
						error: `${a.name} og ${b.name} er fortsatt koblet sammen på VLAN-nivå. Kontroller U og PVID på PC-portene; de skal tilhøre hvert sitt VLAN.`,
						targets: [{ deviceId: a.switchId, portId: a.port }, { deviceId: b.switchId, portId: b.port }] });
			}
		}
	}
	for (const link of task.links) {
		const a = config.switches[link.a], b = config.switches[link.b];
		const left = a.ports[link.aPort], right = b.ports[link.bPort];
		for (const vlan of task.groups) rows.push({
			label: `${link.a.toUpperCase()} ↔ ${link.b.toUpperCase()}: ${vlanLabel(task, vlan)} Tagged i begge ender`,
			ok: a.vlans.includes(vlan) && b.vlans.includes(vlan) && membership(left, vlan) === 'tagged' && membership(right, vlan) === 'tagged',
			error: [portFeedback(a, link.a.toUpperCase(), link.aPort, vlan, 'tagged'), portFeedback(b, link.b.toUpperCase(), link.bPort, vlan, 'tagged')].filter(Boolean).join(' '),
			targets: [{ deviceId: link.a, portId: link.aPort }, { deviceId: link.b, portId: link.bPort }]
		});
		const native = (/** @type {PortConfig} */ port) => Object.entries(port.members).find(([, mode]) => mode === 'untagged')?.[0];
		const ln = native(left), rn = native(right);
		rows.push({ label: `${link.a.toUpperCase()} ↔ ${link.b.toUpperCase()}: samsvar for untagged/native VLAN`,
			ok: ln === rn && (ln === undefined || (Number(ln) === left.pvid && Number(rn) === right.pvid)),
			error: `${link.a.toUpperCase()} ${link.aPort}: U = ${ln ?? 'ingen'}, PVID = ${left.pvid}. ${link.b.toUpperCase()} ${link.bPort}: U = ${rn ?? 'ingen'}, PVID = ${right.pvid}. Bruk samme untagged VLAN og tilhørende PVID i begge ender, eller fjern U i begge ender.`,
			targets: [{ deviceId: link.a, portId: link.aPort }, { deviceId: link.b, portId: link.bPort }] });
	}
	return { passed: rows.every((row) => row.ok), rows };
}

/** Only explicit view state is shared with the labpartner; never IP inputs or entire configuration. */
export const vlanContextLimit = 'Du ser valgt oppdrag, enhet, port og om en test er kjørt eller utdatert. Du ser IKKE IP-adressene, VLAN-oppsettet eller testresultatet. Ikke anta at oppsettet virker; be eleven beskrive ett relevant funn. Oppdragene må bestås i rekkefølge med «Kontroller oppdraget» ved kartet eller konfigurasjonen. Resultatvinduet viser feilene og lenker til innstillingene. En enkelt ping åpner ikke neste oppdrag. Ingen XP eller godkjenning av forståelse.';
