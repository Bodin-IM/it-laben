import { isDeepStrictEqual } from 'node:util';
import { transaction } from './database.js';
import { vlanTasks, initialVlanConfig, checkVlanTask } from '../src/lib/vlanLab.js';
import {
	vlan2Tasks,
	initialVlan2Config,
	checkVlan2Task,
	networkPairs
} from '../src/lib/vlanLab2.js';

export const NETWORK_LAB_VERSION = 1;
const definitions = {
	'vlan-lab': { tasks: vlanTasks, initial: initialVlanConfig, check: checkVlanTask },
	'vlan-lab-2': { tasks: vlan2Tasks, initial: initialVlan2Config, check: checkVlan2Task }
};
function definition(id) {
	if (!Object.hasOwn(definitions, id)) throw new TypeError('Ukjent nettverkslab.');
	return definitions[id];
}
function locked(message) {
	throw Object.assign(new Error(message), { code: 'NETWORK_LOCKED', status: 403 });
}
function record(value, keys) {
	if (
		!value ||
		typeof value !== 'object' ||
		Array.isArray(value) ||
		Object.keys(value).length !== keys.length ||
		keys.some((key) => !Object.hasOwn(value, key))
	)
		throw new TypeError('Ugyldige felt i nettverksoppsettet.');
}
function vlan(value) {
	if (!Number.isInteger(value) || value < 1 || value > 4094)
		throw new TypeError('VLAN-ID må være 1–4094.');
}
function address(value) {
	if (typeof value !== 'string' || value.length > 15) throw new TypeError('Ugyldig adressefelt.');
}

