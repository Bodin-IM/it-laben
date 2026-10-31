import { hostAddress, membership } from './vlanLab.js';
import { portFeedback, untaggedVlan } from './networkCheckFeedback.js';

/** @typedef {{id:string,name:string,vlan:number,network:string,gateway:string}} Network */
/** @typedef {{id:string,name:string,kind:'pc'|'switch'|'router'|'ap',x:number,y:number}} Device */
/** @typedef {Device & {networkId:string,wireless:boolean,switchId:string,port:string}} Client */
/** @typedef {Device & {ports:{id:string,peer:string}[]}} Switch */
/** @typedef {{id:string,title:string,goal:string,ready:string,steps:string[],theory:string[],hints:string[],reflect:string,networks:Network[],pcs:Client[],switches:Switch[],links:import('./vlanLab.js').VlanLink[],router:{switchId:string,port:string},ap:{switchId:string,port:string}|null,devices:Device[],editSwitches:boolean,editRouter:boolean,editWifi:boolean,editPolicy:boolean,isolateGuest:boolean}} Task */
/** @typedef {{ips:Record<string,string>,gateways:Record<string,string>,ssids:Record<string,string>,switches:Record<string,import('./vlanLab.js').SwitchConfig>,router:{interfaces:{vlan:number,ip:string}[],allow:Record<string,boolean>},wifi:Record<string,{vlan:number,enabled:boolean}>}} Config */
/** @typedef {{from:string,to:string,text:string,ok:boolean}} Step */
/** @typedef {{ok:boolean,code:string,message:string,steps:Step[]}} Ping */

export const vlan2Activity = {
	id: 'vlan-lab-2',
	tittel: 'VLAN-lab 2 · Ruter og Wi-Fi',
	beskrivelse:
		'Koble VLAN sammen med en ruter, sett opp trådløse nett og avgrens gjestetilgangen. Krever bestått VLAN-lab 1.',
	href: '/nettverk/vlan-2/',
	fag: 'drift',
	audience: 'student',
	format: 'aktivitet',
	type: 'Interaktiv nettverkslab',
	emner: ['VLAN', 'Ruting', 'Gateway', 'Wi-Fi'],
	sokeord: ['ruter', 'router', 'SSID', 'aksesspunkt', 'trunk', 'nettverk', 'ping'],
	symbol: '↔'
};

