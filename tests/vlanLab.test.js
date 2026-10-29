import test from 'node:test';
import assert from 'node:assert/strict';
import { vlanTasks, vlanTask, initialVlanConfig, hostAddress, traceVlan, pingVlan, checkVlanTask, vlanAvailableThrough } from '../src/lib/vlanLab.js';
import { readPartnerState } from '../src/lib/partnerContext.js';
import { partnerPageById } from '../src/lib/partnerPages.js';
import { pageWork } from '../server/lab-partner/page-context.js';

// Build an independent working port/address plan for each public brief.
function configured(task, offset = 101) {
	const config = initialVlanConfig(task);
	for (const sw of task.switches) config.switches[sw.id].vlans = [...new Set([1, ...task.groups])];
	task.pcs.forEach((pc, i) => {
		config.ips[pc.id] = `${pc.network}.${offset + i}`;
		config.switches[pc.switchId].ports[pc.port] = { pvid: pc.vlan, members: { [pc.vlan]: 'untagged' } };
	});
	for (const link of task.links) for (const [id, portId] of [[link.a, link.aPort], [link.b, link.bPort]]) {
		config.switches[id].ports[portId] = { pvid: 1, members: { 1: 'untagged', ...Object.fromEntries(task.groups.map((id) => [id, 'tagged'])) } };
	}
	return config;
}

test('VLAN: every brief accepts different valid host addresses and starts with work to do', () => {
	for (const task of vlanTasks) {
		assert.equal(checkVlanTask(task, initialVlanConfig(task)).passed, false, task.id);
		assert.equal(checkVlanTask(task, configured(task)).passed, true, task.id);
		assert.equal(checkVlanTask(task, configured(task, 201)).passed, true, task.id);
	}
});

test('VLAN: only current full checks open later tasks; edits and resets require a new check', () => {
	const work = Object.fromEntries(vlanTasks.map((task) => [task.id, { revision: 0, check: null, run: null }]));
	const check = (id, config) => {
		work[id].check = { revision: work[id].revision, result: checkVlanTask(vlanTask(id), config) };
	};
	assert.equal(vlanAvailableThrough(work), 0);
	const first = vlanTasks[0], firstConfig = configured(first);
	work[first.id].run = pingVlan(first, firstConfig, 'pc1', 'pc2');
	assert.equal(work[first.id].run.ok, true);
	assert.equal(vlanAvailableThrough(work), 0, 'a successful ping alone does not open the next task');
	check(first.id, initialVlanConfig(first));
	assert.equal(vlanAvailableThrough(work), 0, 'a failed full check does not open the next task');
	check(first.id, firstConfig);
	assert.equal(vlanAvailableThrough(work), 1);
	check(vlanTasks[2].id, configured(vlanTasks[2]));
	assert.equal(vlanAvailableThrough(work), 1, 'later results cannot skip a prerequisite');
	for (const task of vlanTasks) check(task.id, configured(task));
	assert.equal(vlanAvailableThrough(work), vlanTasks.length - 1);
	work['to-nett'].revision += 1;
	assert.equal(vlanAvailableThrough(work), 1, 'an edit makes the previous check stale');
	assert.equal(work['trunk'].check.result.passed, true, 'later work is preserved');
	check('to-nett', configured(vlanTask('to-nett')));
	assert.equal(vlanAvailableThrough(work), vlanTasks.length - 1);
	work.ip = { revision: 0, check: null, run: null };
	assert.equal(vlanAvailableThrough(work), 0, 'resetting a task requires passing its check again');
});

test('VLAN: host addresses, duplicate hosts and routing are distinguished', () => {
	for (const address of ['', 'x', '192.168.1.0', '192.168.1.255', '192.168.300.2', '127.0.0.1', '224.1.2.3']) assert.equal(hostAddress(address), null);
	const task = vlanTask('ip'), config = configured(task);
	assert.equal(pingVlan(task, config, 'pc1', 'pc2').ok, true);
	config.ips.pc2 = config.ips.pc1;
	assert.equal(pingVlan(task, config, 'pc1', 'pc2').code, 'duplicate');
	config.ips.pc2 = '192.168.20.2';
	assert.equal(pingVlan(task, config, 'pc1', 'pc2').code, 'routing');
	config.ips.pc2 = '192.168.10.0';
	assert.equal(pingVlan(task, config, 'pc1', 'pc2').code, 'ip');
});

test('VLAN: different IP subnets alone must never pass the isolation check', () => {
	const task = vlanTask('porter'), config = initialVlanConfig(task);
	assert.equal(pingVlan(task, config, 'pc1', 'pc3').code, 'routing');
	assert.equal(traceVlan(task, config, 'pc1', 'pc3').ok, true);
	assert.ok(checkVlanTask(task, config).rows.some((row) => row.label.includes('adskilt') && !row.ok));
	const isolated = configured(task);
	isolated.ips.pc3 = `${task.pcs[0].network}.210`;
	assert.equal(pingVlan(task, isolated, 'pc1', 'pc3').code, 'isolated');
});

