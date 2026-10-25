/** Timed activities share an engine; scenarios and grading stay on the server. */
export const timedChallenges = [
	{
		id: 'nattvakt',
		adapter: 'production-v1',
		objectiveId: 'shift-v1',
		title: 'Nattevakten',
		durationMs: 8 * 60 * 1000,
		cooldownMs: 24 * 60 * 60 * 1000,
		points: 50,
		prerequisites: [
			{
				activityId: 'frontend-backend',
				objectiveId: 'check-v2',
				title: 'Frontend møter backend',
				href: '/backend/#fagsjekk-check-v2'
			},
			{
				activityId: 'sessions',
				objectiveId: 'check-v2',
				title: 'Sessions og pålogging',
				href: '/sessions/#fagsjekk-check-v2'
			},
			{
				activityId: 'fillagring',
				objectiveId: 'check-v2',
				title: 'Lagring i JSON-fil',
				href: '/fillagring/#fagsjekk-check-v2'
			}
		]
	}
];

/** @typedef {Record<string,string|string[]>} TimedAnswers */
/** @typedef {{id:string,label:string,code?:string}} ShiftChoice */
/** @typedef {{id:string,type:'select'|'order',title:string,choices:ShiftChoice[]}} ShiftTask */
/** @typedef {{id:string,title:string,signal:string,file:string,code:string,logs:string[],tasks:ShiftTask[]}} ShiftIncident */
/** @typedef {{name:string,incidents:ShiftIncident[]}} ShiftScenario */
/** @typedef {{name:string,passed:boolean,detail:string}} ShiftCheck */
/** @typedef {{id:string,title:string,passed:boolean,checks:ShiftCheck[],explanation:string,solution:string[],lesson:{href:string,title:string}}} IncidentReport */
/** @typedef {{attemptId:string,reason:'passed'|'failed'|'expired',passed:boolean,score:number,total:number,elapsedMs:number,endedAt:number,incidents:IncidentReport[]}} ShiftReport */
/** @typedef {{id:string,startedAt:number,deadlineAt:number|null,untimed?:boolean,revision:number,scenario:ShiftScenario,answers:TimedAnswers}} ActiveShift */
/** @typedef {{unlocked:boolean,access?:{mode:string,canStart:boolean,canRestart?:boolean,used:boolean,closed:boolean,endsAt:number|null,teacher?:boolean},prerequisites:{activityId:string,objectiveId:string,title:string,href:string,completed:boolean}[],active:ActiveShift|null,report:ShiftReport|null,nextAttemptAt:number|null,attempts:number,bestMs:number|null}} ShiftState */
/** @typedef {{serverNow:number,state:ShiftState,summary?:import('./lab.js').Summary}} ShiftResponse */

/** @param {number} milliseconds */
export function shiftClock(milliseconds) {
	const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
	return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

/** @param {ShiftTask} task @param {string|string[]|undefined} answer */
export function taskAnswered(task, answer) {
	return task.type === 'order'
		? Array.isArray(answer) && answer.length === task.choices.length
		: typeof answer === 'string' && task.choices.some((item) => item.id === answer);
}
