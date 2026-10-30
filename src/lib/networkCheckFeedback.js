/** @param {import('./vlanLab.js').PortConfig} port @param {number} vlan */
const membership = (port, vlan) => port.members[String(vlan)] ?? 'excluded';

/** @param {import('./vlanLab.js').SwitchConfig} sw @param {string} name @param {string} portId @param {number} vlan @param {'untagged'|'tagged'} mode */
export function portFeedback(sw, name, portId, vlan, mode) {
	const port = sw.ports[portId];
	const label = `${name} ${portId}`;
	const modes = { excluded: 'Exclude (E)', untagged: 'Untagged (U)', tagged: 'Tagged (T)' };
	if (!sw.vlans.includes(vlan)) return `${name} har ikke VLAN ${vlan}. Opprett VLAN-et før du setter medlemskap på ${portId}.`;
	if (membership(port, vlan) !== mode) return `${label}: VLAN ${vlan} er ${modes[membership(port, vlan)]}. Sett det til ${modes[mode]}.`;
	if (mode === 'untagged') {
		if (port.pvid !== vlan) return `${label} har PVID ${port.pvid}, men PC-ens VLAN er ${vlan}. Endre PVID til ${vlan}.`;
		const extra = Object.entries(port.members).filter(([id, value]) => Number(id) !== vlan && value !== 'excluded');
		if (extra.length) return `${label} er også medlem av VLAN ${extra.map(([id]) => id).join(', ')}. Sett disse til Exclude (E) på PC-porten.`;
	}
	return '';
}
