/** Public metadata only. The API issues the actual questions for each attempt. */
/** @typedef {{activityId:string,id:string,title:string}} Checkpoint */
/** @type {Checkpoint[]} */
export const checkpoints = [
	'frontend-backend',
	'chatrom',
	'fillagring',
	'sessions',
	'oving-5',
	'oving-6',
	'oving-7',
	'oving-8',
	'oving-9',
	'oving-10',
	'redd-chatten',
	'meldingsdetektiven',
	'chat'
].map((activityId) => ({ activityId, id: 'check-v2', title: 'Sjekk forståelsen' }));
/** @param {string} activityId */
export const checkpointsFor = (activityId) =>
	checkpoints.filter((item) => item.activityId === activityId);
