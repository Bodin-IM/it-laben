import { DEVICE_HEIGHT } from './vlanTogetherLayout.js';
/** @typedef {{x:number,y:number,width:number,areaId?:string,areaX?:number,areaWidth?:number,corridor?:number,portCount?:number}} DevicePoint */
/** @typedef {import('./vlanTogether.js').TogetherLink} Link */
const LANE_COUNT = 6;
const cablePalette = ['info', 'accent', 'violet', 'warning', 'danger', 'success'];
/** @param {string} id */
function cableIndex(id) { return [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % LANE_COUNT; }
/** Keep colors independent of placement and try different colors at shared devices.
 * @param {Link[]} links @returns {Record<string,string>}
 */
export function cableColors(links) {
	/** @type {Record<string,string>} */ const colors = {};
	/** @type {Map<string, number[]>} */ const used = new Map();
	for (const link of [...links].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
		const a = used.get(link.a) ?? Array(LANE_COUNT).fill(0), b = used.get(link.b) ?? Array(LANE_COUNT).fill(0);
		const options = Array.from({ length: LANE_COUNT }, (_, i) => (cableIndex(link.id) + i) % LANE_COUNT);
		options.sort((x, y) => a[x] + b[x] - a[y] - b[y]);
		const color = options[0]; colors[link.id] = cablePalette[color];
		a[color]++; b[color]++; used.set(link.a, a); used.set(link.b, b);
	}
	return colors;
}
/** @param {DevicePoint} point @param {string|undefined} port */
function portX(point, port) {
	const count = point.portCount ?? 1;
	const index = Math.max(0, Math.min(count - 1, Number(port?.replace('eth', '') ?? 0)));
	return point.x + point.width * (index + 1) / (count + 1);
}
/** Orthogonal lanes below rows and outside devices; both cable and packet use these points.
 * @param {DevicePoint} a @param {DevicePoint} b @param {Link} [link] @param {number} [lane]
 */
export function cableGeometry(a, b, link, lane = cableIndex(link?.id ?? '')) {
	const start = { x: portX(a, link?.aPort), y: a.y + DEVICE_HEIGHT };
	const end = { x: portX(b, link?.bPort), y: b.y + DEVICE_HEIGHT };
	const ay = (a.corridor ?? start.y + 10) + lane * 5, by = (b.corridor ?? end.y + 10) + lane * 5;
	if (ay === by) return [start, { x: start.x, y: ay }, { x: end.x, y: by }, end];
	const sameArea = a.areaId !== undefined && a.areaId === b.areaId;
	const left = (sameArea ? (a.areaX ?? 8) + 3 : 4) + lane * 5;
	const right = (sameArea ? (a.areaX ?? 8) + (a.areaWidth ?? 984) - 3 : 996) - lane * 5;
	const rail = Math.abs(start.x - left) + Math.abs(end.x - left) <= Math.abs(start.x - right) + Math.abs(end.x - right) ? left : right;
	return [start, { x: start.x, y: ay }, { x: rail, y: ay }, { x: rail, y: by }, { x: end.x, y: by }, end];
}
/** Allocate the least overlapping lane within the existing row gaps and side margins.
 * @param {Record<string,DevicePoint>} points @param {Link[]} links @returns {Record<string,number>}
 */
export function cableLanes(points, links) {
	/** @type {Record<string,number>} */ const lanes = {};
	/** @type {Map<string, {low:number,high:number}[]>} */ const occupied = new Map();
	/** @param {{x:number,y:number}[]} route */
	const segments = (route) => route.slice(1).map((p, i) => {
		const q = route[i], vertical = p.x === q.x;
		return { key: vertical ? `x:${p.x}` : `y:${p.y}`, low: Math.min(vertical ? p.y : p.x, vertical ? q.y : q.x), high: Math.max(vertical ? p.y : p.x, vertical ? q.y : q.x) };
	});
	for (const link of [...links].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
		const a = points[link.a], b = points[link.b]; if (!a || !b) continue;
		let best = cableIndex(link.id), score = Infinity;
		for (let i = 0; i < LANE_COUNT; i++) {
			const lane = (cableIndex(link.id) + i) % LANE_COUNT;
			const overlap = segments(cableGeometry(a, b, link, lane)).reduce((sum, segment) => sum + (occupied.get(segment.key) ?? []).reduce((total, other) => total + Math.max(0, Math.min(segment.high, other.high) - Math.max(segment.low, other.low)), 0), 0);
			if (overlap < score) { best = lane; score = overlap; }
			if (score === 0) break;
		}
		lanes[link.id] = best;
		for (const segment of segments(cableGeometry(a, b, link, best))) {
			const existing = occupied.get(segment.key) ?? []; existing.push(segment); occupied.set(segment.key, existing);
		}
	}
	return lanes;
}
/** @param {DevicePoint} a @param {DevicePoint} b @param {Link} [link] @param {number} [lane] */
export function cablePath(a, b, link, lane) {
	return cableGeometry(a, b, link, lane).map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
}
/** Travel by distance along the actual cable, including its bends.
 * @param {DevicePoint} a @param {DevicePoint} b @param {number} progress @param {Link} [link] @param {number} [lane]
 */
export function cablePoint(a, b, progress, link, lane) {
	const route = cableGeometry(a, b, link, lane);
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
 * @param {boolean} [still] @param {Record<string,number>} [lanes]
 */
export function pingFrame(ping, now, points, links, still = false, lanes = {}) {
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
		point = cablePoint(points[link.a], points[link.b], step.from === link.a ? fraction : 1 - fraction, link, lanes[link.id]);
	}
	return { ...point, done, failed: done && !ping.ok, phase: step?.phase ?? 'request',
		label: pending ? 'Venter' : done ? ping.ok ? '✓ Svar' : '× Stopp' : step?.phase === 'reply' ? 'Svar' : 'Ping',
		text: done ? ping.message : pending ? 'Ping starter snart.' : step?.text ?? ping.message };
}
