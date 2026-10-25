/** @typedef {{id:string,title:string,symbol:string}} EarnedBadge */
/** @typedef {{id:string,message:string,detail:string,points:number,level:number,kind:'xp'|'achievement'|'level',achievements:EarnedBadge[],live:boolean,userId:string}} Celebration */
/** @typedef {{duplicate:boolean,newRewards:{id:string,points:number,title:string}[],newAchievements:EarnedBadge[],summary:{level:number}}} RewardResult */

/**
 * One presentation per flush, with deterministic IDs and no replay of receipts.
 * @param {{id:string,userId:string,previousLevel:number,results:RewardResult[],live:boolean}} batch
 * @returns {Celebration|null}
 */
export function buildCelebration(batch) {
	const results = batch.results.filter((item) => !item.duplicate);
	const rewards = [
		...new Map(results.flatMap((item) => item.newRewards).map((item) => [item.id, item])).values()
	];
	const achievements = [
		...new Map(
			results.flatMap((item) => item.newAchievements).map((item) => [item.id, item])
		).values()
	];
	const points = rewards.reduce((sum, item) => sum + item.points, 0);
	if (!points && !achievements.length) return null;
	const level = Math.max(batch.previousLevel, ...results.map((item) => item.summary.level));
	const kind = !batch.live
		? 'xp'
		: level > batch.previousLevel
			? 'level'
			: achievements.length
				? 'achievement'
				: 'xp';
	return {
		id: batch.id,
		userId: batch.userId,
		points,
		level,
		kind,
		achievements,
		live: batch.live,
		message: !batch.live
			? 'Fremgangen din er synkronisert'
			: kind === 'level'
				? `Du er på labnivå ${level}!`
				: (achievements[0]?.title ?? rewards.at(-1)?.title ?? 'Oppdrag bestått'),
		detail: !batch.live
			? 'Alt er lagret i Min lab.'
			: achievements.length > 1
				? `${achievements.length} nye merker i samlingen din.`
				: achievements.length
					? 'Et nytt merke i samlingen din.'
					: 'Et steg videre. Fremgangen er lagret.'
	};
}
