import test from 'node:test';
import assert from 'node:assert/strict';
import { cablePoint, cableGeometry, pingFrame } from '../src/lib/vlanTogetherPlayback.js';
import { slotPoint } from '../src/lib/vlanTogetherLayout.js';

const points = { a: { x: 0, y: 100, width: 100 }, b: { x: 600, y: 0, width: 200 } };
const links = [{ id: 'cable', a: 'a', aPort: 'eth0', b: 'b', bPort: 'eth0' }];
const ping = { id: 'ping', by: 'member', from: 'a', to: 'b', revision: 1, ok: true, code: 'reply', message: 'Svar mottatt', startsAt: 1000, duration: 4000, expiresAt: 13000, steps: [
	{ from: 'a', to: 'b', link: 'cable', phase: 'request', text: 'Fram' },
	{ from: 'b', to: 'a', link: 'cable', phase: 'reply', text: 'Retur' }
] };

test('shared packets follow routed cables in both directions, at the same server time after polling', () => {
	assert.deepEqual(cablePoint(points.a, points.b, 0), { x: 50, y: 158 });
	assert.deepEqual(cablePoint(points.a, points.b, 1), { x: 700, y: 58 });
	const outgoing = pingFrame(ping, 1500, points, links);
	const returning = pingFrame(ping, 4500, points, links);
	assert.equal(outgoing.x, returning.x); assert.equal(outgoing.y, returning.y);
	assert.equal(outgoing.phase, 'request'); assert.equal(returning.phase, 'reply');
	assert.deepEqual(pingFrame(structuredClone(ping), 1500, points, links), outgoing, 'a poll does not restart the packet');
	assert.deepEqual({ x: outgoing.x, y: outgoing.y }, cablePoint(points.a, points.b, .25, links[0]), 'packet follows the drawn route, including the side rail');
});

test('cable lanes avoid every device box, including inter-area cables and all eight placements', () => {
	const areas = [{ id: 'left', x: 8, y: 12, width: 484 }, { id: 'right', x: 508, y: 12, width: 484 }, { id: 'mine', x: 8, y: 332, width: 984 }];
	const all = areas.flatMap((area) => Array.from({ length: 8 }, (_, slot) => slotPoint(area, slot)));
	for (const a of all) for (const b of all) {
		if (a === b) continue;
		for (const port of ['eth0', 'eth7']) {
			const link = { ...links[0], id: `route-${port}`, aPort: port, bPort: port };
			const route = cableGeometry({ ...a, portCount: 8 }, { ...b, portCount: 8 }, link);
			for (let i = 1; i < route.length; i++) {
				const p = route[i - 1], q = route[i];
				assert.ok(p.x === q.x || p.y === q.y, 'every segment stays in a lane');
				for (const box of all) {
					const crosses = p.x === q.x
						? p.x > box.x && p.x < box.x + box.width && Math.max(p.y, q.y) > box.y && Math.min(p.y, q.y) < box.y + 58
						: p.y > box.y && p.y < box.y + 58 && Math.max(p.x, q.x) > box.x && Math.min(p.x, q.x) < box.x + box.width;
					assert.equal(crosses, false, 'a cable must not pass behind a device');
				}
			}
		}
	}
});

test('moving endpoints updates both the live cable and ping path without restarting playback', () => {
	const area = { id: 'mine', x: 8, y: 12, width: 984 };
	const before = { a: slotPoint(area, 0), b: slotPoint(area, 1) };
	const after = { a: slotPoint(area, 7), b: slotPoint(area, 1) };
	const original = pingFrame(ping, 1500, before, links);
	const moved = pingFrame(ping, 1500, after, links);
	assert.notDeepEqual({ x: original.x, y: original.y }, { x: moved.x, y: moved.y });
	assert.deepEqual({ x: moved.x, y: moved.y }, cablePoint(after.a, after.b, .25, links[0]));
	assert.equal(moved.phase, original.phase); assert.equal(moved.done, false);
});

test('waiting, return failure, reduced motion and expiry do not invent a path', () => {
	const pending = pingFrame(ping, 900, points, links);
	assert.equal(pending.label, 'Venter'); assert.equal(pending.x, 50);
	const finished = pingFrame(ping, 5000, points, links);
	assert.equal(finished.done, true); assert.equal(finished.x, 50);
	assert.deepEqual(pingFrame(ping, 2000, points, links, true), finished, 'reduced motion shows a stationary result');
	assert.equal(pingFrame(ping, 13000, points, links), null);
	const failed = { ...ping, ok: false, steps: [ping.steps[0], { from: 'b', to: 'b', phase: 'reply', text: 'Ingen returrute' }] };
	const stop = pingFrame(failed, 5000, points, links);
	assert.equal(stop.failed, true); assert.equal(stop.x, 700);
	const noPath = pingFrame({ ...failed, steps: [] }, 5000, points, links);
	assert.equal(noPath.x, 50, 'an unresolved local path stays at the source');
	assert.equal(pingFrame(ping, 1500, {}, links), null, 'removed endpoints do not crash playback');
});
