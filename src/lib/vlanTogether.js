import { hostAddress, membership } from './vlanLab.js';
import { untaggedVlan } from './networkCheckFeedback.js';

export const vlanTogetherActivity = {
	id: 'vlan-sammen', tittel: 'Nettverksligaen · Bygg et felles nett',
	beskrivelse: 'Bygg ditt nettverk på et felles brett. Avtal porter, koble til medelever og feilsøk kommunikasjonen sammen.',
	href: '/nettverk/vlan-sammen/', fag: 'drift', audience: 'student', format: 'aktivitet',
	type: 'Samarbeidslab · første utkast', emner: ['VLAN', 'Trunk', 'Ruting', 'Samarbeid'],
	sokeord: ['VLAN sammen', 'switch', 'ruter', 'PC', 'nettverk', 'flerspiller', 'ping'], symbol: '⇄'
};
export const togetherGoal = 'Avtal en port- og adresseplan, koble sammen to elevers nett og forklar hvordan ping og svar går gjennom VLAN og eventuelle rutere.';
export const togetherHints = [
	'Trykk Koble kabel. Velg din enhet og en ledig port i menyen ved enheten, og trykk på en switch eller ruter. En medelev velger selv port og godtar forbindelsen.',
	'Begynn med PC-ene i samme /24-nett. U velger VLAN for umerket trafikk inn og ut. T frakter VLAN-taggen mellom switcher. Begge ender må passe sammen.',
	'Til et annet IP-nett trenger PC-en gateway. Ruteren trenger en direkte tilkobling eller en statisk rute, og svaret trenger en returvei.',
	'Endre én innstilling, forutsi resultatet og prøv ping igjen. En godkjent kabel er ikke det samme som fungerende kommunikasjon.'
];
/** @typedef {'pc'|'switch'|'router'} DeviceKind */
/** @typedef {{port:string,vlan:number,ip:string}} RouterInterface */
/** @typedef {{network:string,nextHop:string}} StaticRoute */
/** @typedef {{ip:string,gateway:string}} PcConfig */
/** @typedef {{interfaces:RouterInterface[],routes:StaticRoute[]}} RouterConfig */
/** @typedef {{id:string,owner:string,kind:DeviceKind,name:string,revision:number,config:any,slot?:number}} TogetherDevice */
/** @typedef {{id:string,a:string,aPort:string,b:string,bPort:string}} TogetherLink */
/** @typedef {{id:string,from:string,to:string,source:string,port:string,target:string,expires:number}} CableRequest */
/** @typedef {{devices:TogetherDevice[],links:TogetherLink[],requests:CableRequest[],layoutRevisions?:Record<string,number>}} TogetherState */
/** @typedef {{areaName:string,notes:string,revision:number}} AreaDocument */
/** @typedef {{id:string,name:string,online:boolean,areaName:string,notes:string,documentRevision:number}} Member */
/** @typedef {{id:string,title:string,teacherName:string,paused:boolean,participants:number,joined:boolean}} TogetherRoomListing */
/** @typedef {TogetherState & {id:string,title:string,me:string,owner:boolean,paused:boolean,revision:number,layoutRevision?:number,members:Member[],pings:SharedPing[],serverNow:number}} TogetherRoom */
/** @typedef {{from:string,to:string,text:string,link?:string,phase?:'request'|'reply'}} TraceStep */
/** @typedef {{ok:boolean,code:string,message:string,steps:TraceStep[]}} TogetherPing */
/** @typedef {TogetherPing & {id:string,by:string,from:string,to:string,revision:number,startsAt:number,duration:number,expiresAt:number}} SharedPing */
/** @param {DeviceKind} kind */
export const devicePorts = (kind) => Array.from({ length: kind === 'switch' ? 8 : kind === 'router' ? 4 : 1 }, (_, i) => `eth${i}`);
/** @param {DeviceKind} kind @returns {any} */
export function defaultDeviceConfig(kind) {
	if (kind === 'pc') return { ip: '', gateway: '' };
	if (kind === 'router') return { interfaces: [], routes: [] };
	return { vlans: [1], ports: Object.fromEntries(devicePorts(kind).map((p) => [p, { pvid: 1, members: { 1: 'untagged' } }])) };
}
/** @param {TogetherState} state @param {string} id @param {string} port */
export const portLink = (state, id, port) => state.links.find((l) => l.a === id && l.aPort === port || l.b === id && l.bPort === port);
/** @param {unknown} v */
const object = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
/** @param {number} n */
const vlanId = (n) => Number.isInteger(n) && n >= 1 && n <= 4094;
/** @param {unknown} ok @param {string} message */
function requireInput(ok, message) { if (!ok) throw new Error(message); }
/** @param {any} value @param {string[]} names */
function keys(value, names) { requireInput(object(value) && Object.keys(value).every((k) => names.includes(k)), 'Ukjente konfigurasjonsfelt. Hent lagret oppsett og prøv igjen.'); }
/** @param {unknown} value */
function ip(value, empty = true) {
	if (empty && value === '') return '';
	const address = typeof value === 'string' ? hostAddress(value) : null;
	if (!address) throw new Error('Bruk en gyldig IPv4-vertsadresse. I denne laben brukes /24.');
	return address.address;
}
/** Read an address already validated by the configuration boundary. @param {string} value */
function address(value) {
	const parsed = hostAddress(value);
	if (!parsed) throw new Error('Ugyldig lagret IPv4-adresse.');
	return parsed;
}
/** Validate and rebuild client input before storing or simulating it. @param {DeviceKind} kind @param {unknown} input @returns {any} */
export function validateTogetherConfig(kind, input) {
	const c = /** @type {any} */ (input);
	if (kind === 'pc') { keys(c, ['ip', 'gateway']); return { ip: ip(c.ip), gateway: ip(c.gateway) }; }
	if (kind === 'router') {
		keys(c, ['interfaces', 'routes']);
		requireInput(Array.isArray(c.interfaces) && c.interfaces.length <= 8 && Array.isArray(c.routes) && c.routes.length <= 8, 'Ruteren har plass til åtte interfacer og åtte statiske ruter.');
		/** @type {RouterInterface[]} */
		const interfaces = c.interfaces.map(/** @param {RouterInterface} i */ (i) => {
			keys(i, ['port', 'vlan', 'ip']);
			requireInput(devicePorts(kind).includes(i.port) && (i.vlan === 0 || vlanId(i.vlan)), 'Velg ruterport og VLAN 1–4094, eller 0 for untagged.');
			return { port: i.port, vlan: i.vlan, ip: ip(i.ip, false) };
		});
		requireInput(new Set(interfaces.map((i) => `${i.port}:${i.vlan}`)).size === interfaces.length, 'Samme port og VLAN kan bare ha én interface.');
		requireInput(new Set(interfaces.map((i) => address(i.ip).network)).size === interfaces.length, 'Hver ruterinterface må bruke et eget /24-nett i denne laben.');
		/** @type {StaticRoute[]} */
		const routes = c.routes.map(/** @param {StaticRoute} r */ (r) => {
			keys(r, ['network', 'nextHop']);
			requireInput(typeof r.network === 'string' && r.network.endsWith('.0') && !!hostAddress(r.network.slice(0, -1) + '1'), 'Målnettet skal slutte på .0, for eksempel 10.20.0.0 /24.');
			const nextHop = ip(r.nextHop, false), network = address(r.network.slice(0, -1) + '1').network + '.0';
			requireInput(interfaces.some((i) => address(i.ip).network === address(nextHop).network && i.ip !== nextHop), 'Neste hopp må være en annen ruteradresse i et direkte tilkoblet nett.');
			return { network, nextHop };
		});
		requireInput(new Set(routes.map((r) => r.network)).size === routes.length, 'Bruk bare én statisk rute til hvert /24-nett.');
		return { interfaces, routes };
	}
	keys(c, ['vlans', 'ports']);
	requireInput(Array.isArray(c.vlans) && c.vlans.length >= 1 && c.vlans.length <= 8 && c.vlans.every(vlanId) && new Set(c.vlans).size === c.vlans.length, 'Switchen trenger 1–8 ulike VLAN med ID 1–4094.');
	keys(c.ports, devicePorts('switch'));
	const ports = Object.fromEntries(devicePorts('switch').map((p) => {
		const port = c.ports[p]; keys(port, ['pvid', 'members']); keys(port.members, c.vlans.map(String));
		requireInput(Object.values(port.members).every((mode) => ['untagged', 'tagged', 'excluded'].includes(mode)), 'Velg U, E eller T på portene.');
		requireInput(Object.values(port.members).filter((m) => m === 'untagged').length <= 1, 'En port kan bare ha ett Untagged-VLAN.');
		const members = Object.fromEntries(c.vlans.map(/** @param {number} v */ (v) => [v, port.members[v] ?? 'excluded']));
		return [p, { pvid: untaggedVlan({ pvid: 1, members }) ?? 1, members }];
	}));
	return { vlans: [...c.vlans].sort((a, b) => a - b), ports };
}

