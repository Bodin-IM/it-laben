import test from 'node:test';
import assert from 'node:assert/strict';
import {
	catalog,
	buildCatalog,
	validateProgressionDefinitions,
	validateChallenge
} from '../server/catalog.js';
import {
	achievementDefinitions,
	evaluateGoal,
	nearestAchievement,
	nextActivity,
	trackDefinitions
} from '../src/lib/progression.js';
import { buildCelebration } from '../src/lib/celebrations.js';

function snapshot(completed = [], source = catalog) {
	return source.map((activity) => {
		const objectives = activity.objectives.map((item) => ({
			...item,
			completedAt: completed.includes(`${activity.id}:${item.id}`) ? 100 : null,
			updatedAt: completed.includes(`${activity.id}:${item.id}`) ? 100 : null,
			solution: null
		}));
		const required = objectives.filter((item) => item.required);
		const done = required.filter((item) => item.completedAt !== null).length;
		return {
			...activity,
			objectives,
			completed: done,
			total: required.length,
			checksCompleted: objectives.filter(
				(item) => item.kind === 'check' && item.completedAt !== null
			).length,
			checksTotal: objectives.filter((item) => item.kind === 'check').length,
			status:
				done === required.length
					? activity.completionEvidence === 'reviewed'
						? 'reviewed'
						: 'passed'
					: done
						? 'started'
						: 'new'
		};
	});
}

test('tillegg av fagsjekker trekker ikke tilbake en gjennomgått leksjon', () => {
	const progress = snapshot(['sessions:review']);
	const session = progress.find((item) => item.id === 'sessions');
	assert.equal(session.status, 'reviewed');
	assert.equal(session.completed, 1);
	assert.equal(session.total, 1);
	assert.equal(session.checksCompleted, 0);
	assert.equal(
		evaluateGoal({ type: 'objective', activityId: 'sessions', objectiveId: 'check-v1' }, progress)
			.completed,
		0
	);
});

test('merkeregler måler oppdrag på tvers av spill og bevis for den konkrete oppgaven', () => {
	const badge = achievementDefinitions.find((item) => item.id === 'session-guard');
	const progress = snapshot(['redd-chatten:avsender']);
	const half = evaluateGoal(badge.goal, progress);
	assert.equal(half.completed, 1);
	assert.equal(half.total, 2);
	assert.equal(half.next.id, 'meldingsdetektiven:session');
	assert.match(half.next.href, /oppdrag=session/);
	assert.equal(
		evaluateGoal(badge.goal, snapshot(['redd-chatten:avsender', 'meldingsdetektiven:session']))
			.completed,
		2
	);
});

test('fagvalg foreslår relevante mål også når første kandidat ligger i et annet fag', () => {
	const progress = snapshot();
	const badges = achievementDefinitions.map((item) => ({
		...item,
		...evaluateGoal(item.goal, progress),
		earnedAt: null
	}));
	const drift = nearestAchievement(badges, 'drift');
	assert.equal(drift.id, 'first-review');
	assert.equal(drift.next.subject, 'drift');
	assert.equal(nextActivity(progress, 'drift').id, 'oving-10:review');
	const both = achievementDefinitions.find((item) => item.id === 'both-subjects');
	const partial = evaluateGoal(both.goal, snapshot(['frontend-backend:review']));
	assert.equal(partial.completed, 1);
	assert.equal(partial.total, 2);
	assert.equal(partial.next.subject, 'drift');
});

test('en ny driftsaktivitet med en egen validator deltar i den samme progresjonsmodellen', () => {
	const activities = [
		{
			id: 'dns-lab',
			tittel: 'Finn DNS-feilen',
			href: '/dns-lab/',
			fag: 'drift',
			format: 'aktivitet',
			tracking: { kind: 'challenge', adapter: 'dns-simulator' }
		}
	];
	const adapters = {
		'dns-simulator': {
			objectives: [{ id: 'resolve', title: 'Riktig navneoppslag' }],
			validate: () => true
		}
	};
	const futureCatalog = buildCatalog(activities, adapters, []);
	const badge = {
		id: 'dns-detective',
		subjects: ['drift'],
		goal: { type: 'activity', activityId: 'dns-lab' }
	};
	validateProgressionDefinitions(futureCatalog, [badge], []);
	const goal = evaluateGoal(badge.goal, snapshot(['dns-lab:resolve'], futureCatalog));
	assert.equal(goal.completed, goal.total);
	assert.equal(futureCatalog[0].completionEvidence, 'passed');
	assert.equal(futureCatalog[0].objectives[0].points, 25);
});

