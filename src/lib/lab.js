import { writable, get, derived } from 'svelte/store';
import { buildCelebration } from '#lib/celebrations.js';

/** @typedef {{id:string,nickname:string,createdAt:number,role:'student'|'teacher'|'admin',leaderboardVisible:boolean}} User */
/** @typedef {import('#lib/progression.js').ObjectiveProgress} Objective */
/** @typedef {import('#lib/progression.js').ActivityProgress} Progress */
/** @typedef {import('#lib/progression.js').AchievementState} Achievement */
/** @typedef {{id:string,points:number,title:string,createdAt:number}} Reward */
/** @typedef {{id:string,title:string,total:number,completed:number,checksTotal:number,checksCompleted:number}} SubjectProgress */
/** @typedef {{id:string,title:string,color:string,background:string,requires:string|null,unlocked:boolean}} LabColor */
/** @typedef {{colorId:string,featuredAchievementId:string|null,colors:LabColor[]}} LabProfile */
/** @typedef {{version:number,xp:number,level:number,nextLevelAt:number,xpPerLevel:number,maximumXp:number,progress:Progress[],achievements:Achievement[],tracks:import('#lib/progression.js').TrackState[],subjects:SubjectProgress[],lab:LabProfile,recentRewards:Reward[]}} Summary */
/** @typedef {{format:string,version:number,key:string,createdAt:string,site:string}} RecoveryKey */
/** @typedef {{ready:boolean,available:boolean,user:User|null,csrfToken:string|null,summary:Summary|null,development:boolean,error:string,pending:number,pendingReviews:string[],pendingObjectives:string[],syncing:boolean,storageWarning:boolean,openings:import('./learning.js').ActivityOpening[]}} LabState */
/** @typedef {{eventId:string,accountId:string,version:number,kind:string,activityId:string,objectiveId:string,confirmed?:boolean,attemptId?:string,mode?:import('./learning.js').LearningMode,openingId?:string|null,answers?:import('./timedChallenges.js').TimedAnswers,solution?:string[]|Record<string,string>,client?:{at:number,deferred:boolean}}} Event */
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
	pendingObjectives: [],
	syncing: false,
	storageWarning: false,
	openings: []
};
const state = writable(initial);
export const lab = { subscribe: state.subscribe };
/** @type {import('svelte/store').Writable<import('./learning.js').LearningContext>} */
export const learningContext = writable({
	activityId: '',
	mode: 'normal',
	openingId: null,
	untimed: false
});
/** @type {import('svelte/store').Writable<{key:string,activity:Progress|null,error:string}>} */
const learningState = writable({ key: '', activity: null, error: '' });
let learningRevision = 0;
function learningKey() {
	const context = get(learningContext);
	return `${get(state).user?.id}:${context.activityId}:${context.mode}:${context.openingId}`;
}
export const activityLab = derived(
	[state, learningContext, learningState],
	([current, context, learned]) => {
		const events = current.user
			? readQueue(current.user.id).filter(
					(event) =>
						(event.mode ?? 'normal') === context.mode &&
						(event.openingId ?? null) === context.openingId
				)
			: [];
		const summary =
			context.mode === 'normal'
				? current.summary
				: learned.key === learningKey() && learned.activity && current.summary
					? {
							...current.summary,
							progress: current.summary.progress.map((item) =>
								item.id === context.activityId ? (learned.activity ?? item) : item
							)
						}
					: null;
		return {
			...current,
			summary,
			error: learned.key === learningKey() && learned.error ? learned.error : current.error,
			pending: events.length,
			pendingObjectives: events.map((event) => `${event.activityId}:${event.objectiveId}`),
			pendingReviews: events
				.filter((event) => event.kind === 'review')
				.map((event) => event.activityId)
		};
	}
);
/** @param {import('./learning.js').LearningContext} context */
export function setLearningContext(context) {
	const previous = learningKey();
	learningContext.set(context);
	if (previous !== learningKey() || get(learningState).key !== learningKey()) {
		learningRevision++;
		learningState.set({ key: learningKey(), activity: null, error: '' });
		if (context.mode !== 'normal') void refreshLearningActivity();
	}
}
/** @param {Progress} activity */
function acceptLearning(activity) {
	learningRevision++;
	learningState.set({ key: learningKey(), activity, error: '' });
}
export async function refreshLearningActivity() {
	const context = get(learningContext);
	const key = learningKey();
	const revision = ++learningRevision;
	if (!get(state).user || !context.activityId || context.mode === 'normal') return;
	try {
		const params = new URLSearchParams({ mode: context.mode });
		if (context.openingId) params.set('openingId', context.openingId);
		const result = await api(`/learning/${encodeURIComponent(context.activityId)}?${params}`);
		if (key === learningKey() && revision === learningRevision) acceptLearning(result.activity);
	} catch (error) {
		if (key === learningKey() && revision === learningRevision)
			learningState.update((value) => ({
				...value,
				error: error instanceof Error ? error.message : 'Kunne ikke hente øvingen.'
			}));
	}
}
/** @param {string} [path] @param {Record<string,unknown>} [body] @returns {Promise<import('./learning.js').TeacherView>} */
export async function teacherRequest(path = '', body) {
	return schoolRequest(`/teacher${path}`, body);
}