test('VLAN: every trunk hop and return direction matter; PCs cannot receive tags', () => {
	const task = vlanTask('tre-switcher'), config = configured(task);
	assert.equal(pingVlan(task, config, 'pc1', 'pc3').ok, true);
	config.switches.s2.ports['eth3'].members['30'] = 'excluded';
	assert.match(pingVlan(task, config, 'pc1', 'pc3').message, /S2 eth3/);
	config.switches.s2.ports['eth3'].members['30'] = 'tagged';
	config.switches.s3.ports['eth2'].members['30'] = 'untagged';
	const oneWay = pingVlan(task, config, 'pc1', 'pc3');
	assert.equal(oneWay.ok, false);
	assert.match(oneWay.message, /Returen stopper/);
	config.switches.s3.ports['eth2'].members['30'] = 'tagged';
	config.switches.s3.ports['eth0'].members['30'] = 'tagged';
	assert.equal(pingVlan(task, config, 'pc1', 'pc3').code, 'pc-tag');
});

test('VLAN: a native mismatch can leak frames into another VLAN and is rejected by the mission', () => {
	const task = vlanTask('trunk'), config = configured(task);
	config.switches.s1.ports['eth2'] = { pvid: 10, members: { 10: 'untagged', 20: 'tagged' } };
	config.switches.s2.ports['eth2'] = { pvid: 20, members: { 20: 'untagged', 10: 'tagged' } };
	assert.equal(traceVlan(task, config, 'pc1', 'pc4').ok, true);
	assert.equal(checkVlanTask(task, config).passed, false);
});

test('VLAN: partner context is limited to valid task/device/port state, never raw configuration', () => {
	const values = { taskId: 'trunk', deviceId: 's2', portId: 'eth2', hints: 0, hasRun: true, stale: true, revision: 4 };
	const state = { version: 1, values };
	assert.deepEqual(readPartnerState('vlan-lab', state), state);
	const work = pageWork(partnerPageById('vlan-lab'), state);
	assert.match(work.task.goal, /VLAN 10/);
	assert.match(work.limit, /IKKE IP-adressene/);
	assert.deepEqual(work.openHints, []);
	assert.equal(work.lastRun, undefined);
	for (const patch of [{ ip: 'private' }, { config: {} }, { deviceId: 's3' }, { portId: 'eth3' }, { taskId: 'unknown' }, { hints: 3 }, { revision: -1 }]) {
		assert.throws(() => readPartnerState('vlan-lab', { version: 1, values: { ...values, ...patch } }));
	}
	assert.throws(() => readPartnerState('vlan-lab', { version: 99, values }));
	assert.throws(() => readPartnerState('vlan-lab', { version: 1, values: { ...values, deviceId: 'pc1' } }));
});

test('VLAN: discovery requires the port network and does not reveal assignments in the checklist', () => {
	const task = vlanTask('to-nett');
	const config = configured(task);
	const [first, other] = task.pcs;
	config.ips[first.id] = `${other.network}.210`;
	const result = checkVlanTask(task, config);
	assert.equal(result.passed, false);
	assert.ok(result.rows.some((row) => !row.ok && row.targets.some((target) => target.deviceId === first.id)));
	assert.ok(task.pcs.every((pc) => /^PC \d+$/.test(pc.name)));
	for (const row of result.rows) {
		assert.ok(task.networks.every((network) => !row.label.includes(network)));
		assert.doesNotMatch(row.label, /VLAN [12]\b/);
	}
	config.ips[first.id] = `${first.network}.210`;
	assert.equal(checkVlanTask(task, config).passed, true);
});

test('VLAN: trunk exercise needs VLAN creation, and the final puzzle checks all three networks', () => {
	const trunk = vlanTask('trunk');
	const missingVlan = configured(trunk);
	missingVlan.switches.s2.vlans = [1];
	assert.equal(pingVlan(trunk, missingVlan, 'pc1', 'pc2').code, 'ingress');
	assert.equal(checkVlanTask(trunk, missingVlan).passed, false);
	const task = vlanTask('nettverksnott'), config = configured(task);
	for (const [source, target] of [['pc1', 'pc4'], ['pc2', 'pc5'], ['pc3', 'pc6']]) assert.equal(pingVlan(task, config, source, target).ok, true);
	assert.equal(checkVlanTask(task, config).passed, true);
	config.switches.s2.ports.eth5.members['83'] = 'excluded';
	const blocked = pingVlan(task, config, 'pc2', 'pc5');
	assert.equal(blocked.code, 'egress');
	assert.deepEqual(blocked.steps.at(-1).to, { node: 's2', port: 'eth5' });
	assert.equal(checkVlanTask(task, config).passed, false);
	config.switches.s2.ports.eth5.members['83'] = 'tagged';
	config.switches.s3.ports.eth0.members['83'] = 'excluded';
	const rejected = pingVlan(task, config, 'pc2', 'pc5');
	assert.equal(rejected.code, 'ingress');
	assert.deepEqual(rejected.steps.at(-1).to, { node: 's3', port: 'eth0' });
});