test('en selvstendig fagsjekk kan være en ny aktivitetstype uten en spillvalidator', () => {
	const activities = [
		{
			id: 'nettverk-check',
			tittel: 'Nettverkssjekk',
			href: '/nettverk-check/',
			fag: 'drift',
			format: 'aktivitet',
			tracking: { kind: 'checkpoint' }
		}
	];
	const questions = [
		{
			activityId: 'nettverk-check',
			id: 'route-v1',
			title: 'Hvilken rute?',
			choices: [{ id: 'a' }, { id: 'b' }]
		}
	];
	const futureCatalog = buildCatalog(activities, {}, questions);
	assert.equal(futureCatalog[0].objectives[0].required, true);
	assert.equal(futureCatalog[0].completionEvidence, 'checked');
	assert.equal(snapshot(['nettverk-check:route-v1'], futureCatalog)[0].status, 'passed');
});

test('ukjente validatorer, dupliserte ID-er og ødelagte mål stopper feil konfigurasjon', () => {
	const bad = {
		id: 'new-game',
		tittel: 'Nytt spill',
		href: '/new-game/',
		fag: 'drift',
		format: 'spill',
		tracking: { kind: 'challenge', adapter: 'missing' }
	};
	assert.throws(() => buildCatalog([bad], {}, []), /validator/);
	const lesson = { ...bad, tracking: { kind: 'review' } };
	assert.throws(() => buildCatalog([lesson, lesson], {}, []), /flere ganger/);
	assert.throws(
		() =>
			validateProgressionDefinitions(
				catalog,
				[
					{
						id: 'wrong',
						subjects: [],
						goal: { type: 'objective', activityId: 'chat', objectiveId: 'typo' }
					}
				],
				[]
			),
		/Ukjent oppdrag/
	);
	validateProgressionDefinitions(catalog, achievementDefinitions, trackDefinitions);
	assert.throws(
		() =>
			validateProgressionDefinitions(
				catalog,
				[
					{
						id: 'unreachable',
						subjects: ['drift'],
						goal: { type: 'count', scope: 'activities', subject: 'drift', target: 100 }
					}
				],
				[]
			),
		/flere publiserte/
	);
});

test('nye validatorer kan ikke godkjenne oppgaver ved å returnere et objekt eller et uavventet løfte', () => {
	assert.throws(
		() => validateChallenge({ validate: () => ({ passed: false }) }, 'a', {}),
		/synkront/
	);
	assert.throws(
		() => validateChallenge({ validate: () => Promise.resolve(true) }, 'a', {}),
		/synkront/
	);
	assert.equal(validateChallenge({ validate: () => false }, 'a', {}), false);
	assert.equal(validateChallenge({ validate: () => true }, 'a', {}), true);
});

test('siste fagsteg og fagsjekk får riktige fortsett-lenker, og en ferdig samling har ingen neste oppgave', () => {
	const onlyLesson = snapshot(['sessions:review']).filter((item) => item.id === 'sessions');
	assert.equal(nextActivity(onlyLesson).href, '/sessions/#fagsjekk-check-v1');
	const everything = catalog.flatMap((item) =>
		item.objectives.map((objective) => `${item.id}:${objective.id}`)
	);
	assert.equal(nextActivity(snapshot(everything)), null);
});

const badge = { id: 'first-solution', title: 'Første løsning', symbol: '✓' };
const result = {
	duplicate: false,
	newRewards: [{ id: 'reward-a', points: 25, title: 'Oppdrag' }],
	newAchievements: [badge],
	summary: { level: 2 }
};

test('samlede feiringer viser ett nivåskifte og teller ikke samme kvittering eller belønning to ganger', () => {
	const batch = {
		id: 'event-a',
		userId: 'a',
		previousLevel: 1,
		results: [result, result, { ...result, duplicate: true }],
		live: true
	};
	const notice = buildCelebration(batch);
	assert.equal(notice.points, 25);
	assert.equal(notice.achievements.length, 1);
	assert.equal(notice.kind, 'level');
	assert.equal(buildCelebration({ ...batch, results: [{ ...result, duplicate: true }] }), null);
	const queued = buildCelebration({ ...batch, live: false });
	assert.equal(queued.kind, 'xp');
	assert.equal(queued.live, false);
	assert.match(queued.message, /synkronisert/);
});