const briefs = [
	{
		id: 'gateway',
		title: 'Veien til et annet nett',
		goal: 'Ansatt-PC skal få ping-svar fra Admin-PC i et annet IP-nett. Finn riktig default gateway til begge PC-ene.',
		ready: 'VLAN, trunk og ruteren er ferdige. IP-adressene stemmer, men PC-ene mangler gateway.',
		steps: [
			'Se på R1: hver VLAN-interface har en adresse i sitt nett.',
			'Sett gateway på begge PC-ene. Prøv ping og undersøk både fram- og returveien.'
		],
		theory: [
			'I lab 1 var VLAN adskilte. En ruter kan flytte IP-pakker mellom nett. En switch-trunk alene gjør ikke dette.',
			'Default gateway er adressen til ruteren i PC-ens eget IP-nett. PC-en sender trafikk til andre nett via denne adressen. Mottakeren trenger også en returvei.',
			'Eksempel: 192.168.40.22/24 kan bruke 192.168.40.1 som gateway til andre nett. En annen PC i 192.168.40.0/24 nås direkte uten gateway.'
		],
		hints: [
			'Sammenlign PC-ens tre første tall med adressene på R1.',
			'Gateway på Ansatt-PC må være R1-adressen i Ansatt-nettet. Gjør tilsvarende for Admin-PC.'
		],
		reflect: 'Hvorfor trenger begge PC-ene en gateway når det bare er én av dem som starter ping?'
	},
	{
		id: 'router-trunk',
		title: 'Én kabel, flere rutenett',
		goal: 'Bygg forbindelsen fra to switcher til R1. Opprett én VLAN-interface per nett på ruteren, og få ping mellom Ansatt og Admin.',
		ready:
			'PC-portene og PC-adressene er klare. Ruteren har ingen VLAN-interfacer. Uplinkene står bare i VLAN 1.',
		steps: [
			'Legg til nettverksplanens VLAN-interfacer på R1 med gateway-adressene.',
			'Sett VLAN-ene til T på forbindelsen til R1 og i begge ender mellom switchene. Prøv ping.'
		],
		theory: [
			'En VLAN-interface er en logisk port på ruteren. Flere slike deler den fysiske eth0-kabelen, men har hver sin VLAN-tag og IP-adresse.',
			'R1 sender og mottar tagged trafikk i denne laben. Switchporten mot R1 må frakte de samme VLAN-ene. PC-portene sender fortsatt untagged.',
			'Når R1 har en interface i hvert nett, kjenner den de direkte tilkoblede nettene. Du trenger ingen ekstra statisk rute mellom dem her.'
		],
		hints: [
			'Følg kablene fra PC til S1, videre til R1 og tilbake til den andre switchen.',
			'Et VLAN må finnes på switchen før T kan velges. Kontroller begge ender av hver uplink.'
		],
		reflect: 'Hva skjer med VLAN-taggen og mål-IP-adressen når pakken går gjennom ruteren?'
	},
	{
		id: 'wifi',
		title: 'Trådløst inn i riktig VLAN',
		goal: 'Koble Ansatt-laptop til Lab-Ansatt og Gjest-laptop til Lab-Gjest. Begge skal nå sin gateway; alle nett kan foreløpig kommunisere.',
		ready:
			'Kablet nett og ruting virker. AP1 mangler aktive SSID-er, og switchporten mot AP1 mangler VLAN-tagging.',
		steps: [
			'På AP1: aktiver de to SSID-ene og knytt dem til riktig VLAN i nettverksplanen.',
			'Sett riktig T på switchporten mot AP1. Velg SSID, IP og gateway på hver laptop.'
		],
		theory: [
			'Et aksesspunkt (AP) kobler trådløse klienter til det kablede nettet. SSID er navnet eleven velger i Wi-Fi-listen.',
			'AP1 kobler hvert SSID til et VLAN. På kabelen til switchen merker AP1 trafikken med VLAN-ID. Laptoppen velger SSID; den setter ikke VLAN-tag på Wi-Fi-pakken.',
			'VLAN skiller lokalnettene, men en ruter kan likevel tillate kommunikasjon mellom dem. I neste oppdrag avgrenser du denne tilgangen.'
		],
		hints: [
			'Begynn med Ansatt-laptop → R1. Da undersøker du Wi-Fi, VLAN og IP uten å teste et annet nett.',
			'AP1 og switchporten må bruke samme VLAN-ID. Gateway skal være i laptopens IP-nett.'
		],
		reflect:
			'Hvorfor kan ikke to SSID-navn alene sikre at gjester og ansatte er i forskjellige VLAN?'
	},
	{
		id: 'guest-policy',
		title: 'Gjest betyr begrenset tilgang',
		goal: 'Gjest skal nå sin egen gateway, men ikke Ansatt eller Admin. Ansatt og Admin skal fortsatt kommunisere, også fra Wi-Fi.',
		ready:
			'Alle kabler, adresser og SSID-er virker. R1 tillater foreløpig ruting mellom alle nett.',
		steps: [
			'Forutsi hvilke ping som bør få svar. Prøv dem før du endrer noe.',
			'Endre tilgang mellom VLAN på R1. Kontroller at gjestetrafikk stoppes på ruteren, mens tillatt trafikk fortsatt virker.'
		],
		theory: [
			'VLAN er skille på lag 2. Når ruting er slått på, trenger vi i tillegg regler for hvem som får kommunisere på lag 3.',
			'Her bruker vi en enkel regel per nettpar: tillat eller sperr i begge retninger. Dette er en undervisningsmodell, ikke en full tilstandsbasert brannmur.',
			'Et rødt ping beviser ikke at en regel er riktig. En feil IP eller ødelagt trunk gir også rødt. Kontroll krever derfor at gjesten når gatewayen og at det er R1-regelen som stopper annen trafikk.'
		],
		hints: [
			'Åpne R1 og se Tilgang mellom VLAN.',
			'Sperr begge nettpar med Gjest. Behold Ansatt ↔ Admin. Ikke ødelegg gjestens vei til R1.'
		],
		reflect:
			'Hvordan kan du vise at det er tilgangsregelen som sperrer gjesten, og ikke en kabel- eller VLAN-feil?'
	},
	{
		id: 'campus',
		title: 'Nøtta: nytt bygg, nye forbindelser',
		goal: 'Reparer tre switcher, R1 og AP1 etter omkobling. Ansatt og Admin skal kommunisere. Gjest skal bare nå sin gateway.',
		ready:
			'Flere uavhengige feil finnes i adresser, trunk, ruter og Wi-Fi. VLAN-ID-er, gateway-adresser og portplasseringer er nye.',
		steps: [
			'Bruk nettverksplanen og portnavnene i kartet. Velg én forbindelse å undersøke om gangen.',
			'Få først hver klient fram til R1, så tillatt trafikk mellom nett. Kontroller også at Gjest blir sperret på R1.'
		],
		theory: [
			'Bytt strategi fra å følge en oppskrift til å samle bevis. Lokal IP → port/SSID → trunk → gateway → tilgangsregel → returvei.',
			'Gateway trenger ikke slutte på .1. Den må være en ledig vertsadresse på ruteren i det samme IP-nettet som klienten.'
		],
		hints: [
			'Test Ansatt-PC → R1 først, deretter Admin-PC → R1. Undersøk hvor hvert forsøk stopper.',
			'Sjekk AP1s SSID/VLAN, S2-porten mot S3 og R1s interface for Admin. Sammenlign gateway på laptopene med planen.'
		],
		reflect:
			'Velg én feil. Forklar hvorfor ping stoppet akkurat der, og hvilken test som viste at rettingen virket.'
	}
];

