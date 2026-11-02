import { vlanTasks, checkVlanTask } from './vlanLab.js';
import { vlan2Tasks, checkVlan2Task, networkPairs } from './vlanLab2.js';

// Public practice is deliberately separate from accounts, XP and server-confirmed progress.
// Only configurations are stored. Every restored pass is checked again by the current model.
const PREFIX = 'it-laben-public:network:v1:';

/** @param {unknown} value @returns {Record<string, unknown>} */
function record(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Ugyldig oppsett.');
	return /** @type {Record<string, unknown>} */ (value);
}
/** @param {unknown} value */
function address(value) {
	if (typeof value !== 'string' || value.length > 15) throw new TypeError('Ugyldig adressefelt.');
	return value;
}
/** @param {unknown} value */
function vlan(value) {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 4094) throw new TypeError('Ugyldig VLAN.');
	return value;
}
/** @param {unknown} value */
function boolean(value) {
	if (typeof value !== 'boolean') throw new TypeError('Ugyldig valg.');
	return value;
}
/** @template T @param {unknown} value @param {string[]} keys @param {(value:unknown) => T} read @returns {Record<string,T>} */
function fields(value, keys, read) {
	const source = record(value);
	return Object.fromEntries(keys.map((key) => [key, read(source[key])]));
}
/** @param {unknown} value @param {import('./vlanLab.js').VlanSwitch[] | import('./vlanLab2.js').Switch[]} devices @returns {Record<string,import('./vlanLab.js').SwitchConfig>} */
function switches(value, devices) {
	const source = record(value);
	return Object.fromEntries(devices.map((device) => {
		const item = record(source[device.id]);
		if (!Array.isArray(item.vlans) || item.vlans.length < 1 || item.vlans.length > 8) throw new TypeError('Ugyldige VLAN.');
		const vlans = item.vlans.map(vlan);
		if (!vlans.includes(1) || new Set(vlans).size !== vlans.length) throw new TypeError('Ugyldige VLAN.');
		const ports = fields(item.ports, device.ports.map((port) => port.id), (value) => {
			const port = record(value), rawMembers = record(port.members);
			if (Object.keys(rawMembers).length > 8) throw new TypeError('Ugyldige portvalg.');
			/** @type {Record<string,import('./vlanLab.js').Membership>} */
			const members = {};
			for (const [id, mode] of Object.entries(rawMembers)) {
				if (!vlans.some((v) => String(v) === id) || (mode !== 'untagged' && mode !== 'tagged' && mode !== 'excluded')) throw new TypeError('Ugyldige portvalg.');
				members[id] = mode;
			}
			if (Object.values(members).filter((mode) => mode === 'untagged').length > 1) throw new TypeError('Ugyldige portvalg.');
			const pvid = vlan(port.pvid);
			if (!vlans.includes(pvid)) throw new TypeError('Ugyldige portvalg.');
			return { pvid, members };
		});
		return [device.id, { vlans, ports }];
	}));
}
/** @param {import('./vlanLab.js').VlanTask} task @param {unknown} value @returns {import('./vlanLab.js').VlanConfig} */
function readVlan1(task, value) {
	const source = record(value);
	return {
		ips: fields(source.ips, task.pcs.map((pc) => pc.id), address),
		switches: switches(source.switches, task.switches)
	};
}
/** @param {import('./vlanLab2.js').Task} task @param {unknown} value @returns {import('./vlanLab2.js').Config} */
function readVlan2(task, value) {
	const source = record(value), router = record(source.router);
	if (!Array.isArray(router.interfaces) || router.interfaces.length > 8) throw new TypeError('Ugyldig ruter.');
	const wifi = fields(source.wifi, task.ap ? ['ansatt', 'gjest'] : [], (value) => {
		const item = record(value);
		return { vlan: vlan(item.vlan), enabled: boolean(item.enabled) };
	});
	return {
		ips: fields(source.ips, task.pcs.map((pc) => pc.id), address),
		gateways: fields(source.gateways, task.pcs.map((pc) => pc.id), address),
		ssids: fields(source.ssids, task.pcs.filter((pc) => pc.wireless).map((pc) => pc.id), (value) => {
			if (typeof value !== 'string' || (value !== '' && !Object.hasOwn(wifi, value))) throw new TypeError('Ugyldig SSID.');
			return value;
		}),
		switches: switches(source.switches, task.switches),
		router: {
			interfaces: router.interfaces.map((value) => {
				const item = record(value);
				return { vlan: vlan(item.vlan), ip: address(item.ip) };
			}),
			allow: fields(router.allow, networkPairs(task).map((pair) => pair.key), boolean)
		},
		wifi
	};
}

/** Separate instances allow storage failures and restoration to be tested without a browser.
 * @param {() => Pick<Storage,'getItem'|'setItem'> | null} getStorage
 */
export function createPublicNetworkProgress(getStorage = () => typeof localStorage === 'undefined' ? null : localStorage) {
	/** @type {Map<string,string>} */
	const memory = new Map();
	const volatile = new Set();

	/** @template {{id:string}} T @template C @template {{passed:boolean}} R
	 * @param {string} id @param {T[]} tasks @param {(task:T,value:unknown) => C} parse @param {(task:T,config:C) => R} check
	 */
	function labStore(id, tasks, parse, check) {
		const key = `${PREFIX}${id}`;
		function load() {
			let json = memory.get(key) ?? null, persisted = false, ignored = false;
			if (!volatile.has(key)) {
				try {
					const storage = getStorage();
					if (storage) {
						json = storage.getItem(key);
						persisted = true;
						if (json === null) memory.delete(key); else memory.set(key, json);
					}
				} catch { /* Keep any open-session practice if browser storage is blocked. */ }
			}
			/** @type {Record<string,unknown>} */
			let saved = {};
			if (json !== null) {
				try {
					if (json.length > 128_000) throw new TypeError('For stort oppsett.');
					saved = record(JSON.parse(json));
				} catch { ignored = true; }
			}
			/** @type {{taskId:string,config:C,result:R}[]} */
			const restored = [];
			for (const task of tasks) {
				if (!Object.hasOwn(saved, task.id)) continue;
				try {
					const config = parse(task, saved[task.id]), result = check(task, config);
					if (result.passed) restored.push({ taskId: task.id, config, result });
					else ignored = true;
				} catch { ignored = true; }
			}
			return { tasks: restored, persisted, ignored };
		}
		/** @param {string} taskId @param {C} config */
		function save(taskId, config) {
			const task = tasks.find((task) => task.id === taskId);
			if (!task) throw new TypeError('Ukjent oppdrag.');
			const copy = parse(task, config), result = check(task, copy);
			if (!result.passed) return { saved: false, persisted: false };
			const previous = load();
			const entries = Object.fromEntries(previous.tasks.map((item) => [item.taskId, item.config]));
			entries[taskId] = copy;
			const json = JSON.stringify(entries);
			memory.set(key, json);
			volatile.add(key);
			try {
				const storage = getStorage();
				if (storage) {
					storage.setItem(key, json);
					volatile.delete(key);
					return { saved: true, persisted: true };
				}
			} catch { /* Progress remains usable during navigation in this open session. */ }
			return { saved: true, persisted: false };
		}
		return { load, save };
	}
	return {
		vlan1: labStore('vlan-lab', vlanTasks, readVlan1, checkVlanTask),
		vlan2: labStore('vlan-lab-2', vlan2Tasks, readVlan2, checkVlan2Task)
	};
}

export const publicNetworkProgress = createPublicNetworkProgress();
