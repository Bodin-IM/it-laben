import { initialVlanConfig } from '../../src/lib/vlanLab.js';
import { initialVlan2Config, networkPairs } from '../../src/lib/vlanLab2.js';

// Test-side builders from the public network plans; never shipped as student solutions.
export function solveLab1(task) {
	const c = initialVlanConfig(task);
	task.pcs.forEach((pc, i) => {
		c.ips[pc.id] = `${pc.network}.${101 + i}`;
	});
	if (!task.editableSwitches) return c;
	for (const sw of task.switches) c.switches[sw.id].vlans = [...new Set([1, ...task.groups])];
	for (const pc of task.pcs)
		c.switches[pc.switchId].ports[pc.port] = { pvid: pc.vlan, members: { [pc.vlan]: 'untagged' } };
	for (const l of task.links)
		for (const [sw, p] of [
			[l.a, l.aPort],
			[l.b, l.bPort]
		])
			c.switches[sw].ports[p] = {
				pvid: 1,
				members: { 1: 'untagged', ...Object.fromEntries(task.groups.map((v) => [v, 'tagged'])) }
			};
	return c;
}
export function solveLab2(task, offset = 20) {
	const c = initialVlan2Config(task);
	c.router.interfaces = task.networks.map((n) => ({ vlan: n.vlan, ip: n.gateway }));
	for (const pair of networkPairs(task))
		c.router.allow[pair.key] = !(task.isolateGuest && [pair.a.id, pair.b.id].includes('gjest'));
	for (const sw of task.switches) {
		c.switches[sw.id].vlans = [1, ...task.networks.map((n) => n.vlan)];
		for (const p of sw.ports)
			c.switches[sw.id].ports[p.id] = {
				pvid: 1,
				members: {
					1: 'untagged',
					...Object.fromEntries(task.networks.map((n) => [n.vlan, 'tagged']))
				}
			};
	}
	task.pcs.forEach((pc, i) => {
		const n = task.networks.find((n) => n.id === pc.networkId);
		c.ips[pc.id] = `${n.network}.${offset + i}`;
		c.gateways[pc.id] = n.gateway;
		if (!pc.wireless)
			c.switches[pc.switchId].ports[pc.port] = { pvid: n.vlan, members: { [n.vlan]: 'untagged' } };
		else {
			c.ssids[pc.id] = n.id;
			c.wifi[n.id] = { enabled: true, vlan: n.vlan };
		}
	});
	return c;
}