/** @type {Task[]} */
export const vlan2Tasks = briefs.map((brief, index) => {
	const final = index === 4,
		wifi = index >= 2,
		count = final ? 3 : index ? 2 : 1;
	const ids = final ? [37, 214, 68] : [10, 30, 90];
	const nets = final
		? ['172.23.46', '10.71.8', '192.168.163']
		: index === 0
			? ['192.168.12', '10.34.6']
			: ['10.48.12', '172.19.32', '192.168.74'];
	const names = ['Ansatt', 'Admin', 'Gjest'];
	const networks = names
		.slice(0, wifi ? 3 : 2)
		.map((name, i) => ({
			id: name.toLowerCase(),
			name,
			vlan: ids[i],
			network: nets[i],
			gateway: `${nets[i]}.${final ? [254, 62, 129][i] : 1}`
		}));
	/** @type {Switch[]} */
	const switches = Array.from({ length: count }, (_, i) => ({
		id: `s${i + 1}`,
		name: `S${i + 1}`,
		kind: 'switch',
		x: count === 1 ? 430 : final ? 180 + i * 280 : 245 + i * 390,
		y: 250,
		ports: []
	}));
	const router = { switchId: 's1', port: final ? 'eth6' : 'eth7' };
	const ap = wifi ? { switchId: `s${count}`, port: final ? 'eth7' : 'eth5' } : null;
	/** @type {Client[]} */
	const pcs = [
		{
			id: 'pc1',
			name: 'Ansatt-PC',
			kind: 'pc',
			networkId: 'ansatt',
			wireless: false,
			switchId: 's1',
			port: final ? 'eth4' : 'eth0',
			x: count === 1 ? 200 : 110,
			y: 90
		},
		{
			id: 'pc2',
			name: 'Admin-PC',
			kind: 'pc',
			networkId: 'admin',
			wireless: false,
			switchId: count === 1 ? 's1' : 's2',
			port: final ? 'eth1' : 'eth1',
			x: count === 1 ? 660 : final ? 460 : 635,
			y: 90
		},
		...(wifi
			? /** @type {Client[]} */ ([
					{
						id: 'pc3',
						name: 'Ansatt-laptop',
						kind: 'pc',
						networkId: 'ansatt',
						wireless: true,
						switchId: ap?.switchId ?? '',
						port: ap?.port ?? '',
						x: 470,
						y: 490
					},
					{
						id: 'pc4',
						name: 'Gjest-laptop',
						kind: 'pc',
						networkId: 'gjest',
						wireless: true,
						switchId: ap?.switchId ?? '',
						port: ap?.port ?? '',
						x: 790,
						y: 490
					}
				])
			: [])
	];
	const links = switches
		.slice(1)
		.map((sw, i) => ({
			id: `link${i}`,
			a: switches[i].id,
			aPort: final ? ['eth2', 'eth5'][i] : 'eth3',
			b: sw.id,
			bPort: final ? ['eth3', 'eth0'][i] : 'eth4'
		}));
	/** @param {string} sw @param {string} id @param {string} peer */
	const port = (sw, id, peer) => switches.find((s) => s.id === sw)?.ports.push({ id, peer });
	pcs.filter((pc) => !pc.wireless).forEach((pc) => port(pc.switchId, pc.port, pc.name));
	port(router.switchId, router.port, 'R1 eth0');
	if (ap) port(ap.switchId, ap.port, 'AP1 eth0');
	for (const link of links) {
		port(link.a, link.aPort, `${link.b.toUpperCase()} ${link.bPort}`);
		port(link.b, link.bPort, `${link.a.toUpperCase()} ${link.aPort}`);
	}
	for (const sw of switches) sw.ports.sort((a, b) => a.id.localeCompare(b.id));
	/** @type {Device[]} */
	const devices = [
		...pcs,
		...switches,
		{ id: 'r1', name: 'R1 · Ruter', kind: 'router', x: count === 1 ? 430 : 200, y: 390 },
		...(wifi
			? /** @type {Device[]} */ ([{ id: 'ap1', name: 'AP1 · Wi-Fi', kind: 'ap', x: 700, y: 390 }])
			: [])
	];
	return {
		...brief,
		networks,
		pcs,
		switches,
		links,
		router,
		ap,
		devices,
		editSwitches: index > 0,
		editRouter: index > 0,
		editWifi: wifi,
		editPolicy: index >= 3,
		isolateGuest: index >= 3
	};
});

