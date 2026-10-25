/** @typedef {import('./lab.js').Event} Event */
export const eventPrefix = 'it-laben-event-v2:';
const legacyPrefix = 'it-laben-pending-v1-';

/**
 * One localStorage key per event: a tab can only delete the event it acknowledged.
 * No tab ever replaces another tab's queue. Server receipts handle concurrent retries.
 * @param {{storage?:()=>Storage,onWarning?:()=>void}} [options]
 */
export function createProgressQueue({ storage = () => localStorage, onWarning = () => {} } = {}) {
	/** Events whose storage write failed are retained only in this tab. @type {Map<string,Event>} */
	const volatile = new Map();
	/** Live feedback metadata belongs to the producing tab, never to a reloaded tab. @type {Map<string,Event>} */
	const owned = new Map();
	const acknowledged = new Set();
	/** @param {string} userId */
	const prefix = (userId) => eventPrefix + encodeURIComponent(userId) + ':';
	/** @param {string} userId @param {string} eventId */
	const keyFor = (userId, eventId) => prefix(userId) + eventId;
	/** @param {unknown} value @param {string} userId @returns {value is Event} */
	function valid(value, userId) {
		const item = /** @type {Event|null} */ (value);
		return (
			!!item &&
			item.accountId === userId &&
			typeof item.eventId === 'string' &&
			/^[0-9a-f-]{36}$/i.test(item.eventId)
		);
	}
	/** @param {string} userId @returns {Event[]} */
	function list(userId) {
		const events = new Map([...volatile].filter(([, item]) => item.accountId === userId));
		try {
			const saved = storage();
			for (const [key, item] of volatile)
				if (item.accountId === userId) {
					try {
						saved.setItem(key, JSON.stringify(item));
						volatile.delete(key);
					} catch {
						onWarning();
					}
				}
			// Move old installations without discarding existing pending work. Repeating this
			// after an interrupted migration is safe because each event keeps the same ID.
			const legacy = saved.getItem(legacyPrefix + userId);
			if (legacy) {
				try {
					const items = JSON.parse(legacy);
					if (!Array.isArray(items)) throw new Error('Invalid legacy queue');
					for (const item of items.filter((value) => valid(value, userId))) {
						const key = keyFor(userId, item.eventId);
						if (acknowledged.has(key)) continue;
						events.set(key, { ...item, client: { at: item.client?.at ?? 0, deferred: true } });
						if (!saved.getItem(key)) saved.setItem(key, JSON.stringify(item));
					}
					saved.removeItem(legacyPrefix + userId);
				} catch {
					onWarning();
				}
			}
			const keys = Array.from({ length: saved.length }, (_, index) => saved.key(index));
			for (const key of keys) {
				if (!key?.startsWith(prefix(userId))) continue;
				if (acknowledged.has(key)) {
					saved.removeItem(key);
					continue;
				}
				try {
					const item = JSON.parse(saved.getItem(key) || 'null');
					if (valid(item, userId) && key === keyFor(userId, item.eventId)) {
						const local = owned.get(key);
						events.set(key, {
							...item,
							client: local?.client ?? { at: item.client?.at ?? 0, deferred: true }
						});
					}
				} catch {
					onWarning();
				}
			}
			for (const [key, item] of owned)
				if (item.accountId === userId && !events.has(key)) owned.delete(key);
		} catch {
			onWarning();
			for (const [key, item] of owned)
				if (item.accountId === userId && !acknowledged.has(key)) events.set(key, item);
		}
		return [...events.values()].sort(
			(a, b) => (a.client?.at ?? 0) - (b.client?.at ?? 0) || a.eventId.localeCompare(b.eventId)
		);
	}
	/** @param {Event} event */
	function add(event) {
		const key = keyFor(event.accountId, event.eventId);
		owned.set(key, event);
		try {
			storage().setItem(key, JSON.stringify(event));
			volatile.delete(key);
		} catch {
			volatile.set(key, event);
			onWarning();
		}
	}
	/** @param {string} userId @param {string} eventId */
	function remove(userId, eventId) {
		const key = keyFor(userId, eventId);
		acknowledged.add(key);
		volatile.delete(key);
		owned.delete(key);
		try {
			storage().removeItem(key);
		} catch {
			onWarning();
		}
	}
	/** Metadata is local so a late retry can never recreate an acknowledged event. @param {string} userId */
	function defer(userId) {
		for (const [key, item] of owned)
			if (item.accountId === userId) {
				const next = { ...item, client: { at: item.client?.at ?? 0, deferred: true } };
				owned.set(key, next);
				if (volatile.has(key)) volatile.set(key, next);
			}
	}
	/** @param {string} userId */
	function clear(userId) {
		for (const item of list(userId)) remove(userId, item.eventId);
		try {
			storage().removeItem(legacyPrefix + userId);
		} catch {
			onWarning();
		}
	}
	/** @param {string|null} key @param {string} userId */
	const isChange = (key, userId) =>
		key === null || key === legacyPrefix + userId || key.startsWith(prefix(userId));
	return { list, add, remove, defer, clear, isChange };
}
