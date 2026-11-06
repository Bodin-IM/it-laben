import { DEVICE_HEIGHT } from './vlanTogetherLayout.js';
/** @typedef {{x:number,y:number,width:number,areaId?:string,areaX?:number,areaWidth?:number,corridor?:number,portCount?:number}} DevicePoint */
/** @typedef {import('./vlanTogether.js').TogetherLink} Link */
/** @param {DevicePoint} point @param {string|undefined} port */
function portX(point, port) {
	const count = point.portCount ?? 1;
	const index = Math.max(0, Math.min(count - 1, Number(port?.replace('eth', '') ?? 0)));
	return point.x + point.width * (index + 1) / (count + 1);
}
/** Orthogonal lanes below rows and outside devices; both cable and packet use these points.
 * @param {DevicePoint} a @param {DevicePoint} b @param {Link} [link]
 */
export function cableGeometry(a, b, link) {
	const lane = [...(link?.id ?? '')].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6;
	const start = { x: portX(a, link?.aPort), y: a.y + DEVICE_HEIGHT };
	const end = { x: portX(b, link?.bPort), y: b.y + DEVICE_HEIGHT };
	const ay = (a.corridor ?? start.y + 18) + lane * 3, by = (b.corridor ?? end.y + 18) + lane * 3;
	if (ay === by) return [start, { x: start.x, y: ay }, { x: end.x, y: by }, end];
	const sameArea = a.areaId !== undefined && a.areaId === b.areaId;
	const left = sameArea ? (a.areaX ?? 8) + 8 : 3;
	const right = sameArea ? (a.areaX ?? 8) + (a.areaWidth ?? 984) - 8 : 997;
	const rail = Math.abs(start.x - left) + Math.abs(end.x - left) <= Math.abs(start.x - right) + Math.abs(end.x - right) ? left : right;
	return [start, { x: start.x, y: ay }, { x: rail, y: ay }, { x: rail, y: by }, { x: end.x, y: by }, end];
}
/** @param {DevicePoint} a @param {DevicePoint} b @param {Link} [link] */
export function cablePath(a, b, link) {
	return cableGeometry(a, b, link).map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
}
/** Travel by distance along the actual cable, including its bends.
 * @param {DevicePoint} a @param {DevicePoint} b @param {number} progress @param {Link} [link]
 */
export function cablePoint(a, b, progress, link) {
	const route = cableGeometry(a, b, link);
	const lengths = route.slice(1).map((p, i) => Math.hypot(p.x - route[i].x, p.y - route[i].y));
	let remaining = Math.max(0, Math.min(1, progress)) * lengths.reduce((sum, n) => sum + n, 0);
	for (let i = 0; i < lengths.length; i++) {
		if (remaining <= lengths[i] && lengths[i] > 0) {
			const t = remaining / lengths[i];
			return { x: route[i].x + (route[i + 1].x - route[i].x) * t, y: route[i].y + (route[i + 1].y - route[i].y) * t };
		}
		remaining -= lengths[i];
	}
	return route[route.length - 1];
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
		point = cablePoint(points[link.a], points[link.b], step.from === link.a ? fraction : 1 - fraction, link);
	}
	return { ...point, done, failed: done && !ping.ok, phase: step?.phase ?? 'request',
		label: pending ? 'Venter' : done ? ping.ok ? '✓ Svar' : '× Stopp' : step?.phase === 'reply' ? 'Svar' : 'Ping',
		text: done ? ping.message : pending ? 'Ping starter snart.' : step?.text ?? ping.message };
}
