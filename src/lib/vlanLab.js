// A deliberately bounded Layer 2 teaching model, not a switch operating system.
/** @typedef {'excluded'|'untagged'|'tagged'} Membership */
/** @typedef {{pvid:number,members:Record<string,Membership>}} PortConfig */
/** @typedef {{vlans:number[],ports:Record<string,PortConfig>}} SwitchConfig */
/** @typedef {{ips:Record<string,string>,switches:Record<string,SwitchConfig>}} VlanConfig */
/** @typedef {{id:string,name:string,switchId:string,port:string,vlan:number,subnet:number,x:number,y:number}} VlanPc */
/** @typedef {{id:string,name:string,x:number,y:number,ports:{id:string,peer:string}[]}} VlanSwitch */
/** @typedef {{id:string,a:string,aPort:string,b:string,bPort:string}} VlanLink */
/** @typedef {{id:string,title:string,goal:string,theory:string[],hints:string[],reflect:string,switchCount:number,groups:number[],editableSwitches:boolean,preconfigured:boolean,pcs:VlanPc[],switches:VlanSwitch[],links:VlanLink[]}} VlanTask */
/** @typedef {{text:string,node:string,link?:string,ok:boolean}} TraceStep */
/** @typedef {{ok:boolean,code:string,message:string,steps:TraceStep[]}} PingResult */

export const vlanActivity = {
	id: 'vlan-lab', tittel: 'VLAN-laben',
	beskrivelse: 'Gi PC-er IP-adresser, skill nettverk med VLAN og bygg trunk mellom tre switcher.',
	href: '/nettverk/vlan/', fag: 'drift', audience: 'student', format: 'aktivitet',
	type: 'Interaktiv nettverkslab · utkast',
	emner: ['IP-adresser', 'VLAN', 'PVID', 'Trunk'],
	sokeord: ['switch', 'svitsj', 'tagged', 'untagged', 'native', 'default', 'nettverk', 'ping'],
	symbol: '↔'
};

