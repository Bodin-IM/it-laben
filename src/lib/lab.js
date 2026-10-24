import { writable, get } from 'svelte/store';

/** @typedef {{id:string,nickname:string,createdAt:number}} User */
/** @typedef {{id:string,title:string,completedAt:number|null,updatedAt:number|null,solution:string[]|Record<string,string>|null}} Objective */
/** @typedef {{id:string,title:string,href:string,subject:string,format:string,status:string,completed:number,total:number,objectives:Objective[]}} Progress */
/** @typedef {{id:string,title:string,description:string,symbol:string,earnedAt:number|null}} Achievement */
/** @typedef {{id:string,points:number,title:string,createdAt:number}} Reward */
/** @typedef {{version:number,xp:number,level:number,nextLevelAt:number,progress:Progress[],achievements:Achievement[],recentRewards:Reward[]}} Summary */
/** @typedef {{format:string,version:number,key:string,createdAt:string,site:string}} RecoveryKey */
/** @typedef {{ready:boolean,available:boolean,user:User|null,csrfToken:string|null,summary:Summary|null,development:boolean,error:string,pending:number,pendingReviews:string[],syncing:boolean,storageWarning:boolean}} LabState */
/** @typedef {{eventId:string,accountId:string,version:number,kind:string,activityId:string,objectiveId:string,confirmed?:boolean,solution?:string[]|Record<string,string>}} Event */
/** @type {LabState} */
const initial = {
	ready: false,
	available: false,
	user: null,
	csrfToken: null,
	summary: null,
	development: false,
	error: '',
	pending: 0,
	pendingReviews: [],
	syncing: false,
	storageWarning: false
};
const state = writable(initial);
export const lab = { subscribe: state.subscribe };
/** @type {import('svelte/store').Writable<{id:string,message:string,points:number}|null>} */
export const rewardNotice = writable(null);
/** @type {Map<string,Event[]>} */
const memory = new Map();
let flushing = false;
let sessionRevision = 0;
const prefix = 'it-laben-pending-v1-';
// Event IDs are not credentials. getRandomValues also supports local HTTP previews.
function randomId() {
	if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 15) | 64;
	bytes[8] = (bytes[8] & 63) | 128;
	const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export class ApiError extends Error {
	/** @param {string} message @param {number} status @param {string} code */
	constructor(message, status, code) {
		super(message);
		this.status = status;
		this.code = code;
	}
}
/** @param {string} path @param {unknown} [body] */
async function api(path, body) {
	const current = get(state);
	/** @type {Record<string,string>} */
	const headers = { Accept: 'application/json' };
	if (body !== undefined) {
		headers['Content-Type'] = 'application/json';
		if (current.csrfToken) headers['X-CSRF-Token'] = current.csrfToken;
	}
	let response;
	try {
		response = await fetch(`/api${path}`, {
			method: body === undefined ? 'GET' : 'POST',
			credentials: 'same-origin',
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(12000)
		});
	} catch {
		throw new ApiError(
			'Kunne ikke kontakte Min lab. Fremgangen venter på tilkobling.',
			0,
			'OFFLINE'
		);
	}
	let result;
	try {
		result = await response.json();
	} catch {
		throw new ApiError('Min lab er ikke tilgjengelig akkurat nå.', response.status, 'UNAVAILABLE');
	}
	if (!response.ok)
		throw new ApiError(
			result.error?.message || 'Kunne ikke lagre akkurat nå.',
			response.status,
			result.error?.code || 'API_ERROR'
		);
	return result;
}
/** @param {string} userId */
function readQueue(userId) {
	if (memory.has(userId)) return memory.get(userId) ?? [];
	try {
		const saved = JSON.parse(localStorage.getItem(prefix + userId) || '[]');
		const valid = Array.isArray(saved)
			? saved
					.filter((item) => item.accountId === userId && typeof item.eventId === 'string')
					.slice(0, 100)
			: [];
		memory.set(userId, valid);
		return valid;
	} catch {
		memory.set(userId, []);
		state.update((value) => ({ ...value, storageWarning: true }));
		return [];
	}
}
/** @param {string} userId @param {Event[]} events */
function storeQueue(userId, events) {
	memory.set(userId, events);
	try {
		localStorage.setItem(prefix + userId, JSON.stringify(events));
	} catch {
		state.update((value) => ({ ...value, storageWarning: true }));
	}
	if (get(state).user?.id === userId)
		state.update((value) => ({
			...value,
			pending: events.length,
			pendingReviews: events
				.filter((event) => event.kind === 'review')
				.map((event) => event.activityId)
		}));
}
/** @param {{user:User,csrfToken:string,summary:Summary,development:boolean}} result */
function acceptSession(result) {
	sessionRevision += 1;
	const queue = result.user ? readQueue(result.user.id) : [];
	state.set({
		...initial,
		...result,
		ready: true,
		available: true,
		storageWarning: get(state).storageWarning,
		pending: queue.length,
		pendingReviews: queue
			.filter((event) => event.kind === 'review')
			.map((event) => event.activityId)
	});
}
function broadcast() {
	try {
		localStorage.setItem('it-laben-account-changed', randomId());
	} catch {
		/* Same-tab login still works. */
	}
}
export async function refreshLab() {
	const revision = sessionRevision;
	try {
		const result = await api('/me');
		if (revision !== sessionRevision) return;
		acceptSession(result);
		void flushProgress();
	} catch (error) {
		if (revision !== sessionRevision) return;
		state.update((value) => ({
			...value,
			ready: true,
			available: false,
			error: error instanceof Error ? error.message : 'Min lab er utilgjengelig.'
		}));
	}
}
export function initializeLab() {
	void refreshLab();
	const reconnect = () => {
		void refreshLab();
	};
	/** @param {StorageEvent} event */
	const changed = (event) => {
		if (event.key === 'it-laben-account-changed') reconnect();
	};
	window.addEventListener('online', reconnect);
	window.addEventListener('focus', reconnect);
	window.addEventListener('storage', changed);
	return () => {
		window.removeEventListener('online', reconnect);
		window.removeEventListener('focus', reconnect);
		window.removeEventListener('storage', changed);
	};
}
/** @param {string} nickname @param {boolean} remember @returns {Promise<RecoveryKey>} */
export async function createProfile(nickname, remember) {
	const result = await api('/auth/create', { nickname, remember });
	acceptSession(result);
	broadcast();
	return result.recoveryKey;
}
/** @param {RecoveryKey} file @param {boolean} remember */
export async function loginWithKey(file, remember) {
	if (
		file?.format !== 'it-laben-key' ||
		file.version !== 1 ||
		typeof file.key !== 'string' ||
		!/^itlab_[A-Za-z0-9_-]{43}$/.test(file.key)
	)
		throw new Error('Dette er ikke en gyldig IT-laben-nøkkelfil.');
	const result = await api('/auth/key', { key: file.key, remember });
	acceptSession(result);
	broadcast();
	void flushProgress();
}
export async function logoutProfile() {
	await api('/auth/logout', {});
	sessionRevision += 1;
	state.set({ ...initial, ready: true, available: true });
	rewardNotice.set(null);
	broadcast();
}
/** @returns {Promise<RecoveryKey>} */
export async function rotateRecoveryKey() {
	const result = await api('/auth/rotate-key', {});
	acceptSession(result);
	broadcast();
	return result.recoveryKey;
}
/** @param {string} nickname */
export async function changeNickname(nickname) {
	acceptSession(await api('/me/nickname', { nickname }));
}
export async function deleteProfile() {
	const userId = get(state).user?.id;
	await api('/me/delete', { confirm: 'SLETT' });
	if (userId) {
		memory.delete(userId);
		try {
			localStorage.removeItem(prefix + userId);
		} catch {
			/* No stored queue. */
		}
	}
	sessionRevision += 1;
	state.set({ ...initial, ready: true, available: true });
	rewardNotice.set(null);
	broadcast();
}
/** @param {RecoveryKey} file */
export function downloadKey(file) {
	const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob),
		link = document.createElement('a');
	link.href = url;
	link.download = 'min-it-lab-nokkel.json';
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** @param {Omit<Event,'eventId'|'accountId'|'version'>} event */
function enqueue(event) {
	const current = get(state);
	if (!current.user) return;
	const queue = readQueue(current.user.id);
	if (queue.length >= 100) {
		state.update((value) => ({
			...value,
			error: 'Mange forsøk venter på lagring. Koble til og synkroniser før du sender flere.'
		}));
		return;
	}
	storeQueue(current.user.id, [
		...queue,
		{
			...event,
			eventId: randomId(),
			accountId: current.user.id,
			version: current.summary?.version ?? 1
		}
	]);
	void flushProgress();
}
/** @param {string} activityId */
export function startLesson(activityId) {
	enqueue({ kind: 'start', activityId, objectiveId: 'review' });
}
/** @param {string} activityId */
export function reviewLesson(activityId) {
	enqueue({ kind: 'review', activityId, objectiveId: 'review', confirmed: true });
}
/** @param {string} activityId @param {string} objectiveId @param {string[]|Record<string,string>} solution */
export function saveAttempt(activityId, objectiveId, solution) {
	enqueue({ kind: 'attempt', activityId, objectiveId, solution: structuredClone(solution) });
}

