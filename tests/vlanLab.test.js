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
		config.ips[pc.id] = `192.168.${pc.subnet}.${offset + i}`;
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
	assert.equal(vlanAvailableThrough(work), 4);
	work['to-nett'].revision += 1;
	assert.equal(vlanAvailableThrough(work), 1, 'an edit makes the previous check stale');
	assert.equal(work['trunk'].check.result.passed, true, 'later work is preserved');
	check('to-nett', configured(vlanTask('to-nett')));
	assert.equal(vlanAvailableThrough(work), 4);
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
	isolated.ips.pc3 = '192.168.10.210';
	assert.equal(pingVlan(task, isolated, 'pc1', 'pc3').code, 'isolated');
});

test('VLAN: every trunk hop and return direction matter; PCs cannot receive tags', () => {
	const task = vlanTask('tre-switcher'), config = configured(task);
	assert.equal(pingVlan(task, config, 'pc1', 'pc3').ok, true);
	config.switches.s2.ports['4'].members['30'] = 'excluded';
	assert.match(pingVlan(task, config, 'pc1', 'pc3').message, /S2 port 4/);
	config.switches.s2.ports['4'].members['30'] = 'tagged';
	config.switches.s3.ports['3'].members['30'] = 'untagged';
	const oneWay = pingVlan(task, config, 'pc1', 'pc3');
	assert.equal(oneWay.ok, false);
	assert.match(oneWay.message, /Returen stopper/);
	config.switches.s3.ports['3'].members['30'] = 'tagged';
	config.switches.s3.ports['1'].members['30'] = 'tagged';
	assert.equal(pingVlan(task, config, 'pc1', 'pc3').code, 'pc-tag');
});

test('VLAN: a native mismatch can leak frames into another VLAN and is rejected by the mission', () => {
	const task = vlanTask('trunk'), config = configured(task);
	config.switches.s1.ports['3'] = { pvid: 10, members: { 10: 'untagged', 20: 'tagged' } };
	config.switches.s2.ports['3'] = { pvid: 20, members: { 20: 'untagged', 10: 'tagged' } };
	assert.equal(traceVlan(task, config, 'pc1', 'pc4').ok, true);
	assert.equal(checkVlanTask(task, config).passed, false);
});

test('VLAN: partner context is limited to valid task/device/port state, never raw configuration', () => {
	const values = { taskId: 'trunk', deviceId: 's2', portId: '3', hints: 0, hasRun: true, stale: true, revision: 4 };
	const state = { version: 1, values };
	assert.deepEqual(readPartnerState('vlan-lab', state), state);
	const work = pageWork(partnerPageById('vlan-lab'), state);
	assert.match(work.task.goal, /VLAN 10/);
	assert.match(work.limit, /IKKE IP-adressene/);
	assert.deepEqual(work.openHints, []);
	assert.equal(work.lastRun, undefined);
	for (const patch of [{ ip: 'private' }, { config: {} }, { deviceId: 's3' }, { portId: '4' }, { taskId: 'unknown' }, { hints: 3 }, { revision: -1 }]) {
		assert.throws(() => readPartnerState('vlan-lab', { version: 1, values: { ...values, ...patch } }));
	}
	assert.throws(() => readPartnerState('vlan-lab', { version: 99, values }));
	assert.throws(() => readPartnerState('vlan-lab', { version: 1, values: { ...values, deviceId: 'pc1' } }));
});