/** @type {Omit<VlanTask,'pcs'|'switches'|'links'>[]} */
const definitions = [
	{
		id: 'ip', title: 'Få to PC-er på nett', switchCount: 1, groups: [1],
		editableSwitches: false, preconfigured: true,
		goal: 'PC A og PC B skal kunne nå hverandre i 192.168.10.0/24. Switchen er ferdig satt opp. Endre IP-adressen som er i feil nett.',
		theory: [
			'En switch kobler enheter sammen. Først bruker begge portene standard VLAN 1.',
			'Alle PC-ene i laben har masken /24 (255.255.255.0). De tre første tallene angir nettet; siste tall skiller PC-ene.',
			'I 192.168.10.0/24 kan du bruke vertsadresser fra .1 til .254. .0 er nettadressen og .255 er broadcast. PC-ene må ha ulike adresser.'
		],
		hints: ['Sammenlign de tre første tallene i IP-adressene.', 'PC A har 192.168.10.11. PC B kan for eksempel bruke 192.168.10.12.'],
		reflect: 'Hvorfor er det ikke nok at begge PC-ene er koblet til samme switch?'
	},
	{
		id: 'to-nett', title: 'To nett på én switch', switchCount: 1, groups: [10, 20],
		editableSwitches: false, preconfigured: true,
		goal: 'Gi A og B ulike adresser i 192.168.10.0/24. Gi C og D ulike adresser i 192.168.20.0/24. Portene er allerede delt i VLAN 10 og 20.',
		theory: [
			'Et VLAN er et eget logisk lokalnett i switchen. En broadcast i VLAN 10 blir ikke sendt til porter som bare er i VLAN 20.',
			'VLAN-ID og IP-nett er ulike ting. VLAN 10 betyr ikke automatisk 192.168.10.0/24; her bruker vi like tall for å gjøre oppgaven lett å følge.',
			'Ingen ruter er med i laben. Hvert par skal kunne kommunisere innenfor sitt nett; trafikk mellom de to IP-nettene trenger ruting.'
		],
		hints: ['Velg en PC. Mål-nettet står ved IP-feltet.', 'Prøv A → B og C → D. Sammenlign deretter A → C.'],
		reflect: 'Hvis C fikk en adresse i samme IP-nett som A, ville de da automatisk være i samme VLAN?'
	},
	{
		id: 'porter', title: 'Sett VLAN på PC-portene', switchCount: 1, groups: [10, 20],
		editableSwitches: true, preconfigured: false,
		goal: 'IP-adressene er klare. Opprett VLAN 10 og 20 på S1. Sett A/B i VLAN 10 og C/D i VLAN 20. PC-portene skal sende uten VLAN-tag og ta imot i riktig PVID.',
		theory: [
			'PC-ene i denne laben sender og mottar rammer uten VLAN-tag.',
			'PVID er portens VLAN for innkommende rammer uten tag. Untagged betyr at switchen sender dette VLAN-et uten tag på porten. Begge valgene må passe PC-ens nett.',
			'Default VLAN er VLAN 1 i startoppsettet. Det er ikke det samme som en default gateway. Å velge et annet untagged VLAN her fjerner det tidligere untagged-medlemskapet, men endrer ikke PVID automatisk.'
		],
		hints: ['Velg S1. Opprett VLAN-ene før du velger en port.', 'På porten til A: velg Untagged ved VLAN 10 og sett PVID til 10. Andre VLAN skal være Utenfor på denne PC-porten.'],
		reflect: 'Hva forteller PVID om trafikk inn, og hva forteller untagged om trafikk ut?'
	},
	{
		id: 'trunk', title: 'Frakt to VLAN mellom switcher', switchCount: 2, groups: [10, 20],
		editableSwitches: true, preconfigured: true,
		goal: 'A/B tilhører VLAN 10, C/D VLAN 20. PC-portene er klare, men uplinken frakter bare VLAN 1. La VLAN 10 og 20 gå tagged på begge ender av forbindelsen mellom S1 og S2.',
		theory: [
			'En trunk er en forbindelse som kan frakte flere VLAN. En 802.1Q-tag forteller mottakerswitchen hvilket VLAN rammen tilhører.',
			'På uplinken skal både VLAN 10 og 20 være Tagged. Et VLAN må finnes og være tillatt på begge switchene. PC-portene skal fortsatt være Untagged.',
			'En trunk kan også ha et untagged/native VLAN. Her starter begge uplinkene med VLAN 1 untagged og PVID 1. Hvis du endrer native VLAN, må begge ender være enige, ellers kan umerket trafikk havne i feil VLAN.'
		],
		hints: ['Undersøk port 3 på begge switchene.', 'Sett VLAN 10 og 20 til Tagged på S1 port 3 og S2 port 3. Behold det matchende native VLAN 1 i dette forsøket.'],
		reflect: 'Hvorfor er det ikke nok å konfigurere trunk bare på S1?'
	},
	{
		id: 'tre-switcher', title: 'Bygg gjennom tre switcher', switchCount: 3, groups: [30, 40],
		editableSwitches: true, preconfigured: false,
		goal: 'Bygg to adskilte nett gjennom S1–S2–S3. A/B/C skal bruke VLAN 30 og 192.168.30.0/24. D/E/F skal bruke VLAN 40 og 192.168.40.0/24. IP-adressene er klare; planlegg VLAN og porter selv.',
		theory: [
			'Samme VLAN må være tilgjengelig hele veien, også på switchen i midten.',
			'Bruk portoversikten til å skille PC-porter fra forbindelser mellom switcher. Kontroller både et par som skal nå hverandre og skillet mellom gruppene.'
		],
		hints: ['Følg A → C gjennom begge kablene. Hvilke porter møter trafikken?', 'S2 har to uplinker. Begge må frakte VLAN 30 og 40 tagged, i tillegg til oppsettet på S1 og S3.'],
		reflect: 'Forklar hele reisen fra A til C. Hva ville skjedd om VLAN 40 manglet på én av uplinkene?'
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
	const pcs = [];
	const perGroup = n === 1 ? 2 : n;
	definition.groups.forEach((vlan, group) => {
		for (let i = 0; i < perGroup; i++) {
			const sw = switches[n === 1 ? 0 : i];
			const index = group * perGroup + i;
			const pc = {
				id: `pc${index + 1}`, name: `PC ${String.fromCharCode(65 + index)}`,
				switchId: sw.id, port: String(n === 1 ? index + 1 : group + 1),
				vlan, subnet: vlan === 1 ? 10 : vlan,
				x: n === 1 ? 270 + i * 360 : sw.x,
				y: group === 0 ? 65 : 375
			};
			pcs.push(pc);
			sw.ports.push({ id: pc.port, peer: pc.name });
		}
	});
	/** @type {VlanLink[]} */
	const links = [];
	for (let i = 0; i < n - 1; i++) {
		const a = switches[i], b = switches[i + 1];
		const link = { id: `${a.id}-${b.id}`, a: a.id, aPort: i === 0 ? '3' : '4', b: b.id, bPort: '3' };
		links.push(link);
		a.ports.push({ id: link.aPort, peer: `${b.name} · port ${link.bPort}` });
		b.ports.push({ id: link.bPort, peer: `${a.name} · port ${link.aPort}` });
	}
	return { ...definition, pcs, switches, links };
}
export const vlanTasks = definitions.map(topology);
/** @param {string} id */
export const vlanTask = (id) => vlanTasks.find((task) => task.id === id) ?? vlanTasks[0];

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
		config.ips[pc.id] = task.id === 'to-nett' ? '' : `192.168.${pc.subnet}.${11 + i}`;
		if (task.preconfigured) {
			config.switches[pc.switchId].ports[pc.port] = { pvid: pc.vlan, members: { [pc.vlan]: 'untagged' } };
		}
	});
	if (task.id === 'ip') config.ips.pc2 = '192.168.20.12';
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

