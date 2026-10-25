import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createProgressQueue, eventPrefix } from '../src/lib/progressQueue.js';

function storage() {
	const data = new Map();
	return {
		get length() {
			return data.size;
		},
		key: (index) => [...data.keys()][index] ?? null,
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => {
			data.set(key, value);
		},
		removeItem: (key) => {
			data.delete(key);
		},
		clear: () => data.clear()
	};
}
function event(accountId, at, extras = {}) {
	return {
		eventId: randomUUID(),
		accountId,
		version: 2,
		kind: 'review',
		activityId: 'frontend-backend',
		objectiveId: 'review',
		confirmed: true,
		mode: 'normal',
		openingId: null,
		client: { at, deferred: false },
		...extras
	};
}
const ids = (queue, user) => queue.list(user).map((item) => item.eventId);

test('offlinekø: to faner og en ny nettleserlast beholder begge forsøkene', () => {
	const saved = storage(),
		user = randomUUID();
	const a = createProgressQueue({ storage: () => saved }),
		b = createProgressQueue({ storage: () => saved });
	assert.deepEqual(a.list(user), []);
	assert.deepEqual(b.list(user), []);
	const first = event(user, 1),
		second = event(user, 2, { activityId: 'sessions' });
	a.add(first);
	b.add(second);
	assert.deepEqual(ids(a, user), [first.eventId, second.eventId]);
	assert.deepEqual(ids(b, user), [first.eventId, second.eventId]);
	const reload = createProgressQueue({ storage: () => saved });
	assert.deepEqual(ids(reload, user), [first.eventId, second.eventId]);
	assert.equal(a.list(user)[0].client.deferred, false);
	assert.equal(reload.list(user)[0].client.deferred, true);
});

test('offlinekø: kvittering i en fane fjerner bare sitt forsøk, også ved forsinket retry', () => {
	const saved = storage(),
		user = randomUUID();
	const a = createProgressQueue({ storage: () => saved }),
		b = createProgressQueue({ storage: () => saved });
	const first = event(user, 1),
		second = event(user, 2),
		third = event(user, 3);
	a.add(first);
	b.list(user);
	b.add(second);
	a.remove(user, first.eventId);
	b.defer(user);
	b.add(third);
	assert.deepEqual(ids(a, user), [second.eventId, third.eventId]);
	b.remove(user, first.eventId);
	assert.deepEqual(ids(b, user), [second.eventId, third.eventId]);
	a.remove(user, second.eventId);
	b.remove(user, third.eventId);
	assert.deepEqual(a.list(user), []);
	assert.deepEqual(b.list(user), []);
});

test('offlinekø: gamle køer migreres med samme ID, konto, modus, åpning og innsendingsformat', () => {
	const saved = storage(),
		user = randomUUID(),
		other = randomUUID();
	const original = event(user, 1, {
		kind: 'check',
		attemptId: randomUUID(),
		mode: 'practice',
		solution: { question: 'choice' }
	});
	const teaching = event(user, 2, { mode: 'teaching', openingId: randomUUID() });
	saved.setItem(
		'it-laben-pending-v1-' + user,
		JSON.stringify([original, teaching, event(other, 1)])
	);
	const a = createProgressQueue({ storage: () => saved }),
		b = createProgressQueue({ storage: () => saved });
	const migrated = a.list(user);
	assert.deepEqual(
		migrated.map(({ client, ...item }) => item),
		[original, teaching].map(({ client, ...item }) => item)
	);
	assert.equal(saved.getItem('it-laben-pending-v1-' + user), null);
	assert.deepEqual(ids(b, user), [original.eventId, teaching.eventId]);
	assert.equal(saved.length, 2);
});

test('offlinekø: lagringsfeil beholder arbeid i fanen og varsler uten å gjenopplive kvitterte hendelser', () => {
	let writable = false,
		warnings = 0;
	const saved = storage(),
		user = randomUUID(),
		first = event(user, 1);
	const unavailable = () => {
		if (!writable) throw new Error('Storage blocked');
		return saved;
	};
	const queue = createProgressQueue({ storage: unavailable, onWarning: () => warnings++ });
	queue.add(first);
	assert.deepEqual(ids(queue, user), [first.eventId]);
	assert.ok(warnings > 0);
	writable = true;
	assert.deepEqual(ids(queue, user), [first.eventId]);
	queue.remove(user, first.eventId);
	assert.deepEqual(queue.list(user), []);
});

test('offlinekø: kontoer isoleres og sletting endrer ikke en annen kontos arbeid', () => {
	const saved = storage(),
		a = randomUUID(),
		b = randomUUID(),
		first = event(a, 1),
		second = event(b, 2);
	const queue = createProgressQueue({ storage: () => saved });
	queue.add(first);
	queue.add(second);
	assert.deepEqual(ids(queue, a), [first.eventId]);
	queue.clear(a);
	assert.deepEqual(ids(queue, b), [second.eventId]);
	assert.equal(
		queue.isChange(eventPrefix + encodeURIComponent(b) + ':' + second.eventId, a),
		false
	);
	assert.equal(queue.isChange(null, a), true);
});

test('offlinekø: en avbrutt migrasjon beholder den gamle køen og kan fullføres senere', () => {
	const saved = storage(),
		user = randomUUID(),
		first = event(user, 1),
		second = event(user, 2);
	const legacy = 'it-laben-pending-v1-' + user;
	saved.setItem(legacy, JSON.stringify([first, second]));
	const write = saved.setItem;
	let writes = 0;
	saved.setItem = (key, value) => {
		if (++writes === 2) throw new Error('Quota');
		write(key, value);
	};
	let warnings = 0;
	const queue = createProgressQueue({ storage: () => saved, onWarning: () => warnings++ });
	queue.list(user);
	assert.ok(saved.getItem(legacy));
	assert.ok(warnings);
	saved.setItem = write;
	assert.deepEqual(ids(queue, user), [first.eventId, second.eventId]);
	assert.equal(saved.length, 2);
});

test('offlinekø: full lagring ved gammel kø blokkerer ikke et tidligere lagret v2-forsøk', () => {
	const saved = storage(),
		user = randomUUID(),
		first = event(user, 1),
		second = event(user, 2);
	const queue = createProgressQueue({ storage: () => saved });
	queue.add(second);
	saved.setItem('it-laben-pending-v1-' + user, JSON.stringify([first]));
	saved.setItem = () => {
		throw new Error('Quota');
	};
	assert.deepEqual(ids(queue, user), [first.eventId, second.eventId]);
	queue.remove(user, first.eventId);
	assert.deepEqual(ids(queue, user), [second.eventId]);
});
