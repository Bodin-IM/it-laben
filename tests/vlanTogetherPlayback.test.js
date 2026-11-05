import test from 'node:test';
import assert from 'node:assert/strict';
import { cablePoint, pingFrame } from '../src/lib/vlanTogetherPlayback.js';

const points = { a: { x: 0, y: 100, width: 100 }, b: { x: 600, y: 0, width: 200 } };
const links = [{ id: 'cable', a: 'a', aPort: 'eth0', b: 'b', bPort: 'eth0' }];
const ping = { id: 'ping', by: 'member', from: 'a', to: 'b', revision: 1, ok: true, code: 'reply', message: 'Svar mottatt', startsAt: 1000, duration: 4000, expiresAt: 13000, steps: [
	{ from: 'a', to: 'b', link: 'cable', phase: 'request', text: 'Fram' },
	{ from: 'b', to: 'a', link: 'cable', phase: 'reply', text: 'Retur' }
] };

test('shared packets follow curved cables in both directions, at the same server time after polling', () => {
	assert.deepEqual(cablePoint(points.a, points.b, 0), { x: 50, y: 158 });
	assert.deepEqual(cablePoint(points.a, points.b, 1), { x: 700, y: 58 });
	const outgoing = pingFrame(ping, 1500, points, links);
	const returning = pingFrame(ping, 4500, points, links);
	assert.equal(outgoing.x, returning.x); assert.equal(outgoing.y, returning.y);
	assert.equal(outgoing.phase, 'request'); assert.equal(returning.phase, 'reply');
	assert.deepEqual(pingFrame(structuredClone(ping), 1500, points, links), outgoing, 'a poll does not restart the packet');
	assert.notEqual(outgoing.y, points.a.y + 58 + .25 * (points.b.y - points.a.y), 'the marker follows the cubic cable rather than a straight line');
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