/** Trace the fixed, loop-free topology. PVID translation is modelled, not silently rejected.
 * @param {VlanTask} task @param {VlanConfig} config @param {string} sourceId @param {string} targetId
 * @returns {PingResult}
 */
export function traceVlan(task, config, sourceId, targetId) {
	const source = task.pcs.find((pc) => pc.id === sourceId);
	const target = task.pcs.find((pc) => pc.id === targetId);
	/** @type {TraceStep[]} */ const steps = [];
	/** @param {string} code @param {string} text @param {string} node @param {string} [link] */
	const stop = (code, text, node, link) => ({ ok: false, code, message: text, steps: [...steps, { text, node, link, ok: false }] });
	if (!source || !target || source === target) return stop('pair', 'Velg to forskjellige PC-er.', sourceId);
	let current = config.switches[source.switchId];
	const ingress = current.ports[source.port];
	let vlan = ingress.pvid;
	steps.push({ text: `${source.name} sender uten VLAN-tag.`, node: source.id, link: source.id, ok: true });
	if (!allows(current, ingress, vlan)) return stop('pvid', `${source.switchId.toUpperCase()} port ${source.port}: PVID ${vlan} er ikke et tillatt VLAN på porten.`, source.switchId);
	steps.push({ text: `${source.switchId.toUpperCase()} port ${source.port} plasserer umerket trafikk i VLAN ${vlan} (PVID).`, node: source.switchId, ok: true });
	let index = task.switches.findIndex((sw) => sw.id === source.switchId);
	const targetIndex = task.switches.findIndex((sw) => sw.id === target.switchId);
	const direction = Math.sign(targetIndex - index);
	while (index !== targetIndex) {
		const here = task.switches[index], next = task.switches[index + direction];
		const link = task.links.find((item) => (item.a === here.id && item.b === next.id) || (item.b === here.id && item.a === next.id));
		if (!link) return stop('link', 'Ingen kabelforbindelse mellom switchene.', here.id);
		const outId = link.a === here.id ? link.aPort : link.bPort;
		const inId = link.a === next.id ? link.aPort : link.bPort;
		const outgoing = current.ports[outId];
		if (!allows(current, outgoing, vlan)) return stop('egress', `${here.name} port ${outId} slipper ikke ut VLAN ${vlan}. Undersøk VLAN-medlemskapet.`, here.id, link.id);
		const tag = membership(outgoing, vlan) === 'tagged' ? vlan : null;
		steps.push({ text: `${here.name} port ${outId} → ${next.name} port ${inId}: ${tag === null ? `untagged (fra VLAN ${vlan})` : `tagged, VLAN ${tag}`}.`, node: here.id, link: link.id, ok: true });
		current = config.switches[next.id];
		const incoming = current.ports[inId];
		vlan = tag ?? incoming.pvid;
		if (!allows(current, incoming, vlan)) return stop('ingress', `${next.name} port ${inId} avviser VLAN ${vlan}. VLAN-et må finnes og være tillatt her.`, next.id, link.id);
		steps.push({ text: `${next.name} tar imot i VLAN ${vlan}${tag === null ? `, bestemt av portens PVID ${incoming.pvid}` : ', bestemt av taggen'}.`, node: next.id, ok: true });
		index += direction;
	}
	const destination = current.ports[target.port];
	if (!allows(current, destination, vlan)) return stop('isolated', `${target.switchId.toUpperCase()} port ${target.port} er ikke med i VLAN ${vlan}. Rammen sendes ikke til ${target.name}.`, target.switchId, target.id);
	if (membership(destination, vlan) !== 'untagged') return stop('pc-tag', `${target.name} mottar en tagged ramme. PC-ene i denne laben trenger untagged ut fra switchen.`, target.id, target.id);
	steps.push({ text: `${target.name} mottar rammen uten tag fra VLAN ${vlan}.`, node: target.id, link: target.id, ok: true });
	return { ok: true, code: 'delivered', message: 'Rammen når fram.', steps };
}

