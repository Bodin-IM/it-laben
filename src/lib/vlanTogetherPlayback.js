/** @typedef {{x:number,y:number,width:number}} DevicePoint */
/** @param {DevicePoint} a @param {DevicePoint} b */
export function cableGeometry(a, b) {
	const ax = a.x + a.width / 2, bx = b.x + b.width / 2;
	return { ax, bx, ay: a.y + 58, by: b.y + 58, acy: a.y + 90, bcy: b.y + 90 };
}
/** The packet and cable share exactly the same cubic curve. @param {DevicePoint} a @param {DevicePoint} b */
export function cablePath(a, b) {
	const c = cableGeometry(a, b);
	return `M ${c.ax} ${c.ay} C ${c.ax} ${c.acy}, ${c.bx} ${c.bcy}, ${c.bx} ${c.by}`;
}
/** @param {DevicePoint} a @param {DevicePoint} b @param {number} progress */
export function cablePoint(a, b, progress) {
	const c = cableGeometry(a, b), t = Math.max(0, Math.min(1, progress)), u = 1 - t;
	return {
		x: u ** 3 * c.ax + 3 * u ** 2 * t * c.ax + 3 * u * t ** 2 * c.bx + t ** 3 * c.bx,
		y: u ** 3 * c.ay + 3 * u ** 2 * t * c.acy + 3 * u * t ** 2 * c.bcy + t ** 3 * c.by
	};
}
/** Position a shared event using server time; polling must not restart its playback.
 * @param {import('./vlanTogether.js').SharedPing} ping @param {number} now
 * @param {Record<string,DevicePoint>} points @param {import('./vlanTogether.js').TogetherLink[]} links
 * @param {boolean} [still]
 */
export function pingFrame(ping, now, points, links, still = false) {
	if (now >= ping.expiresAt) return null;
	const pending = !still && now < ping.startsAt;
	const done = still || now >= ping.startsAt + ping.duration;
	const position = Math.max(0, (now - ping.startsAt) / ping.duration) * ping.steps.length;
	const step = ping.steps[done ? ping.steps.length - 1 : Math.min(ping.steps.length - 1, Math.floor(position))];
	const node = points[pending ? ping.from : done ? step?.to ?? ping.from : step?.from ?? ping.from];
	if (!node) return null;
	let point = { x: node.x + node.width / 2, y: node.y + 58 };
	const link = step?.link && links.find((l) => l.id === step.link);
	if (!pending && !done && link && points[link.a] && points[link.b]) {
		const fraction = position % 1;
		point = cablePoint(points[link.a], points[link.b], step.from === link.a ? fraction : 1 - fraction);
	}
	return { ...point, done, failed: done && !ping.ok, phase: step?.phase ?? 'request',
		label: pending ? 'Venter' : done ? ping.ok ? '✓ Svar' : '× Stopp' : step?.phase === 'reply' ? 'Svar' : 'Ping',
		text: done ? ping.message : pending ? 'Ping starter snart.' : step?.text ?? ping.message };
}