/** @param {string} a @param {string} b */
export const policyKey = (a, b) => [a, b].sort().join(':');
/** @param {Task} task */
export const networkPairs = (task) =>
	task.networks.flatMap((a, i) =>
		task.networks.slice(i + 1).map((b) => ({ a, b, key: policyKey(a.id, b.id) }))
	);

/** @param {Task} task @returns {Config} */
export function initialVlan2Config(task) {
	const index = vlan2Tasks.findIndex((t) => t.id === task.id);
	/** @type {Record<string,import('./vlanLab.js').SwitchConfig>} */
	const switches = Object.fromEntries(
		task.switches.map((sw) => [
			sw.id,
			{
				vlans: [1, ...task.networks.map((n) => n.vlan)],
				ports: Object.fromEntries(
					sw.ports.map((p) => [
						p.id,
						{
							pvid: 1,
							members: {
								1: 'untagged',
								...Object.fromEntries(task.networks.map((n) => [n.vlan, 'tagged']))
							}
						}
					])
				)
			}
		])
	);
	for (const pc of task.pcs.filter((p) => !p.wireless)) {
		const n = task.networks.find((n) => n.id === pc.networkId);
		if (n)
			switches[pc.switchId].ports[pc.port] = { pvid: n.vlan, members: { [n.vlan]: 'untagged' } };
	}
	/** @type {Config} */
	const config = {
		switches,
		ips: {},
		gateways: {},
		ssids: {},
		router: {
			interfaces: task.networks.map((n) => ({ vlan: n.vlan, ip: n.gateway })),
			allow: Object.fromEntries(networkPairs(task).map((p) => [p.key, true]))
		},
		wifi: {}
	};
	task.pcs.forEach((pc, i) => {
		const n = task.networks.find((n) => n.id === pc.networkId);
		config.ips[pc.id] = `${n?.network}.${[26, 117, 203, 51][i]}`;
		config.gateways[pc.id] = index === 0 ? '' : (n?.gateway ?? '');
		if (pc.wireless) config.ssids[pc.id] = index === 2 ? '' : pc.networkId;
	});
	if (task.ap)
		for (const n of task.networks.filter((n) => n.id !== 'admin'))
			config.wifi[n.id] = { vlan: index === 2 ? 1 : n.vlan, enabled: index !== 2 };
	if (index === 1) {
		config.router.interfaces = [];
		for (const sw of task.switches)
			for (const p of sw.ports)
				if (!task.pcs.some((pc) => !pc.wireless && pc.switchId === sw.id && pc.port === p.id))
					config.switches[sw.id].ports[p.id] = { pvid: 1, members: { 1: 'untagged' } };
	}
	if (index === 2 && task.ap) {
		config.switches[task.ap.switchId].ports[task.ap.port] = { pvid: 1, members: { 1: 'untagged' } };
		for (const pc of task.pcs.filter((p) => p.wireless)) {
			config.ips[pc.id] = '';
			config.gateways[pc.id] = '';
		}
	}
	if (index === 4) {
		config.ips.pc1 = '172.23.64.26';
		config.gateways.pc3 = '172.23.46.1';
		config.router.interfaces[1].vlan = 215;
		config.switches.s2.ports.eth5.members['68'] = 'excluded';
		config.wifi.gjest.vlan = 37;
	}
	return config;
}

/** Model endpoints describe wire tagging, independent of the task's intended network.
 * @typedef {{id:string,switchId:string,port:string,tag:number|null}} Endpoint
 * @param {Task} task @param {Config} config @param {string} id @returns {Endpoint|null}
 */
