/** Shared layout rules. Positions never affect VLAN configuration or packet routing. */
export const AREA_HEIGHT = 300;
export const AREA_STEP = 320;
export const DEVICE_HEIGHT = 58;
export const SLOT_COUNT = 8;
/** @typedef {import('./vlanTogether.js').TogetherDevice} Device */
/** @typedef {{id:string,x:number,y:number,width:number}} Area */
/** @typedef {{x:number,y:number,width:number,areaId:string,areaX:number,areaWidth:number,corridor:number}} DevicePoint */

/** Preserve saved places and fill gaps deterministically for older rooms.
 * @param {Device[]} devices @returns {Record<string,number>}
 */
export function deviceSlots(devices) {
	/** @type {Record<string,number>} */ const slots = {};
	for (const owner of new Set(devices.map((d) => d.owner))) {
		const own = devices.filter((d) => d.owner === owner), used = new Set();
		for (const d of own) {
			const slot = d.slot;
			if (typeof slot === 'number' && Number.isInteger(slot) && slot >= 0 && slot < SLOT_COUNT && !used.has(slot)) {
				slots[d.id] = slot; used.add(slot);
			}
		}
		for (const d of own) {
			if (slots[d.id] !== undefined) continue;
			let slot = 0; while (used.has(slot)) slot++;
			slots[d.id] = slot; used.add(slot);
		}
	}
	return slots;
}
/** @param {Area} area @param {number} slot @returns {DevicePoint} */
export function slotPoint(area, slot) {
	const step = (area.width - 64) / 4, row = Math.floor(slot / 4);
	return { x: area.x + 32 + slot % 4 * step, y: area.y + 82 + row * 100, width: step - 16,
		areaId: area.id, areaX: area.x, areaWidth: area.width, corridor: area.y + 150 + row * 100 };
}
/** @param {Area} area @param {number} x @param {number} y */
export function slotAt(area, x, y) {
	if (x < area.x + 12 || x > area.x + area.width - 12 || y < area.y + 72 || y > area.y + 282) return null;
	const col = Math.max(0, Math.min(3, Math.floor((x - area.x - 24) / ((area.width - 64) / 4))));
	return col + (y >= area.y + 172 ? 4 : 0);
}
/** Preview the same atomic move/swap used on the server.
 * @param {Device[]} devices @param {string} id @param {number} slot
 * @returns {Record<string,number>}
 */
export function movedSlots(devices, id, slot) {
	const slots = deviceSlots(devices), source = devices.find((d) => d.id === id);
	if (!source || !Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT) return slots;
	const target = devices.find((d) => d.owner === source.owner && slots[d.id] === slot);
	if (target) slots[target.id] = slots[id];
	slots[id] = slot;
	return slots;
}
