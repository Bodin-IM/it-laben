import test from 'node:test';
import assert from 'node:assert/strict';
import { deviceSlots, movedSlots, slotPoint, slotAt } from '../src/lib/vlanTogetherLayout.js';

test('older rooms get unique places without moving already positioned devices', () => {
	const devices = [{ id: 'legacy', owner: 'a' }, { id: 'saved', owner: 'a', slot: 0 }, { id: 'duplicate', owner: 'a', slot: 0 }, { id: 'other', owner: 'b', slot: 0 }];
	assert.deepEqual(deviceSlots(devices), { saved: 0, legacy: 1, duplicate: 2, other: 0 });
	assert.equal(devices[0].slot, undefined, 'reading layout does not mutate the snapshot');
});

test('moving to an occupied place swaps only the two devices owned by that member', () => {
	const devices = [{ id: 'a', owner: 'one', slot: 0 }, { id: 'b', owner: 'one', slot: 7 }, { id: 'c', owner: 'two', slot: 7 }];
	assert.deepEqual(movedSlots(devices, 'a', 7), { a: 7, b: 0, c: 7 });
	assert.deepEqual(movedSlots(devices, 'a', 4), { a: 4, b: 7, c: 7 });
	for (const slot of [-1, 8, 1.5, NaN]) assert.deepEqual(movedSlots(devices, 'a', slot), deviceSlots(devices));
});

test('hit testing maps each displayed device to its own place and excludes neighbours and headers', () => {
	for (const width of [484, 984]) {
		const area = { id: 'own', x: 8, y: 332, width };
		for (let slot = 0; slot < 8; slot++) {
			const point = slotPoint(area, slot);
			assert.equal(slotAt(area, point.x + point.width / 2, point.y + 29), slot);
		}
		assert.equal(slotAt(area, area.x + 30, area.y + 20), null);
		assert.equal(slotAt(area, area.x - 1, area.y + 100), null);
		assert.equal(slotAt(area, area.x + width + 1, area.y + 100), null);
		assert.equal(slotAt(area, area.x + 30, area.y + 310), null);
	}
});