function endpoint(task, config, id) {
	const pc = task.pcs.find((p) => p.id === id);
	if (!pc) return null;
	if (!pc.wireless) return { id, switchId: pc.switchId, port: pc.port, tag: null };
	const ssid = config.wifi[config.ssids[id]];
	return ssid?.enabled ? { id, switchId: pc.switchId, port: pc.port, tag: ssid.vlan } : null;
}

/** Follow actual L2 ingress and egress; a VLAN can only change at untagged ingress.
 * @param {Task} task @param {Config} config @param {Endpoint} source @param {Endpoint} target @returns {Ping}
 */
function layer2(task, config, source, target) {
	/** @type {Step[]} */ const steps = [];
	/** @param {string} from @param {string} to @param {string} text */
	const move = (from, to, text) => steps.push({ from, to, text, ok: true });
	/** @param {string} at @param {string} text */
	const stop = (at, text) => ({
		ok: false,
		code: 'vlan',
		message: text,
		steps: [...steps, { from: at, to: at, text, ok: false }]
	});
	/** @param {string} sw @param {string} port @param {number} vlan */
	const allowed = (sw, port, vlan) =>
		config.switches[sw].vlans.includes(vlan) &&
		membership(config.switches[sw].ports[port], vlan) !== 'excluded';
	const wirelessSource = task.pcs.find((p) => p.id === source.id)?.wireless;
	if (wirelessSource) move(source.id, 'ap1', 'Wi-Fi: klienten sender til sitt valgte SSID på AP1.');
	move(
		wirelessSource ? 'ap1' : source.id,
		source.switchId,
		`${source.switchId.toUpperCase()} ${source.port} mottar ${source.tag === null ? 'untagged' : `tagged VLAN ${source.tag}`}.`
	);
	let vlan = source.tag ?? untaggedVlan(config.switches[source.switchId].ports[source.port]);
	if (vlan === null) return stop(source.switchId, `${source.switchId.toUpperCase()} ${source.port} avviser umerket trafikk. Sett U på riktig VLAN-rad.`);
	if (!allowed(source.switchId, source.port, vlan))
		return stop(
			source.switchId,
			`${source.port} avviser VLAN ${vlan}. Kontroller VLAN og medlemskap.`
		);
	let i = task.switches.findIndex((s) => s.id === source.switchId);
	const end = task.switches.findIndex((s) => s.id === target.switchId),
		direction = Math.sign(end - i);
	while (i !== end) {
		const here = task.switches[i].id,
			next = task.switches[i + direction].id;
		const link = task.links.find(
			(l) => (l.a === here && l.b === next) || (l.b === here && l.a === next)
		);
		if (!link) return stop(here, 'Ingen forbindelse til neste switch.');
		const out = link.a === here ? link.aPort : link.bPort,
			incoming = link.a === next ? link.aPort : link.bPort;
		if (!allowed(here, out, vlan))
			return stop(here, `${here.toUpperCase()} ${out}: VLAN ${vlan} er Exclude eller mangler.`);
		/** @type {number|null} */
		const tag = membership(config.switches[here].ports[out], vlan) === 'tagged' ? vlan : null;
		move(
			here,
			next,
			`${here.toUpperCase()} ${out} → ${next.toUpperCase()} ${incoming}: ${tag === null ? 'untagged' : `tagged VLAN ${tag}`}.`
		);
		vlan = tag ?? untaggedVlan(config.switches[next].ports[incoming]);
		if (vlan === null) return stop(next, `${next.toUpperCase()} ${incoming} har ikke et Untagged-VLAN for umerket trafikk.`);
		if (!allowed(next, incoming, vlan))
			return stop(next, `${next.toUpperCase()} ${incoming} avviser VLAN ${vlan}.`);
		i += direction;
	}
	const sw = target.switchId,
		port = config.switches[sw].ports[target.port];
	if (!allowed(sw, target.port, vlan))
		return stop(sw, `${sw.toUpperCase()} stopper VLAN ${vlan} før ${target.port}.`);
	const tag = membership(port, vlan) === 'tagged' ? vlan : null;
	const wirelessTarget = task.pcs.find((p) => p.id === target.id)?.wireless;
	const receiver = wirelessTarget ? 'ap1' : target.id;
	move(
		sw,
		receiver,
		`${sw.toUpperCase()} ${target.port} sender ${tag === null ? 'untagged' : `tagged VLAN ${tag}`}.`
	);
	if (tag !== target.tag)
		return stop(
			receiver,
			`${receiver.toUpperCase()} forventer ${target.tag === null ? 'untagged' : `VLAN-tag ${target.tag}`}, men får ${tag === null ? 'untagged' : `VLAN ${tag}`}.`
		);
	if (wirelessTarget) move('ap1', target.id, 'AP1 sender videre på SSID-et til mottakeren.');
	return { ok: true, code: 'delivered', message: 'Rammen når fram.', steps };
}