export async function flushProgress() {
	if (flushing || !get(state).user) return;
	flushing = true;
	state.update((value) => ({ ...value, syncing: true }));
	const userId = get(state).user?.id;
	try {
		while (userId && get(state).user?.id === userId) {
			const event = readQueue(userId)[0];
			if (!event) break;
			try {
				const result = await api('/progress', event);
				storeQueue(
					userId,
					readQueue(userId).filter((item) => item.eventId !== event.eventId)
				);
				if (get(state).user?.id === userId) {
					sessionRevision += 1;
					state.update((value) => ({
						...value,
						summary: result.summary,
						available: true,
						error: ''
					}));
					if (!result.duplicate && (result.newRewards.length || result.newAchievements.length)) {
						const rewards = /** @type {{points:number}[]} */ (result.newRewards);
						const points = rewards.reduce((total, value) => total + value.points, 0);
						rewardNotice.set({
							id: event.eventId,
							message: result.newAchievements[0]?.title || 'Godt jobbet!',
							points
						});
					}
				}
			} catch (error) {
				const problem =
					error instanceof ApiError
						? error
						: new ApiError('Kunne ikke synkronisere.', 0, 'OFFLINE');
				state.update((value) => ({ ...value, error: problem.message }));
				if (problem.status === 401 || problem.code === 'ACCOUNT_CHANGED') {
					void refreshLab();
					break;
				}
				if (problem.code === 'CSRF') {
					void refreshLab();
					break;
				}
				if (
					problem.status === 403 ||
					problem.status === 429 ||
					problem.status === 0 ||
					problem.status >= 500
				)
					break;
				storeQueue(
					userId,
					readQueue(userId).filter((item) => item.eventId !== event.eventId)
				);
			}
		}
	} finally {
		flushing = false;
		state.update((value) => ({ ...value, syncing: false }));
		const nextUser = get(state).user?.id;
		if (nextUser && nextUser !== userId && readQueue(nextUser).length) void flushProgress();
	}
}