/** @param {VlanTask} task @param {VlanConfig} config @param {string} sourceId @param {string} targetId @returns {PingResult} */
export function pingVlan(task, config, sourceId, targetId) {
	/** @param {string} id */
	const name = (id) => task.pcs.find((pc) => pc.id === id)?.name ?? id;
	/** @param {string} code @param {string} message */
	const stop = (code, message) => ({ ok: false, code, message, steps: [{ text: message, node: sourceId, ok: false }] });
	if (sourceId === targetId) return stop('pair', 'Velg to forskjellige PC-er.');
	const source = hostAddress(config.ips[sourceId] ?? ''), target = hostAddress(config.ips[targetId] ?? '');
	if (!source || !target) return stop('ip', `${name(!source ? sourceId : targetId)} trenger en gyldig vertsadresse. Med /24 kan siste tall være 1–254.`);
	if (source.network !== target.network) return stop('routing', 'PC-ene er i ulike /24-nett. Trafikken trenger en ruter/default gateway; denne laben har ingen ruting.');
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
	const steps = [...outward.steps, { text: 'Retur: mottakeren sender ping-svaret tilbake.', node: targetId, ok: true }, ...back.steps];
	return back.ok
		? { ok: true, code: 'reply', message: 'Ping får svar. Både veien fram og returveien virker i modellen.', steps }
		: { ok: false, code: back.code, message: `Returen stopper: ${back.message}`, steps };
}

/** @param {VlanTask} task @param {VlanConfig} config */
export function checkVlanTask(task, config) {
	const rows = [];
	for (const pc of task.pcs) {
		const address = hostAddress(config.ips[pc.id]);
		const port = config.switches[pc.switchId].ports[pc.port];
		rows.push({ label: `${pc.name}: vertsadresse i 192.168.${pc.subnet}.0/24`, ok: address?.network === `192.168.${pc.subnet}` });
		rows.push({ label: `${pc.name}: bare VLAN ${pc.vlan}, untagged og PVID ${pc.vlan}`, ok:
			port.pvid === pc.vlan && membership(port, pc.vlan) === 'untagged' &&
			config.switches[pc.switchId].vlans.includes(pc.vlan) &&
			Object.entries(port.members).every(([id, mode]) => mode === 'excluded' || Number(id) === pc.vlan) });
	}
	for (let i = 0; i < task.pcs.length; i++) {
		for (const b of task.pcs.slice(i + 1)) {
			const a = task.pcs[i];
			rows.push(a.vlan === b.vlan
				? { label: `${a.name} ↔ ${b.name}: ping får svar`, ok: pingVlan(task, config, a.id, b.id).ok }
				: { label: `${a.name} / ${b.name}: adskilt på VLAN-nivå`, ok: !traceVlan(task, config, a.id, b.id).ok && !traceVlan(task, config, b.id, a.id).ok });
		}
	}
	for (const link of task.links) {
		const a = config.switches[link.a], b = config.switches[link.b];
		const left = a.ports[link.aPort], right = b.ports[link.bPort];
		for (const vlan of task.groups) rows.push({
			label: `${link.a.toUpperCase()} ↔ ${link.b.toUpperCase()}: VLAN ${vlan} tagged i begge ender`,
			ok: a.vlans.includes(vlan) && b.vlans.includes(vlan) && membership(left, vlan) === 'tagged' && membership(right, vlan) === 'tagged'
		});
		const native = (/** @type {PortConfig} */ port) => Object.entries(port.members).find(([, mode]) => mode === 'untagged')?.[0];
		const ln = native(left), rn = native(right);
		rows.push({ label: `${link.a.toUpperCase()} ↔ ${link.b.toUpperCase()}: samsvar for untagged/native VLAN`,
			ok: ln === rn && (ln === undefined || (Number(ln) === left.pvid && Number(rn) === right.pvid)) });
	}
	return { passed: rows.every((row) => row.ok), rows };
}

/** Only explicit view state is shared with the labpartner; never IP inputs or entire configuration. */
export const vlanContextLimit = 'Du ser valgt oppdrag, enhet, port og om en test er kjørt eller utdatert. Du ser IKKE IP-adressene, VLAN-oppsettet eller testresultatet. Ikke anta at oppsettet virker; be eleven beskrive ett relevant funn. Ingen XP eller godkjenning av forståelse.';