/** @param {Task} task @param {Config} config @param {string} sourceId @param {string} targetId @returns {Ping} */
export function pingVlan2(task, config, sourceId, targetId) {
	/** @type {Step[]} */ const steps = [];
	/** @param {string} at @param {string} code @param {string} message */
	const stop = (at, code, message) => ({
		ok: false,
		code,
		message,
		steps: [...steps, { from: at, to: at, text: message, ok: false }]
	});
	/** @param {Ping} result */
	const take = (result) => {
		steps.push(...result.steps);
		return result.ok;
	};
	/** @param {number} vlan @returns {Endpoint} */
	const routerEnd = (vlan) => ({ id: 'r1', ...task.router, tag: vlan });
	const source = endpoint(task, config, sourceId),
		target = endpoint(task, config, targetId);
	if (
		!task.pcs.some((p) => p.id === sourceId) ||
		sourceId === targetId ||
		(targetId !== 'r1' && !task.pcs.some((p) => p.id === targetId))
	)
		return stop(sourceId, 'pair', 'Velg en klient og et annet mål.');
	if (!source) return stop(sourceId, 'wifi', 'Klienten må kobles til et aktivt SSID på AP1.');
	if (targetId !== 'r1' && !target)
		return stop(sourceId, 'wifi', 'Mottakeren er ikke koblet til et aktivt SSID.');
	const src = hostAddress(config.ips[sourceId]),
		dst =
			targetId === 'r1'
				? hostAddress(config.gateways[sourceId])
				: hostAddress(config.ips[targetId]);
	if (!src || !dst)
		return stop(
			sourceId,
			'ip',
			'Bruk gyldige vertsadresser. R1 som ping-mål betyr klientens egen gateway.'
		);
	// Detect address conflicts only on reachable L2 segments, including router addresses.
	for (const id of [sourceId, ...(target ? [targetId] : [])]) {
		const ep = endpoint(task, config, id);
		if (!ep) continue;
		const ip = hostAddress(config.ips[id])?.address;
		for (const pc of task.pcs.filter((p) => p.id !== id)) {
			const other = endpoint(task, config, pc.id);
			if (
				other &&
				hostAddress(config.ips[pc.id])?.address === ip &&
				(layer2(task, config, ep, other).ok || layer2(task, config, other, ep).ok)
			)
				return stop(
					id,
					'duplicate',
					'To klienter bruker samme IP i et sammenkoblet VLAN. Velg unike adresser.'
				);
		}
		if (
			config.router.interfaces.some(
				(r) => hostAddress(r.ip)?.address === ip && layer2(task, config, ep, routerEnd(r.vlan)).ok
			)
		)
			return stop(
				id,
				'duplicate',
				'Klienten bruker samme IP som ruteren. Velg en annen vertsadresse.'
			);
	}
	/** One-way route; called again with reversed endpoints to verify the reply.
	 * @param {Endpoint} from @param {Endpoint|null} to @param {string} fromId @param {string} toId
	 * @returns {{code:string,message:string,at:string}|null}
	 */
	function route(from, to, fromId, toId) {
		const a = hostAddress(config.ips[fromId]);
		const b = to ? hostAddress(config.ips[toId]) : hostAddress(config.gateways[fromId]);
		if (!a || !b) return { at: fromId, code: 'ip', message: 'Kontroller IP-adressen.' };
		if (to && a.network === b.network) {
			const result = layer2(task, config, from, to);
			return take(result)
				? null
				: { at: result.steps.at(-1)?.to ?? fromId, code: result.code, message: result.message };
		}
		const gateway = hostAddress(config.gateways[fromId]);
		if (!gateway || gateway.network !== a.network)
			return {
				at: fromId,
				code: 'gateway',
				message: 'Default gateway må være R1-adressen i klientens eget /24-nett.'
			};
		const incoming = config.router.interfaces.find(
			(r) => hostAddress(r.ip)?.address === gateway.address
		);
		if (!incoming)
			return {
				at: fromId,
				code: 'gateway',
				message: 'Ingen interface på R1 har denne gateway-adressen. Undersøk R1 og klienten.'
			};
		const outward = layer2(task, config, from, routerEnd(incoming.vlan));
		if (!take(outward))
			return { at: outward.steps.at(-1)?.to ?? 'r1', code: outward.code, message: outward.message };
		if (!to) {
			const back = layer2(task, config, routerEnd(incoming.vlan), from);
			return take(back)
				? null
				: {
						at: back.steps.at(-1)?.to ?? fromId,
						code: back.code,
						message: `Returen stopper: ${back.message}`
					};
		}
		const outgoing = config.router.interfaces.find((r) => hostAddress(r.ip)?.network === b.network);
		if (!outgoing)
			return {
				at: 'r1',
				code: 'route',
				message:
					'R1 har ingen direkte tilkoblet rute til mottakerens IP-nett. Kontroller VLAN-interfacene.'
			};
		const inNet = task.networks.find((n) => n.vlan === incoming.vlan),
			outNet = task.networks.find((n) => n.vlan === outgoing.vlan);
		if (
			incoming.vlan !== outgoing.vlan &&
			(!inNet || !outNet || config.router.allow[policyKey(inNet.id, outNet.id)] !== true)
		)
			return {
				at: 'r1',
				code: 'policy',
				message: 'R1 sperrer trafikken med tilgangsregelen mellom disse VLAN-ene.'
			};
		steps.push({
			from: 'r1',
			to: 'r1',
			ok: true,
			text: `R1 ruter IP-pakken fra VLAN ${incoming.vlan} til VLAN ${outgoing.vlan}. Mål-IP er fortsatt ${b.address}.`
		});
		const result = layer2(task, config, routerEnd(outgoing.vlan), to);
		return take(result)
			? null
			: { at: result.steps.at(-1)?.to ?? toId, code: result.code, message: result.message };
	}
	const outward = route(source, target, sourceId, targetId);
	if (outward) return stop(outward.at, outward.code, outward.message);
	if (target) {
		steps.push({
			from: targetId,
			to: targetId,
			ok: true,
			text: 'Retur: mottakeren sender ping-svar.'
		});
		const back = route(target, source, targetId, sourceId);
		if (back) return stop(back.at, back.code, `Returen stopper: ${back.message}`);
	}
	return {
		ok: true,
		code: 'reply',
		message: 'Svar mottatt. Både fram- og returvei virker.',
		steps
	};
}

