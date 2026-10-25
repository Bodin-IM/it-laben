/** @typedef {{id:string,nickname:string,createdAt:number,disabledAt:number|null,lastWorkedAt:number|null,xp:number,level:number,completed:number,checksCompleted:number,leaderboardVisible:boolean}} Student */
/** @typedef {{id:string,title:string,href:string,subject:string,format:string,completionEvidence:string,started:number,completed:number,checksCompleted:number}} ActivityTotals */
/** @typedef {{serverNow:number,students:number,enabled:number,disabled:number,activeWeek:number,completed:number,checksCompleted:number,activities:ActivityTotals[]}} Overview */
/** @typedef {{serverNow:number,total:number,page:number,pageSize:number,activityCount:number,students:Student[]}} StudentList */
/** @typedef {{id:string,title:string,href:string,subject:string,format:string,status:string,completed:number,total:number,checksCompleted:number,checksTotal:number,objectives:{id:string,title:string,kind:string,completedAt:number|null,updatedAt:number|null,nextAttemptAt:number|null}[]}} StudentActivity */
/** @typedef {{serverNow:number,student:Student,activities:StudentActivity[],achievements:{id:string,title:string,symbol:string,earnedAt:number}[],checks:{activityId:string,score:number,passed:number,submittedAt:number,teaching:number}[],shifts:{activityId:string,status:string,startedAt:number,endedAt:number|null,teaching:number}[]}} StudentDetail */
/** @typedef {{rank:number,nickname:string,xp:number,level:number,colorId:string,avatarId:string,badge:{title:string,symbol:string}|null}} LeaderboardEntry */
/** @typedef {{page:number,pageSize:number,total:number,entries:LeaderboardEntry[],self:LeaderboardEntry|null}} Leaderboard */

/** @param {number|null} value */
export function schoolDate(value) {
	return value === null
		? 'Ingen faglig aktivitet ennå'
		: new Intl.DateTimeFormat('nb-NO', { dateStyle: 'short', timeStyle: 'short' }).format(value);
}
