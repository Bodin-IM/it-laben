import test from 'node:test';
import assert from 'node:assert/strict';
import { vlan2Tasks, initialVlan2Config, pingVlan2, checkVlan2Task } from '../src/lib/vlanLab2.js';
import { solveLab2 } from './helpers/networkLabs.js';
import { readPartnerState } from '../src/lib/partnerContext.js';
import { partnerPageById } from '../src/lib/partnerPages.js';
import { pageWork } from '../server/lab-partner/page-context.js';

test('VLAN 2: all five briefs require work and accept different valid host addresses', () => {
	for (const t of vlan2Tasks) {
		assert.equal(checkVlan2Task(t, initialVlan2Config(t)).passed, false, t.id);
		for (const offset of [20, 150]) {
			const result = checkVlan2Task(t, solveLab2(t, offset));
			assert.equal(
				result.passed,
				true,
				`${t.id}: ${JSON.stringify(result.rows.filter((r) => !r.ok))}`
			);
		}
	}
});
test('VLAN 2: routing needs both gateways; same VLAN does not require a gateway', () => {
	const t = vlan2Tasks[0],
		c = solveLab2(t);
	c.gateways.pc2 = '';
	const back = pingVlan2(t, c, 'pc1', 'pc2');
	assert.equal(back.code, 'gateway');
	assert.match(back.message, /Returen/);
	assert.equal(back.steps.at(-1).to, 'pc2');
	c.gateways.pc1 = '10.34.6.1';
	assert.equal(pingVlan2(t, c, 'pc1', 'pc2').code, 'gateway');
	const wifi = vlan2Tasks[2],
		ready = solveLab2(wifi);
	ready.gateways.pc1 = '';
	ready.gateways.pc3 = '';
	assert.equal(pingVlan2(wifi, ready, 'pc1', 'pc3').ok, true);
	assert.equal(pingVlan2(wifi, ready, 'pc1', 'pc2').code, 'gateway');
});
test('VLAN 2: actual VLAN tags, ingress, U membership, all trunk hops and return direction matter', () => {
	const t = vlan2Tasks[4],
		c = solveLab2(t);
	c.switches.s2.ports.eth5.members['37'] = 'excluded';
	const blocked = pingVlan2(t, c, 'pc1', 'pc3');
	assert.equal(blocked.ok, false);
	assert.equal(blocked.steps.at(-1).to, 's2');
	assert.ok(!blocked.steps.some((s) => s.to === 'pc3'));
	c.switches.s2.ports.eth5.members['37'] = 'tagged';
	c.switches.s3.ports.eth0.members['37'] = 'untagged';
	const back = pingVlan2(t, c, 'pc1', 'pc3');
	assert.equal(back.ok, false);
	assert.match(back.message, /Returen/);
	const base = solveLab2(t);
	base.switches.s1.ports.eth4.pvid = 214;
	assert.equal(pingVlan2(t, base, 'pc1', 'r1').ok, true, 'legacy PVID does not override U');
	base.switches.s1.ports.eth4.members['37'] = 'excluded';
	assert.equal(pingVlan2(t, base, 'pc1', 'r1').ok, false, 'a port without U rejects untagged ingress');
	const router = solveLab2(t);
	router.router.interfaces[0].vlan = 38;
	assert.equal(pingVlan2(t, router, 'pc1', 'r1').steps.at(-1).to, 'r1');
});
test('VLAN 2: SSID selection, activation, mapping and AP trunk are functional, not labels', () => {
	const t = vlan2Tasks[2];
	for (const mutate of [
		(c) => (c.ssids.pc3 = ''),
		(c) => (c.wifi.ansatt.enabled = false),
		(c) => (c.wifi.ansatt.vlan = 90),
		(c) => (c.switches.s2.ports.eth5.members['10'] = 'excluded'),
		(c) => (c.switches.s2.ports.eth5.members['10'] = 'untagged')
	]) {
		const c = solveLab2(t);
		mutate(c);
		assert.equal(pingVlan2(t, c, 'pc3', 'r1').ok, false);
		assert.equal(checkVlan2Task(t, c).passed, false);
	}
});
test('VLAN 2: policy blocks at R1, broken connectivity never passes isolation checks', () => {
	const t = vlan2Tasks[3],
		c = solveLab2(t);
	for (const [from, to] of [
		['pc4', 'pc1'],
		['pc1', 'pc4'],
		['pc4', 'pc2'],
		['pc2', 'pc4']
	]) {
		const p = pingVlan2(t, c, from, to);
		assert.equal(p.code, 'policy');
		assert.equal(p.steps.at(-1).to, 'r1');
	}
	assert.equal(pingVlan2(t, c, 'pc4', 'r1').ok, true);
	assert.equal(pingVlan2(t, c, 'pc1', 'pc2').ok, true);
	c.router.allow['ansatt:gjest'] = true;
	assert.equal(checkVlan2Task(t, c).passed, false);
	c.router.allow['ansatt:gjest'] = false;
	c.switches.s2.ports.eth5.members['90'] = 'excluded';
	assert.equal(checkVlan2Task(t, c).passed, false);
	assert.notEqual(pingVlan2(t, c, 'pc4', 'pc1').code, 'policy');
});
test('VLAN 2: address conflicts, missing routes and invalid addresses fail with useful locations', () => {
	const t = vlan2Tasks[2];
	for (const bad of ['', '192.168.74.0', '192.168.74.255', '300.2.3.4']) {
		const c = solveLab2(t);
		c.ips.pc4 = bad;
		assert.equal(pingVlan2(t, c, 'pc4', 'r1').code, 'ip');
	}
	const duplicate = solveLab2(t);
	duplicate.ips.pc3 = duplicate.ips.pc1;
	assert.equal(pingVlan2(t, duplicate, 'pc1', 'pc3').code, 'duplicate');
	duplicate.ips.pc3 = duplicate.gateways.pc3;
	assert.equal(pingVlan2(t, duplicate, 'pc3', 'r1').code, 'duplicate');
	const noRoute = solveLab2(t);
	noRoute.router.interfaces.splice(1, 1);
	assert.equal(pingVlan2(t, noRoute, 'pc1', 'pc2').code, 'route');
	const repeated = solveLab2(t);
	repeated.router.interfaces.push({ ...repeated.router.interfaces[0] });
	assert.equal(checkVlan2Task(t, repeated).passed, false);
});
test('VLAN 2: partner context only accepts known public task/view state', () => {
	const state = {
		version: 1,
		values: { taskId: 'wifi', deviceId: 'ap1', hints: 1, hasRun: true, stale: true, revision: 12 }
	};
	assert.deepEqual(readPartnerState('vlan-lab-2', state), state);
	for (const values of [
		{ ...state.values, config: solveLab2(vlan2Tasks[2]) },
		{ ...state.values, taskId: 'unknown' },
		{ ...state.values, deviceId: 's3' }
	])
		assert.throws(() => readPartnerState('vlan-lab-2', { version: 1, values }));
	const work = pageWork(partnerPageById('vlan-lab-2'), state);
	assert.equal(work.task.title, vlan2Tasks[2].title);
	assert.equal(work.openHints.length, 1);
	assert.match(work.limit, /ikke elevens/);
	assert.equal(JSON.stringify(work).includes('10.48.12.20'), false);
});


test('VLAN 2: U controls ingress without separate PVID configuration', () => {
	for (const task of vlan2Tasks) {
		const config = solveLab2(task);
		for (const sw of Object.values(config.switches))
			for (const port of Object.values(sw.ports)) port.pvid = 1;
		assert.equal(checkVlan2Task(task, config).passed, true, task.id);
		const pc = task.pcs.find((p) => !p.wireless);
		const port = config.switches[pc.switchId].ports[pc.port];
		for (const id of Object.keys(port.members)) port.members[id] = 'excluded';
		const ping = pingVlan2(task, config, pc.id, 'r1');
		assert.equal(ping.ok, false);
		assert.equal(ping.steps.at(-1).to, pc.switchId);
		assert.match(ping.message, /Sett U/);
	}
});