/** @param {Task} task @param {Config} config */
export function checkVlan2Task(task, config) {
	/** @type {{label:string,ok:boolean,deviceId:string,error:string}[]} */ const rows = [];
	/** @param {string} label @param {boolean} ok @param {string} deviceId @param {string} error */
	const row = (label, ok, deviceId, error) => rows.push({ label, ok, deviceId, error: ok ? '' : error });
	for (const n of task.networks) {
		const interfaces = config.router.interfaces.filter((r) => r.vlan === n.vlan);
		row(
			`R1: VLAN ${n.vlan}, gateway ${n.gateway}/24`,
			config.router.interfaces.some((r) => r.vlan === n.vlan && hostAddress(r.ip)?.address === n.gateway),
			'r1',
			interfaces.length
				? `R1: VLAN ${n.vlan} har IP ${interfaces.map((r) => r.ip || '(tom)').join(', ')}. Nettverksplanen krever gateway ${n.gateway}/24.`
				: `R1 har ingen interface for VLAN ${n.vlan}. Legg til VLAN-et med gateway ${n.gateway}/24.`
		);
	}
	const invalidInterface = config.router.interfaces.find((r) => !hostAddress(r.ip));
	const duplicateVlan = new Set(config.router.interfaces.map((r) => r.vlan)).size !== config.router.interfaces.length;
	row(
		'R1: unike VLAN-interfacer og ulike IP-nett',
		!duplicateVlan &&
			new Set(config.router.interfaces.map((r) => hostAddress(r.ip)?.network)).size === config.router.interfaces.length &&
			config.router.interfaces.every((r) => !!hostAddress(r.ip)),
		'r1',
		invalidInterface ? `R1: IP-adressen for VLAN ${invalidInterface.vlan} er tom eller ugyldig. Bruk en vertsadresse fra nettverksplanen.`
			: duplicateVlan ? 'R1 har flere interfacer med samme VLAN-ID. Behold én interface per VLAN.'
				: 'Flere R1-interfacer ligger i samme /24-nett. Bruk et eget IP-nett for hvert VLAN.'
	);
	for (const pc of task.pcs) {
		const n = task.networks.find((n) => n.id === pc.networkId);
		if (!n) continue;
		const address = hostAddress(config.ips[pc.id]);
		row(
			`${pc.name}: IP i ${n.network}.0/24 og gateway ${n.gateway}`,
			address?.network === n.network &&
				hostAddress(config.gateways[pc.id])?.address === n.gateway &&
				config.ips[pc.id] !== n.gateway,
			pc.id,
			!address ? `${pc.name}: IP-adressen er tom eller ugyldig. Bruk en vertsadresse i ${n.network}.0/24.`
				: address.network !== n.network ? `${pc.name} har ${address.address}/24 og ligger i feil nett. Bruk ${n.network}.0/24.`
					: config.ips[pc.id] === n.gateway ? `${pc.name} bruker gatewayens IP-adresse ${n.gateway}. Velg en annen vertsadresse i samme nett.`
						: `${pc.name} har gateway ${config.gateways[pc.id] || '(tom)'}. Sett default gateway til ${n.gateway}.`
		);
		if (pc.wireless) {
			const wrongSsid = config.ssids[pc.id] !== n.id;
			row(
				`${pc.name}: Lab-${n.name} på VLAN ${n.vlan}`,
				!wrongSsid && config.wifi[n.id]?.enabled && config.wifi[n.id]?.vlan === n.vlan,
				wrongSsid ? pc.id : 'ap1',
				wrongSsid ? `${pc.name} er ${config.ssids[pc.id] ? 'koblet til feil SSID' : 'ikke koblet til Wi-Fi'}. Velg Lab-${n.name} på klienten.`
					: !config.wifi[n.id]?.enabled ? `AP1: Lab-${n.name} er avslått. Aktiver dette SSID-et.`
						: `AP1: Lab-${n.name} bruker VLAN ${config.wifi[n.id]?.vlan}. Endre til VLAN ${n.vlan}.`
			);
		} else {
			const sw = config.switches[pc.switchId], p = sw.ports[pc.port];
			row(
				`${pc.switchId.toUpperCase()} ${pc.port}: bare VLAN ${n.vlan} Untagged`,
				sw.vlans.includes(n.vlan) && membership(p, n.vlan) === 'untagged' &&
					Object.entries(p.members).every(([v, mode]) => mode === 'excluded' || Number(v) === n.vlan),
				pc.switchId,
				portFeedback(sw, pc.switchId.toUpperCase(), pc.port, n.vlan, 'untagged')
			);
		}
		const ping = pingVlan2(task, config, pc.id, 'r1');
		row(`${pc.name} ↔ egen gateway: ping får svar`, ping.ok, pc.id, `${pc.name} ↔ egen gateway: ${ping.message}`);
	}
	const uplinks = [
		task.router,
		...task.links.flatMap((l) => [{ switchId: l.a, port: l.aPort }, { switchId: l.b, port: l.bPort }]),
		...(task.ap ? [task.ap] : [])
	];
	for (const p of uplinks) {
		const sw = config.switches[p.switchId];
		const nets = p === task.ap ? task.networks.filter((n) => n.id !== 'admin') : task.networks;
		row(
			`${p.switchId.toUpperCase()} ${p.port}: ${nets.map((n) => n.vlan).join(', ')} Tagged`,
			nets.every((n) => sw.vlans.includes(n.vlan) && membership(sw.ports[p.port], n.vlan) === 'tagged'),
			p.switchId,
			nets.map((n) => portFeedback(sw, p.switchId.toUpperCase(), p.port, n.vlan, 'tagged')).filter(Boolean).join(' ')
		);
	}
	for (const pc of task.pcs)
		for (const other of task.pcs.filter((p) => p.id > pc.id)) {
			const blocked = task.isolateGuest && pc.networkId !== other.networkId && [pc.networkId, other.networkId].includes('gjest');
			const result = pingVlan2(task, config, pc.id, other.id), reverse = pingVlan2(task, config, other.id, pc.id);
			const failure = !result.ok ? result : reverse;
			const unblocked = result.code !== 'policy' ? result : reverse;
			row(
				`${pc.name} ↔ ${other.name}: ${blocked ? 'sperret av R1-regel' : 'ping får svar'}`,
				blocked ? result.code === 'policy' && reverse.code === 'policy' : result.ok && reverse.ok,
				blocked ? 'r1' : pc.id,
				`${pc.name} ↔ ${other.name}: ` + (blocked
					? unblocked.ok ? 'Trafikken slipper gjennom. Slå av tillatelsen mellom gjestenettet og dette nettet på R1.'
						: `${unblocked.message} Her skal R1s tilgangsregel sperre trafikken; en ødelagt forbindelse teller ikke som riktig sperre.`
					: failure.message)
			);
		}
	return { passed: rows.every((r) => r.ok), rows };
}
