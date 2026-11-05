import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDeviceConfig, validateTogetherConfig, pingTogether } from '../src/lib/vlanTogether.js';
import { readPartnerState, ADAPTER_VERSION } from '../src/lib/partnerContext.js';
import { partnerPageById } from '../src/lib/partnerPages.js';
import { pageWork } from '../server/lab-partner/page-context.js';

const pc = (id, ip, gateway = '') => ({ id, owner: id, kind: 'pc', name: id, revision: 0, config: { ip, gateway } });
const sw = (id) => ({ id, owner: id, kind: 'switch', name: id, revision: 0, config: defaultDeviceConfig('switch') });
const router = (id, interfaces, routes = []) => ({ id, owner: id, kind: 'router', name: id, revision: 0, config: validateTogetherConfig('router', { interfaces, routes }) });
const wire = (a, aPort, b, bPort) => ({ id: `${a}:${aPort}-${b}:${bPort}`, a, aPort, b, bPort });
const member = (device, port, vlan, mode) => { device.config.ports[port].members[vlan] = mode; };
function layer2() {
	return {
		devices: [pc('A', '10.10.10.11'), pc('B', '10.10.10.12'), sw('S1'), sw('S2')], requests: [],
		links: [wire('A', 'eth0', 'S1', 'eth0'), wire('S1', 'eth1', 'S2', 'eth1'), wire('S2', 'eth0', 'B', 'eth0')]
	};
}
function routed() {
	const state = layer2();
	state.devices[0].config = { ip: '10.1.1.10', gateway: '10.1.1.1' };
	state.devices[1].config = { ip: '10.2.2.10', gateway: '10.2.2.1' };
	state.devices.push(
		router('R1', [{ port: 'eth0', vlan: 0, ip: '10.1.1.1' }, { port: 'eth1', vlan: 0, ip: '10.99.0.1' }], [{ network: '10.2.2.0', nextHop: '10.99.0.2' }]),
		router('R2', [{ port: 'eth0', vlan: 0, ip: '10.2.2.1' }, { port: 'eth1', vlan: 0, ip: '10.99.0.2' }], [{ network: '10.1.1.0', nextHop: '10.99.0.1' }])
	);
	state.links.splice(1, 1, wire('S1', 'eth1', 'R1', 'eth0'), wire('R1', 'eth1', 'R2', 'eth1'), wire('R2', 'eth0', 'S2', 'eth1'));
	return state;
}

test('shared VLAN: actual cables and U/T determine contact, not ownership or matching labels alone', () => {
	const state = layer2(), a = state.devices[2], b = state.devices[3];
	assert.equal(pingTogether(state, 'A', 'B').ok, true);
	for (const s of [a, b]) {
		s.config.vlans.push(10);
		member(s, 'eth0', 1, 'excluded'); member(s, 'eth0', 10, 'untagged');
		member(s, 'eth1', 1, 'excluded'); member(s, 'eth1', 10, 'tagged');
	}
	const tagged = pingTogether(state, 'A', 'B');
	assert.equal(tagged.ok, true);
	assert.ok(tagged.steps.some((s) => s.text.includes('VLAN 10 tagged')));
	member(b, 'eth1', 10, 'excluded');
	assert.equal(pingTogether(state, 'A', 'B').ok, false);
	member(b, 'eth1', 10, 'tagged');
	state.links.splice(1, 1);
	assert.equal(pingTogether(state, 'A', 'B').ok, false, 'matching VLAN IDs cannot replace a cable');
});

test('shared VLAN: mismatched untagged VLANs bridge locally; a trunk never routes between IP networks', () => {
	const state = layer2(), a = state.devices[2], b = state.devices[3];
	for (const [s, vlan] of [[a, 10], [b, 20]]) {
		s.config.vlans = [vlan];
		for (const p of ['eth0', 'eth1']) s.config.ports[p] = { pvid: vlan, members: { [vlan]: 'untagged' } };
	}
	assert.equal(pingTogether(state, 'A', 'B').ok, true, 'untagged frames are classified by the receiving U setting');
	state.devices[1].config.ip = '10.20.20.12';
	assert.equal(pingTogether(state, 'A', 'B').code, 'gateway');
});

