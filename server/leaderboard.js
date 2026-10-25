import { labColors, achievementDefinitions, rewardPolicy } from '../src/lib/progression.js';
import { avatarDefinition } from '../src/lib/avatars.js';

const ranking = `WITH points AS (
 SELECT user_id,SUM(points) AS xp FROM rewards GROUP BY user_id
), eligible AS (
 SELECT u.id,u.nickname,COALESCE(p.xp,0) AS xp,l.color_id,l.featured_achievement_id,l.avatar_id,
 a.achievement_id AS earned_feature
 FROM users u LEFT JOIN points p ON p.user_id=u.id LEFT JOIN lab_profiles l ON l.user_id=u.id
 LEFT JOIN achievements a ON a.user_id=u.id AND a.achievement_id=l.featured_achievement_id
 WHERE u.disabled_at IS NULL AND u.name_assigned=1 AND u.leaderboard_visible=1
 AND NOT EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id=u.id)
), ranked AS (SELECT *,RANK() OVER (ORDER BY xp DESC) AS rank FROM eligible)
`;

function entry(row) {
	const color = labColors.find((item) => item.id === row.color_id) ?? labColors[0];
	const badge = row.earned_feature
		? achievementDefinitions.find((item) => item.id === row.earned_feature)
		: null;
	return {
		rank: row.rank,
		nickname: row.nickname,
		xp: Number(row.xp),
		level: Math.floor(Number(row.xp) / rewardPolicy.xpPerLevel) + 1,
		colorId: color.id,
		avatarId: avatarDefinition(row.avatar_id).id,
		badge: badge ? { title: badge.title, symbol: badge.symbol } : null
	};
}

export function leaderboard(db, userId, pageValue = 1) {
	const page = Number(pageValue);
	if (!Number.isInteger(page) || page < 1 || page > 100000)
		throw new TypeError('Ugyldig sidenummer.');
	const total = db.prepare(`${ranking} SELECT COUNT(*) AS n FROM ranked`).get().n;
	const rows = db
		.prepare(
			`${ranking} SELECT * FROM ranked ORDER BY rank,nickname COLLATE NOCASE,id LIMIT 10 OFFSET ?`
		)
		.all((page - 1) * 10);
	const own = userId ? db.prepare(`${ranking} SELECT * FROM ranked WHERE id=?`).get(userId) : null;
	return { page, pageSize: 10, total, entries: rows.map(entry), self: own ? entry(own) : null };
}