/** @typedef {{device:TogetherDevice,port:string,tag:number|null,ip:string}} Endpoint */
/** @param {TogetherState} state @returns {Endpoint[]} */
function endpoints(state) {
	return state.devices.flatMap((d) => d.kind === 'pc'
		? [{ device: d, port: 'eth0', tag: null, ip: d.config.ip }]
		: d.kind === 'router' ? d.config.interfaces.map(/** @param {RouterInterface} i */ (i) => ({ device: d, port: i.port, tag: i.vlan || null, ip: i.ip })) : []);
}
/** Traverse actual cables and U/E/T ports, never route inside a switch. @param {TogetherState} state @param {Endpoint} source */
function broadcast(state, source) {
	const all = endpoints(state), found = [], stops = [], seen = new Set();
	/** @type {{device:string,port:string,tag:number|null,steps:TraceStep[]}[]} */
	const queue = [{ device: source.device.id, port: source.port, tag: source.tag, steps: [] }];
	while (queue.length) {
		const hop = queue.shift();
		if (!hop) break;
		const key = `${hop.device}:${hop.port}:${hop.tag}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const link = portLink(state, hop.device, hop.port);
		if (!link) { stops.push(`${state.devices.find((d) => d.id === hop.device)?.name} ${hop.port} mangler kabel.`); continue; }
		const id = link.a === hop.device ? link.b : link.a, port = link.a === hop.device ? link.bPort : link.aPort;
		const device = state.devices.find((d) => d.id === id);
		if (!device) continue;
		const steps = [...hop.steps, { from: hop.device, to: id, link: link.id, text: `${state.devices.find((d) => d.id === hop.device)?.name} ${hop.port} → ${device.name} ${port}: ${hop.tag === null ? 'untagged' : `VLAN ${hop.tag} tagged`}.` }];
		if (device.kind !== 'switch') {
			for (const ep of all.filter((e) => e.device.id === id && e.port === port && e.tag === hop.tag)) found.push({ ...ep, steps });
			continue;
		}
		const incoming = device.config.ports[port], vlan = hop.tag ?? untaggedVlan(incoming);
		if (vlan === null || !device.config.vlans.includes(vlan) || membership(incoming, vlan) === 'excluded') {
			stops.push(`${device.name} ${port} avviser ${hop.tag === null ? 'umerket trafikk: velg riktig U' : `VLAN ${hop.tag}: kontroller medlemskapet`}.`); continue;
		}
		for (const out of devicePorts('switch').filter((p) => p !== port)) {
			const mode = membership(device.config.ports[out], vlan);
			if (mode !== 'excluded' && portLink(state, id, out)) queue.push({ device: id, port: out, tag: mode === 'tagged' ? vlan : null, steps });
		}
	}
	return { found, stops };
}

/** Return one explained ICMP path and verify the independently routed reply. @param {TogetherState} state @param {string} from @param {string} to @returns {TogetherPing} */
export function pingTogether(state, from, to) {
	const source = state.devices.find((d) => d.id === from && d.kind === 'pc'), target = state.devices.find((d) => d.id === to && d.kind === 'pc');
	/** @param {string} code @param {string} message @param {TraceStep[]} [steps] */
	const failure = (code, message, steps = []) => ({ ok: false, code, message, steps });
	if (!source || !target || source === target) return failure('selection', 'Velg to forskjellige PC-er.');
	if (!hostAddress(source.config.ip) || !hostAddress(target.config.ip)) return failure('ip', 'Begge PC-ene trenger en gyldig IPv4-adresse med /24-maske.');
	if (source.config.ip === target.config.ip) return failure('duplicate', 'PC-ene har samme IP-adresse. Et lokalt svar fra egen adresse viser ikke forbindelse til den andre PC-en.');
	/** @param {TogetherDevice} start @param {TogetherDevice} destination */
	function travel(start, destination) {
		let current = start; const steps = [], visited = new Set();
		for (let ttl = 0; ttl < 16; ttl++) {
			if (visited.has(current.id)) return failure('route-loop', `Pakken kom tilbake til ${current.name}. Kontroller de statiske rutene.`, steps);
			visited.add(current.id);
			const candidates = endpoints(state).filter((e) => e.device.id === current.id);
			let outgoing;
			/** @type {string} */
			let nextHop;
			if (current.kind === 'pc') {
				outgoing = candidates[0];
				nextHop = address(outgoing.ip).network === address(destination.config.ip).network ? destination.config.ip : current.config.gateway;
				if (!hostAddress(nextHop) || address(outgoing.ip).network !== address(nextHop).network) return failure('gateway', `${current.name} trenger en gateway i sitt eget /24-nett.`, steps);
			} else {
				outgoing = candidates.find((e) => address(e.ip).network === address(destination.config.ip).network);
				nextHop = destination.config.ip;
				if (!outgoing) {
					const route = current.config.routes.find(/** @param {StaticRoute} r */ (r) => r.network === address(destination.config.ip).network + '.0');
					if (!route) return failure('route', `${current.name} mangler en rute til ${address(destination.config.ip).network}.0/24.`, steps);
					nextHop = route.nextHop;
					outgoing = candidates.find((e) => address(e.ip).network === address(nextHop).network);
				}
			}
			if (!outgoing) return failure('interface', `${current.name} mangler en interface mot neste hopp.`, steps);
			steps.push({ from: current.id, to: current.id, text: `${current.name}: ${nextHop === destination.config.ip ? 'målet er i et direkte tilkoblet nett' : `sender via neste hopp ${nextHop}`}.` });
			const segment = broadcast(state, outgoing);
			if (segment.found.some((e) => e.ip === outgoing.ip)) return failure('duplicate', `Adressekonflikt ved ${current.name}: ${outgoing.ip} finnes flere steder på samme VLAN-forbindelse.`, steps);
			const reachable = [...new Map(segment.found.filter((e) => e.ip === nextHop).map((e) => [`${e.device.id}:${e.port}:${e.tag}`, e])).values()];
			if (reachable.length > 1) return failure('duplicate', `Flere enheter svarer på ${nextHop}. Avtal unike adresser.`, steps);
			if (!reachable.length) return failure('vlan', `Ingen lokal VLAN-vei fra ${current.name} til ${nextHop}. ${segment.stops[0] ?? 'Kontroller kabler, U/T i begge ender og adressen til neste hopp.'}`, steps);
			const next = reachable[0]; steps.push(...next.steps);
			if (next.device.id === destination.id) return { ok: true, code: 'delivered', message: 'Pakken når fram.', steps };
			if (next.device.kind !== 'router') return failure('gateway', `${next.device.name} svarer på ${nextHop}, men er ikke ruteren til målet.`, steps);
			current = next.device;
		}
		return failure('ttl', 'Pakken nådde grensen på 16 rutere. Kontroller rutene.', steps);
	}
	const forward = travel(source, target);
	if (!forward.ok) return { ...forward, steps: forward.steps.map((step) => ({ ...step, phase: 'request' })) };
	const reply = travel(target, source);
	/** @type {TraceStep[]} */
	const steps = [...forward.steps.map((step) => ({ ...step, phase: /** @type {const} */ ('request') })), { from: target.id, to: target.id, phase: 'reply', text: 'Ping nådde målet. Nå prøves returveien.' }, ...reply.steps.map((step) => ({ ...step, phase: /** @type {const} */ ('reply') }))];
	return reply.ok ? { ok: true, code: 'reply', message: 'Ping-svar mottatt. Både fram- og returveien virker i modellen.', steps }
		: failure(reply.code, `Pakken når fram, men svaret stopper: ${reply.message}`, steps);
}