test('shared VLAN: one tagged router interface per subnet supports router-on-a-stick', () => {
	const s = sw('S'); s.config.vlans = [10, 20];
	s.config.ports.eth0 = { pvid: 10, members: { 10: 'untagged' } };
	s.config.ports.eth1 = { pvid: 20, members: { 20: 'untagged' } };
	s.config.ports.eth2 = { pvid: 1, members: { 10: 'tagged', 20: 'tagged' } };
	const r = router('R', [{ port: 'eth0', vlan: 10, ip: '10.1.1.1' }, { port: 'eth0', vlan: 20, ip: '10.2.2.1' }]);
	const state = {
		devices: [pc('A', '10.1.1.10', '10.1.1.1'), pc('B', '10.2.2.10', '10.2.2.1'), s, r], requests: [],
		links: [wire('A', 'eth0', 'S', 'eth0'), wire('B', 'eth0', 'S', 'eth1'), wire('R', 'eth0', 'S', 'eth2')]
	};
	assert.equal(pingTogether(state, 'A', 'B').ok, true);
	r.config.interfaces[1].vlan = 30;
	assert.equal(pingTogether(state, 'A', 'B').ok, false);
});

test('shared VLAN: static routes and the independently routed reply both matter', () => {
	const state = routed();
	assert.equal(pingTogether(state, 'A', 'B').ok, true);
	state.devices[5].config.routes = [];
	const reply = pingTogether(state, 'A', 'B');
	assert.equal(reply.ok, false); assert.equal(reply.code, 'route');
	assert.match(reply.message, /Pakken når fram, men svaret stopper/);
	assert.ok(reply.steps.some((s) => s.text.includes('Nå prøves returveien')));
	state.devices[4].config.routes[0].nextHop = '10.99.0.3';
	assert.equal(pingTogether(state, 'A', 'B').code, 'vlan');
});

test('shared VLAN: route loops stop and unrelated duplicate addresses do not invalidate the path', () => {
	const state = routed();
	state.devices.push(pc('unconnected', '10.1.1.10'));
	assert.equal(pingTogether(state, 'A', 'B').ok, true);
	state.links.push(wire('unconnected', 'eth0', 'S1', 'eth2'));
	assert.equal(pingTogether(state, 'A', 'B').code, 'duplicate');
	state.links.pop();
	state.devices[1].config.ip = '10.3.3.10';
	state.devices[4].config.routes = [{ network: '10.3.3.0', nextHop: '10.99.0.2' }];
	state.devices[5].config.routes = [{ network: '10.3.3.0', nextHop: '10.99.0.1' }];
	assert.equal(pingTogether(state, 'A', 'B').code, 'route-loop');
});

test('shared VLAN: bounded config validation rejects impossible addresses and ambiguous interfaces', () => {
	assert.deepEqual(validateTogetherConfig('pc', { ip: '010.1.1.10', gateway: '' }), { ip: '10.1.1.10', gateway: '' });
	for (const ip of ['10.1.1.0', '10.1.1.255', '127.0.0.1', '224.1.1.1', '10.1.1.256'])
		assert.throws(() => validateTogetherConfig('pc', { ip, gateway: '' }));
	assert.throws(() => validateTogetherConfig('pc', { ip: '', gateway: '', owner: 'other' }));
	const c = defaultDeviceConfig('switch'); c.vlans.push(10); c.ports.eth0.members[10] = 'untagged';
	assert.throws(() => validateTogetherConfig('switch', c), /ett Untagged/);
	c.ports.eth0.members[1] = 'excluded'; c.ports.eth0.pvid = 999;
	assert.equal(validateTogetherConfig('switch', c).ports.eth0.pvid, 10, 'PVID is derived from U');
	assert.throws(() => router('R', [{ port: 'eth0', vlan: 1, ip: '10.1.1.1' }, { port: 'eth0', vlan: 1, ip: '10.2.2.1' }]), /én interface/);
	assert.throws(() => router('R', [{ port: 'eth0', vlan: 1, ip: '10.1.1.1' }, { port: 'eth1', vlan: 2, ip: '10.1.1.2' }]), /eget/);
	assert.throws(() => router('R', [{ port: 'eth0', vlan: 0, ip: '10.1.1.1' }], [{ network: '10.2.2.0', nextHop: '10.3.3.1' }]), /Neste hopp/);
});

test('shared VLAN: labpartner contract excludes room and peer data, configurations and ping results', () => {
	const values = { deviceKind: 'switch', action: 'connect', hasRun: true, stale: false, revision: 3 };
	const state = { version: ADAPTER_VERSION, values };
	assert.deepEqual(readPartnerState('vlan-sammen', state).values, values);
	for (const extra of [{ code: 'ABC123' }, { name: 'Elev' }, { devices: [] }, { result: { ok: true } }, { deviceKind: 'ap' }, { revision: -1 }, { localTaskKey: 'room-id' }])
		assert.throws(() => readPartnerState('vlan-sammen', { ...state, values: { ...values, ...extra } }));
	assert.throws(() => readPartnerState('vlan-sammen', { ...state, version: 99 }));
	const work = pageWork(partnerPageById('vlan-sammen'), state);
	assert.match(work.task.goal, /retur|svar/);
	assert.match(work.limit, /Ingen romkode/);
	assert.match(work.limit, /Ikke anta at ping lyktes/);
});