/** @param {string} path @param {Record<string,unknown>} [body] */
export async function schoolRequest(path, body) {
	const userId = get(state).user?.id;
	const result = await api(path, body === undefined ? undefined : { ...body, accountId: userId });
	if (userId !== get(state).user?.id)
		throw new ApiError('En annen profil er pålogget.', 409, 'ACCOUNT_CHANGED');
	if (body !== undefined) void refreshLab();
	return result;
}

/** @type {import('svelte/store').Writable<import('#lib/celebrations.js').Celebration|null>} */
export const rewardNotice = writable(null);
/** @type {Map<string,Event[]>} */
const memory = new Map();
let flushing = false;
let sessionRevision = 0;
const prefix = 'it-laben-pending-v1-';
// Event IDs are not credentials. getRandomValues also supports local HTTP previews.
export function randomId() {
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
					.map((item) => ({ ...item, client: { at: item.client?.at ?? 0, deferred: true } }))
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
			pendingObjectives: events.map((event) => `${event.activityId}:${event.objectiveId}`),
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
		pendingObjectives: queue.map((event) => `${event.activityId}:${event.objectiveId}`),
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
		void refreshLearningActivity();
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
	const openingPoll = setInterval(() => {
		if (document.visibilityState === 'visible') reconnect();
	}, 30000);
	return () => {
		clearInterval(openingPoll);
		window.removeEventListener('online', reconnect);
		window.removeEventListener('focus', reconnect);
		window.removeEventListener('storage', changed);
	};
}
/** @param {boolean} remember @returns {Promise<RecoveryKey>} */
export async function createProfile(remember) {
	const result = await api('/auth/create', { remember });
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
/** @param {boolean} visible */
export async function changeLeaderboardVisibility(visible) {
	const userId = get(state).user?.id;
	const result = await schoolRequest('/me/leaderboard', { visible });
	if (get(state).user?.id === userId) {
		acceptSession(result);
		broadcast();
	}
}
/** @param {string} colorId @param {string|null} featuredAchievementId */
export async function changeLabProfile(colorId, featuredAchievementId) {
	const userId = get(state).user?.id;
	const result = await api('/me/lab', { colorId, featuredAchievementId });
	if (get(state).user?.id === userId) {
		acceptSession(result);
		broadcast();
	}
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
	const context = get(learningContext);
	const mode = context.activityId === event.activityId ? context.mode : 'normal';
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
			mode,
			openingId: mode === 'teaching' ? context.openingId : null,
			eventId: randomId(),
			accountId: current.user.id,
			client: { at: Date.now(), deferred: !navigator.onLine },
			version: current.summary?.version ?? 2
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
/** @param {string} activityId @param {string} objectiveId @returns {Promise<import('./assessmentPolicy.js').Assessment|null>} */
export async function openCheckpoint(activityId, objectiveId, reset = false) {
	const userId = get(state).user?.id;
	const context = get(learningContext);
	const key = learningKey();
	const practice = context.mode === 'practice' && context.activityId === activityId;
	const result = await api(
		practice ? `/practice/${encodeURIComponent(activityId)}/checkpoints/open` : '/checkpoints/open',
		{
			accountId: userId,
			activityId,
			objectiveId,
			reset,
			openingId: context.mode === 'teaching' ? context.openingId : null
		}
	);
	if (get(state).user?.id !== userId || key !== learningKey()) return null;
	if (result.summary) {
		sessionRevision += 1;
		state.update((value) => ({ ...value, summary: result.summary, error: '', available: true }));
	}
	if (result.activity) acceptLearning(result.activity);
	else if (context.mode !== 'normal') await refreshLearningActivity();
	return result.assessment;
}
/** @param {string} activityId @param {string} objectiveId @param {string} attemptId @param {Record<string,string>} answers */
export function saveCheckpoint(activityId, objectiveId, attemptId, answers) {
	enqueue({
		kind: 'check',
		activityId,
		objectiveId,
		attemptId,
		solution: { ...answers }
	});
}

/** @param {string} activityId @param {'start'|'draft'} [action] @param {Record<string,unknown>} [body] @returns {Promise<import('./timedChallenges.js').ShiftResponse>} */
export async function timedChallengeRequest(activityId, action, body) {
	const userId = get(state).user?.id;
	const context = get(learningContext);
	const key = learningKey();
	const scoped =
		context.activityId === activityId
			? context
			: { mode: 'normal', openingId: null, untimed: false };
	let path =
		scoped.mode === 'practice'
			? `/practice/${encodeURIComponent(activityId)}/timed`
			: `/timed/${encodeURIComponent(activityId)}`;
	if (action) path += `/${action}`;
	else if (scoped.openingId) path += `?openingId=${encodeURIComponent(scoped.openingId)}`;
	const result = await api(
		path,
		action
			? { ...body, accountId: userId, openingId: scoped.openingId, untimed: scoped.untimed }
			: undefined
	);
	if (get(state).user?.id !== userId || key !== learningKey())
		throw new ApiError('Profil eller visningsmodus er endret.', 409, 'ACCOUNT_CHANGED');
	if (result.summary) {
		sessionRevision += 1;
		state.update((value) => ({ ...value, summary: result.summary, error: '', available: true }));
	}
	return result;
}
/** @param {string} activityId @param {string} objectiveId @param {string} attemptId @param {import('./timedChallenges.js').TimedAnswers} answers */
export function saveTimedAttempt(activityId, objectiveId, attemptId, answers) {
	enqueue({
		kind: 'timed',
		activityId,
		objectiveId,
		attemptId,
		answers: Object.fromEntries(
			Object.entries(answers).map(([id, value]) => [id, Array.isArray(value) ? [...value] : value])
		)
	});
}

export async function flushProgress() {
	if (flushing || !get(state).user) return;
	flushing = true;
	state.update((value) => ({ ...value, syncing: true }));
	const userId = get(state).user?.id;
	const previousLevel = get(state).summary?.level ?? 1;
	/** @type {import('#lib/celebrations.js').RewardResult[]} */
	const confirmations = [];
	let live = true;
	let batchId = '';
	try {
		while (userId && get(state).user?.id === userId) {
			const event = readQueue(userId)[0];
			if (!event) break;
			try {
				const { client, ...submission } = event;
				const contextKey = learningKey();
				const result = await api(
					event.mode === 'practice'
						? `/practice/${encodeURIComponent(event.activityId)}/progress`
						: '/progress',
					submission
				);
				storeQueue(
					userId,
					readQueue(userId).filter((item) => item.eventId !== event.eventId)
				);
				if (get(state).user?.id === userId) {
					sessionRevision += 1;
					state.update((value) => ({
						...value,
						summary: result.summary ?? value.summary,
						available: true,
						error: ''
					}));
					if (event.mode !== 'practice') confirmations.push(result);
					if (
						contextKey === learningKey() &&
						event.activityId === get(learningContext).activityId
					) {
						if (result.activity && event.mode === get(learningContext).mode)
							acceptLearning(result.activity);
						else void refreshLearningActivity();
					}
					batchId ||= event.eventId;
					if (!client || client.deferred || Date.now() - client.at > 15000) live = false;
				}
			} catch (error) {
				if (get(state).user?.id !== userId) break;
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
					problem.code === 'CHECKPOINT_COOLDOWN' ||
					problem.code.startsWith('ASSESSMENT_') ||
					problem.code.startsWith('TIMED_') ||
					problem.code.startsWith('PRACTICE_') ||
					problem.code.startsWith('OPENING_') ||
					problem.code.startsWith('TEACHER_') ||
					problem.code === 'CONTENT_VERSION'
				) {
					storeQueue(
						userId,
						readQueue(userId).filter((item) => item.eventId !== event.eventId)
					);
					// A rejected assessment must not block unrelated progress in the outbox.
					void refreshLab();
					void refreshLearningActivity();
					continue;
				}
				if (
					problem.status === 403 ||
					problem.status === 429 ||
					problem.status === 0 ||
					problem.status >= 500
				) {
					storeQueue(
						userId,
						readQueue(userId).map((item) => ({
							...item,
							client: { at: item.client?.at ?? 0, deferred: true }
						}))
					);
					break;
				}
				storeQueue(
					userId,
					readQueue(userId).filter((item) => item.eventId !== event.eventId)
				);
			}
		}
	} finally {
		if (userId && get(state).user?.id === userId) {
			const notice = buildCelebration({
				id: batchId,
				userId,
				previousLevel,
				results: confirmations,
				live
			});
			if (notice) rewardNotice.set(notice);
		}
		flushing = false;
		state.update((value) => ({ ...value, syncing: false }));
		const nextUser = get(state).user?.id;
		if (nextUser && nextUser !== userId && readQueue(nextUser).length) void flushProgress();
	}
}
