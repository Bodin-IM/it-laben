import { get, writable } from 'svelte/store';
import { backendDisabled } from '#lib/connection.js';
import { ApiError, schoolRequest } from '#lib/lab.js';
import { isModuleStatus } from '#lib/modulePublication.js';

/** @typedef {import('#lib/modulePublication.js').ModulePublication} ModulePublication */
/** @typedef {import('#lib/modulePublication.js').ModuleStatus} ModuleStatus */
/** @typedef {{ready:boolean,loading:boolean,error:string,modules:ModulePublication[]}} PublicationState */

/** Only public pacing metadata is requested. This call must never send a login cookie. */
async function readPublications() {
	const response = await fetch('/api/modules', {
		credentials: 'omit',
		cache: 'no-store',
		redirect: 'error',
		signal: AbortSignal.timeout(10000)
	});
	if (!response.ok) throw new Error('Kunne ikke hente modulene. Prøv igjen.');
	return response.json();
}

/** Reject incomplete metadata rather than guessing that a module is active.
 * @param {unknown} value
 * @returns {ModulePublication[]}
 */
function parsePublications(value) {
	const records = /** @type {{modules?:unknown}|null} */ (value)?.modules;
	if (!Array.isArray(records)) throw new Error('Moduloversikten kunne ikke leses. Prøv igjen.');
	const ids = new Set();
	return records.map((record) => {
		if (
			!record ||
			typeof record.id !== 'string' ||
			!record.id ||
			ids.has(record.id) ||
			!isModuleStatus(record.status) ||
			!Number.isSafeInteger(record.revision) ||
			record.revision < 0 ||
			(record.updatedAt !== null &&
				(!Number.isSafeInteger(record.updatedAt) || record.updatedAt < 0))
		)
			throw new Error('Moduloversikten kunne ikke leses. Prøv igjen.');
		ids.add(record.id);
		return {
			id: record.id,
			status: record.status,
			revision: record.revision,
			updatedAt: record.updatedAt
		};
	});
}

/** An isolated store makes slow reads, concurrent saves and reconnection testable.
 * @param {{
 * read?:()=>Promise<unknown>,
 * write?:(id:string,status:ModuleStatus,expectedRevision:number)=>Promise<unknown>,
 * disabled?:()=>boolean
 * }} [options]
 */
export function createModulePublicationStore({
	read = readPublications,
	write = (id, status, expectedRevision) =>
		schoolRequest(`/teacher/modules/${encodeURIComponent(id)}`, { status, expectedRevision }),
	disabled = backendDisabled
} = {}) {
	/** @type {import('svelte/store').Writable<PublicationState>} */
	const state = writable({ ready: false, loading: false, error: '', modules: [] });
	let readVersion = 0;
	/** @type {Promise<void>|null} */
	let pendingRead = null;

	function invalidateRead() {
		readVersion++;
		pendingRead = null;
		state.update((value) => ({ ...value, loading: false }));
	}

	async function refresh() {
		if (disabled()) return;
		if (pendingRead) return pendingRead;
		const version = ++readVersion;
		state.update((value) => ({ ...value, loading: true, error: '' }));
		pendingRead = (async () => {
			try {
				const modules = parsePublications(await Promise.resolve().then(read));
				if (version === readVersion) state.set({ ready: true, loading: false, error: '', modules });
			} catch {
				if (version === readVersion)
					state.update((value) => ({
						...value,
						loading: false,
						error: 'Kunne ikke oppdatere moduloversikten. Sjekk forbindelsen og prøv igjen.'
					}));
			} finally {
				if (version === readVersion) pendingRead = null;
			}
		})();
		return pendingRead;
	}

	/** @param {string} id @param {ModuleStatus} status @param {number} expectedRevision */
	async function update(id, status, expectedRevision) {
		if (disabled())
			throw new ApiError('Åpne den sikre siden for å endre moduler.', 426, 'HTTPS_REQUIRED');
		if (!isModuleStatus(status) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
			throw new Error('Velg en gyldig modulstatus og prøv igjen.');
		invalidateRead();
		try {
			const modules = parsePublications(await write(id, status, expectedRevision));
			const current = get(state).modules;
			// Two module saves may return out of order. Keep each confirmed newer revision.
			const merged = modules.map((record) => {
				const previous = current.find((item) => item.id === record.id);
				return previous && previous.revision > record.revision ? previous : record;
			});
			state.set({ ready: true, loading: false, error: '', modules: merged });
		} catch (error) {
			invalidateRead();
			if (error instanceof ApiError && error.code === 'MODULE_CONFLICT') await refresh();
			throw error;
		} finally {
			// A read started before the save finished cannot replace its confirmed result.
			invalidateRead();
		}
	}

	return { subscribe: state.subscribe, refresh, update, dispose: invalidateRead };
}

const store = createModulePublicationStore();
export const modulePublication = { subscribe: store.subscribe };
export const refreshModulePublication = store.refresh;
export const updateModulePublication = store.update;

/** Keep open student tabs current without reloading their activity or touching progress. */
export function initializeModulePublication() {
	if (backendDisabled()) return;
	void store.refresh();
	const refreshWhenVisible = () => {
		if (document.visibilityState === 'visible') void store.refresh();
	};
	const interval = window.setInterval(refreshWhenVisible, 30000);
	window.addEventListener('focus', refreshWhenVisible);
	window.addEventListener('online', refreshWhenVisible);
	document.addEventListener('visibilitychange', refreshWhenVisible);
	return () => {
		window.clearInterval(interval);
		window.removeEventListener('focus', refreshWhenVisible);
		window.removeEventListener('online', refreshWhenVisible);
		document.removeEventListener('visibilitychange', refreshWhenVisible);
		store.dispose();
	};
}