// Validate before running the model. The client cannot alter topology, fixed devices or task goals.
export function validateNetworkConfig(labId, task, config) {
	const second = labId === 'vlan-lab-2';
	record(
		config,
		second ? ['ips', 'gateways', 'ssids', 'switches', 'router', 'wifi'] : ['ips', 'switches']
	);
	record(
		config.ips,
		task.pcs.map((pc) => pc.id)
	);
	Object.values(config.ips).forEach(address);
	record(
		config.switches,
		task.switches.map((sw) => sw.id)
	);
	for (const sw of task.switches) {
		const c = config.switches[sw.id];
		record(c, ['vlans', 'ports']);
		if (
			!Array.isArray(c.vlans) ||
			!c.vlans.includes(1) ||
			c.vlans.length > 8 ||
			new Set(c.vlans).size !== c.vlans.length
		)
			throw new TypeError('Bruk 1–8 unike VLAN, inkludert VLAN 1.');
		c.vlans.forEach(vlan);
		record(
			c.ports,
			sw.ports.map((p) => p.id)
		);
		for (const p of Object.values(c.ports)) {
			record(p, ['pvid', 'members']);
			vlan(p.pvid);
			if (
				!c.vlans.includes(p.pvid) ||
				!p.members ||
				typeof p.members !== 'object' ||
				Array.isArray(p.members) ||
				Object.keys(p.members).length > 8
			)
				throw new TypeError('PVID og portmedlemskap må vise til opprettede VLAN.');
			for (const [id, mode] of Object.entries(p.members))
				if (
					!c.vlans.some((v) => String(v) === id) ||
					!['tagged', 'untagged', 'excluded'].includes(mode)
				)
					throw new TypeError('Ugyldig VLAN-medlemskap.');
			if (Object.values(p.members).filter((v) => v === 'untagged').length > 1)
				throw new TypeError('En port kan ha høyst ett untagged VLAN.');
		}
	}
	const initial = definitions[labId].initial(task);
	if (
		!(second ? task.editSwitches : task.editableSwitches) &&
		!isDeepStrictEqual(config.switches, initial.switches)
	)
		throw new TypeError('Det ferdige switchoppsettet kan ikke endres i dette oppdraget.');
	if (!second) return config;
	record(
		config.gateways,
		task.pcs.map((p) => p.id)
	);
	Object.values(config.gateways).forEach(address);
	record(
		config.ssids,
		task.pcs.filter((p) => p.wireless).map((p) => p.id)
	);
	record(config.wifi, task.ap ? ['ansatt', 'gjest'] : []);
	for (const s of Object.values(config.ssids))
		if (s !== '' && !Object.hasOwn(config.wifi, s)) throw new TypeError('Ukjent SSID.');
	for (const w of Object.values(config.wifi)) {
		record(w, ['vlan', 'enabled']);
		vlan(w.vlan);
		if (typeof w.enabled !== 'boolean') throw new TypeError('Ugyldig Wi-Fi-status.');
	}
	record(config.router, ['interfaces', 'allow']);
	if (!Array.isArray(config.router.interfaces) || config.router.interfaces.length > 8)
		throw new TypeError('Ruteren støtter inntil åtte VLAN-interfacer.');
	for (const r of config.router.interfaces) {
		record(r, ['vlan', 'ip']);
		vlan(r.vlan);
		address(r.ip);
	}
	record(
		config.router.allow,
		networkPairs(task).map((p) => p.key)
	);
	if (Object.values(config.router.allow).some((v) => typeof v !== 'boolean'))
		throw new TypeError('Ugyldig tilgangsregel.');
	if (!task.editRouter && !isDeepStrictEqual(config.router.interfaces, initial.router.interfaces))
		throw new TypeError('Ruterens interfacer er ferdig satt opp.');
	if (!task.editPolicy && !isDeepStrictEqual(config.router.allow, initial.router.allow))
		throw new TypeError('Tilgangsreglene er ferdig satt opp i dette oppdraget.');
	return config;
}
function passes(db, userId, labId) {
	return db
		.prepare(
			'SELECT task_id,config_json,passed_at FROM network_lab_passes WHERE user_id=? AND lab_id=? AND version=?'
		)
		.all(userId, labId, NETWORK_LAB_VERSION);
}
function lab1Passed(db, userId) {
	const ids = new Set(passes(db, userId, 'vlan-lab').map((r) => r.task_id));
	return vlanTasks.every((t) => ids.has(t.id));
}
export function networkLabSnapshot(db, userId, labId) {
	const def = definition(labId);
	const unlocked = labId === 'vlan-lab' || lab1Passed(db, userId);
	const saved = unlocked ? passes(db, userId, labId) : [];
	return {
		version: NETWORK_LAB_VERSION,
		unlocked,
		prerequisitePassed: lab1Passed(db, userId),
		tasks: saved
			.filter((r) => def.tasks.some((t) => t.id === r.task_id))
			.map((r) => ({ taskId: r.task_id, config: JSON.parse(r.config_json), passedAt: r.passed_at }))
	};
}
export function checkNetworkLab(db, userId, labId, taskId, body, now = Date.now()) {
	const def = definition(labId),
		index = def.tasks.findIndex((t) => t.id === taskId);
	if (index < 0) throw new TypeError('Ukjent oppdrag.');
	record(body, ['accountId', 'version', 'config']);
	if (body.version !== NETWORK_LAB_VERSION)
		throw new TypeError('Oppdater siden for å bruke gjeldende labversjon.');
	if (body.accountId !== userId)
		throw Object.assign(new Error('En annen profil er pålogget. Oppdater siden.'), {
			code: 'NETWORK_ACCOUNT',
			status: 409
		});
	return transaction(db, () => {
		if (labId === 'vlan-lab-2' && !lab1Passed(db, userId))
			locked('Bestå alle seks oppdrag i VLAN-lab 1 før du starter lab 2.');
		const saved = new Set(passes(db, userId, labId).map((r) => r.task_id));
		if (def.tasks.slice(0, index).some((t) => !saved.has(t.id)))
			locked('Bestå de foregående oppdragene først.');
		const config = validateNetworkConfig(labId, def.tasks[index], body.config);
		const result = def.check(def.tasks[index], config);
		if (result.passed)
			db.prepare(
				`INSERT INTO network_lab_passes VALUES (?,?,?,?,?,?)
			ON CONFLICT(user_id,lab_id,task_id,version) DO UPDATE SET config_json=excluded.config_json`
			).run(userId, labId, taskId, NETWORK_LAB_VERSION, JSON.stringify(config), now);
		return { result, saved: result.passed, ...networkLabSnapshot(db, userId, labId) };
	});
}
