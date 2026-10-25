import { writable, get } from 'svelte/store';

/** @typedef {'idle'|'working'|'thinking'|'retry'|'success'|'celebrate'} AvatarMood */
/** @type {import('svelte/store').Writable<{key:string,activityId:string,userId:string,mood:AvatarMood,message:string,until:number,serial:number}>} */
const state = writable({
	key: '',
	activityId: '',
	userId: '',
	mood: 'idle',
	message: '',
	until: 0,
	serial: 0
});
export const avatarReaction = { subscribe: state.subscribe };
/** @param {string} userId @param {string} activityId @param {string} scope */
export function setAvatarContext(userId, activityId, scope) {
	const key = `${userId}:${activityId}:${scope}`;
	if (get(state).key !== key)
		state.set({
			key,
			userId,
			activityId,
			mood: 'idle',
			message: '',
			until: 0,
			serial: get(state).serial + 1
		});
}
/** Visual feedback only: it never records progress or awards XP.
 * @param {string} activityId @param {AvatarMood} mood @param {string} message @param {string} [userId] */
export function avatarFeedback(activityId, mood, message, userId) {
	const current = get(state);
	if (!current.userId || current.activityId !== activityId || (userId && current.userId !== userId))
		return;
	state.set({
		...current,
		mood,
		message,
		until: Date.now() + (mood === 'working' ? 2500 : 6500),
		serial: current.serial + 1
	});
}
/** @param {number} serial */
export function clearAvatarFeedback(serial) {
	if (get(state).serial === serial)
		state.update((value) => ({ ...value, mood: 'idle', message: '', until: 0 }));
}