test('VLAN: packet steps form a continuous trip and return, or stop before sending on an IP error', () => {
	for (const task of vlanTasks) {
		const source = task.pcs[0], target = task.pcs.find((pc) => pc.id !== source.id && pc.vlan === source.vlan);
		const result = pingVlan(task, configured(task), source.id, target.id);
		assert.equal(result.ok, true);
		assert.deepEqual(result.steps[0].from, { node: source.id });
		assert.deepEqual(result.steps.at(-1).to, { node: source.id });
		for (let i = 1; i < result.steps.length; i++) assert.deepEqual(result.steps[i].from, result.steps[i - 1].to);
		for (const step of result.steps) for (const point of [step.from, step.to]) {
			if (point.port) assert.ok(task.switches.find((sw) => sw.id === point.node)?.ports.some((port) => port.id === point.port));
			else assert.ok([...task.pcs, ...task.switches].some((device) => device.id === point.node));
		}
	}
	const task = vlanTask('ip'), config = configured(task);
	config.ips.pc2 = '';
	const invalid = pingVlan(task, config, 'pc1', 'pc2');
	assert.equal(invalid.steps.length, 1);
	assert.deepEqual(invalid.steps[0].from, invalid.steps[0].to);
	assert.match(invalid.steps[0].text, /Ingen pakke sendt/);
});

test('VLAN: isolation playback stops at the rejecting switch, including different IP networks', () => {
	for (const task of vlanTasks) {
		const config = configured(task);
		for (const source of task.pcs) for (const target of task.pcs.filter((pc) => pc.vlan !== source.vlan)) {
			const result = pingVlan(task, config, source.id, target.id);
			assert.equal(result.ok, false);
			assert.equal(result.code, 'routing', 'the VLAN animation does not claim an off-subnet ping was sent');
			assert.equal(result.vlanDiagnostic, true);
			assert.match(result.message, /ruter\/default gateway/);
			assert.deepEqual(result.steps[0].from, { node: source.id });
			assert.deepEqual(result.steps.at(-1).to, { node: target.switchId });
			assert.equal(result.steps.at(-1).ok, false);
			assert.equal(result.steps.at(-1).link, undefined, 'the blocked PC cable is not traversed or highlighted');
			assert.ok(result.steps.every((step) => step.to.node !== target.id));
			for (let i = 1; i < result.steps.length; i++) assert.deepEqual(result.steps[i].from, result.steps[i - 1].to);
			const sameSubnet = structuredClone(config);
			sameSubnet.ips[target.id] = `${source.network}.254`;
			const isolated = pingVlan(task, sameSubnet, source.id, target.id);
			assert.equal(isolated.code, 'isolated');
			assert.equal(isolated.vlanDiagnostic, undefined);
			assert.deepEqual(isolated.steps.at(-1).to, { node: target.switchId });
		}
	}
	const task = vlanTask('trunk'), config = configured(task);
	config.switches.s1.ports.eth2.members['10'] = 'excluded';
	const egress = pingVlan(task, config, 'pc1', 'pc4');
	assert.equal(egress.vlanDiagnostic, true);
	assert.deepEqual(egress.steps.at(-1).to, { node: 's1', port: 'eth2' });
	assert.equal(egress.steps.at(-1).link, undefined);
	assert.ok(egress.steps.every((step) => step.to.node !== 's2'));
	config.switches.s1.ports.eth2.members['10'] = 'tagged';
	config.switches.s2.ports.eth2.members['10'] = 'excluded';
	const ingress = pingVlan(task, config, 'pc1', 'pc4');
	assert.deepEqual(ingress.steps.at(-1).to, { node: 's2', port: 'eth2' });
	config.switches.s1.ports.eth0.members['10'] = 'excluded';
	const pvid = pingVlan(task, config, 'pc1', 'pc4');
	assert.deepEqual(pvid.steps.at(-1).to, { node: 's1', port: 'eth0' });

	const shared = initialVlanConfig(vlanTask('porter'));
	const routing = pingVlan(vlanTask('porter'), shared, 'pc1', 'pc3');
	assert.equal(routing.code, 'routing');
	assert.equal(routing.vlanDiagnostic, undefined, 'different IP networks alone must not invent a VLAN barrier');
	assert.equal(routing.steps.length, 1);
	assert.deepEqual(routing.steps[0].from, routing.steps[0].to);
	config.ips.pc1 = '';
	const invalid = pingVlan(task, config, 'pc1', 'pc4');
	assert.equal(invalid.code, 'ip');
	assert.equal(invalid.steps.length, 1);
	assert.deepEqual(invalid.steps[0].from, invalid.steps[0].to);
});
