import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase, transaction } from '../server/database.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { setTeacherRole, setAdminRole } from '../server/learning-access.js';
import {
	adjectives,
	animals,
	generateUsername,
	assignExistingUsernames
} from '../server/usernames.js';
import { backupDatabase } from '../server/backup.js';
import { aktiviteter } from '../src/lib/innhold.js';
import {
	teachingPlans,
	buildPresentationLessons,
	validateTeachingPlans,
	presentationLink,
	studentLessonLink
} from '../src/lib/teaching.js';
import { teachingGuides, validateTeachingGuides } from '../server/teaching.js';
import { catalog, buildCatalog } from '../server/catalog.js';
import { avatars } from '../src/lib/avatars.js';

const namePattern = /^[\p{L}]+ [\p{L}]+ [1-9][0-9]{3}$/u;

async function fixture(t, prepare) {
	const directory = mkdtempSync(join(tmpdir(), 'itlab-school-'));
	const filename = join(directory, 'school.sqlite');
	if (prepare) prepare(filename);
	const db = openDatabase(filename);
	let now = Date.UTC(2026, 9, 25, 10);
	const config = readConfig();
	const server = createApp({ db, config, clock: () => now, limits: false }).listen(0, '127.0.0.1');
	await once(server, 'listening');
	const base = `http://127.0.0.1:${server.address().port}`;
	t.after(async () => {
		await new Promise((resolve) => server.close(resolve));
		db.close();
		rmSync(directory, { recursive: true, force: true });
	});
	function client() {
		return {
			cookie: '',
			csrf: '',
			user: null,
			key: null,
			async request(path, body, options = {}) {
				const response = await fetch(base + path, {
					method: body === undefined ? 'GET' : 'POST',
					headers: {
						...(body === undefined
							? {}
							: { 'Content-Type': 'application/json', Origin: options.origin ?? config.origin }),
						...(this.cookie ? { Cookie: this.cookie } : {}),
						...(this.csrf && options.csrf !== false ? { 'X-CSRF-Token': this.csrf } : {})
					},
					body: body === undefined ? undefined : JSON.stringify(body)
				});
				const cookie = response.headers.getSetCookie()[0];
				if (cookie) this.cookie = cookie.split(';')[0];
				const result = await response.json();
				if (result.user) this.user = result.user;
				if (result.csrfToken) this.csrf = result.csrfToken;
				if (result.recoveryKey) this.key = result.recoveryKey;
				return { status: response.status, result };
			},
			async create(body = {}) {
				const response = await this.request('/api/auth/create', body);
				assert.equal(response.status, 201);
				return response;
			},
			async visible(value) {
				return this.request('/api/me/leaderboard', { accountId: this.user.id, visible: value });
			},
			async action(target, action, extras = {}, options = {}) {
				return this.request(
					`/api/teacher/students/${target.id}/${action}`,
					{ id: randomUUID(), accountId: this.user.id, confirmName: target.nickname, ...extras },
					options
				);
			}
		};
	}
	async function staff(role = 'teacher') {
		const person = client();
		await person.create();
		if (role === 'admin') setAdminRole(db, person.user.id, true, now);
		else setTeacherRole(db, person.user.id, true, now);
		await person.request('/api/me');
		return person;
	}
	function points(person, xp) {
		db.prepare('INSERT INTO rewards VALUES (?,?,?,?,?,?)').run(
			randomUUID(),
			person.user.id,
			randomUUID(),
			xp,
			'Kontrollert testbelønning',
			now
		);
	}
	return {
		db,
		filename,
		directory,
		client,
		staff,
		points,
		now: () => now,
		advance: (ms) => {
			now += ms;
		}
	};
}

test('brukernavn: serveren tildeler navn, ignorerer klientnavn og sperrer selvvalgt endring', async (t) => {
	const f = await fixture(t),
		student = f.client();
	const response = await student.create({
		nickname: 'VALGT NAVN',
		role: 'admin',
		name_assigned: 0,
		leaderboard_visible: 0
	});
	assert.match(student.user.nickname, namePattern);
	assert.notEqual(student.user.nickname, 'VALGT NAVN');
	assert.equal(student.user.role, 'student');
	assert.equal(student.user.leaderboardVisible, true);
	const changed = await student.request('/api/me/nickname', { nickname: 'NYTT NAVN' });
	assert.equal(changed.status, 403);
	assert.equal(changed.result.error.code, 'NAME_MANAGED');
	assert.equal(
		(await student.request('/api/me')).result.user.nickname,
		response.result.user.nickname
	);
});

test('avatar: kun forhåndslagde figurer, varig profilvalg, riktig toppliste og ingen ekstra XP', async (t) => {
	const f = await fixture(t),
		a = f.client(),
		b = f.client();
	const created = await a.create();
	await b.create();
	assert.equal(created.result.summary.lab.avatarId, 'robot');
	for (const item of avatars) {
		const changed = await a.request('/api/me/lab', {
			accountId: a.user.id,
			colorId: 'forest',
			featuredAchievementId: null,
			avatarId: item.id
		});
		assert.equal(changed.status, 200);
		assert.equal(changed.result.summary.lab.avatarId, item.id);
		assert.equal(changed.result.summary.xp, 0);
		const board = await f.client().request('/api/leaderboard');
		assert.equal(
			board.result.entries.find((row) => row.nickname === a.user.nickname).avatarId,
			item.id
		);
	}
	assert.equal(
		(
			await a.request('/api/me/lab', {
				colorId: 'forest',
				featuredAchievementId: null,
				avatarId: 'https://example.test/image.svg'
			})
		).status,
		400
	);
	assert.equal(
		(
			await a.request('/api/me/lab', {
				accountId: b.user.id,
				colorId: 'forest',
				featuredAchievementId: null,
				avatarId: 'fox'
			})
		).status,
		409
	);
	assert.equal((await b.request('/api/me')).result.summary.lab.avatarId, 'robot');
	const c = f.client();
	assert.equal(
		(await c.request('/api/auth/key', { key: a.key.key })).result.summary.lab.avatarId,
		avatars.at(-1).id
	);
	// Older clients may save only color/badge; they must preserve the chosen avatar.
	assert.equal(
		(await c.request('/api/me/lab', { colorId: 'forest', featuredAchievementId: null })).result
			.summary.lab.avatarId,
		avatars.at(-1).id
	);
	const backup = join(f.directory, 'avatar-backup.sqlite');
	backupDatabase(f.filename, backup);
	const restored = openDatabase(backup);
	try {
		assert.equal(
			restored.prepare('SELECT avatar_id FROM lab_profiles WHERE user_id=?').get(a.user.id)
				.avatar_id,
			avatars.at(-1).id
		);
	} finally {
		restored.close();
	}
});

test('avatar: oppgradering fra v7 bevarer eksisterende labkort, nøkkel og poeng', async (t) => {
	const id = randomUUID(),
		key = `itlab_${randomBytes(32).toString('base64url')}`;
	const f = await fixture(t, (filename) => {
		const db = new DatabaseSync(filename),
			directory = new URL('../server/migrations/', import.meta.url);
		db.exec(
			'PRAGMA foreign_keys=ON; CREATE TABLE migrations(name TEXT PRIMARY KEY,hash TEXT NOT NULL,applied_at INTEGER NOT NULL)'
		);
		for (const name of readdirSync(directory)
			.filter((item) => item.endsWith('.sql'))
			.sort()
			.slice(0, 7)) {
			const sql = readFileSync(new URL(name, directory), 'utf8');
			db.exec(sql);
			db.prepare('INSERT INTO migrations VALUES (?,?,?)').run(
				name,
				createHash('sha256').update(sql).digest('hex'),
				1
			);
		}
		db.prepare(
			'INSERT INTO users(id,nickname,created_at,name_assigned,leaderboard_visible) VALUES (?,?,1,1,1)'
		).run(id, 'Lur Oter 3456');
		db.prepare('INSERT INTO lab_profiles VALUES (?,?,?)').run(id, 'ocean', null);
		db.prepare('INSERT INTO recovery_keys VALUES (?,?,1)').run(
			createHash('sha256').update(key).digest('hex'),
			id
		);
		db.prepare('INSERT INTO rewards VALUES (?,?,?,25,?,1)').run(
			randomUUID(),
			id,
			'legacy',
			'Behold XP'
		);
		db.close();
	});
	const result = await f.client().request('/api/auth/key', { key });
	assert.equal(result.status, 200);
	assert.equal(result.result.summary.xp, 25);
	assert.equal(result.result.summary.lab.colorId, 'ocean');
	assert.equal(result.result.summary.lab.avatarId, 'robot');
	assert.equal((await f.client().request('/api/leaderboard')).result.entries[0].avatarId, 'robot');
});

test('navnegenerator: 90 millioner kombinasjoner, kollisjonsforsøk og unik databasebegrensning', async (t) => {
	const f = await fixture(t);
	assert.equal(adjectives.length * animals.length * 9000, 90000000);
	const first = f.client();
	await first.create();
	f.db.prepare("UPDATE users SET nickname='Lur Oter 1000' WHERE id=?").run(first.user.id);
	const choices = [0, 0, 0, 1, 0, 0];
	assert.equal(
		generateUsername(f.db, () => choices.shift()),
		'Rask Oter 1000'
	);
	assert.throws(() => generateUsername(f.db, () => 0));
	transaction(f.db, () => {
		for (let i = 0; i < 1000; i++)
			f.db
				.prepare('INSERT INTO users(id,nickname,created_at,name_assigned) VALUES (?,?,?,1)')
				.run(randomUUID(), generateUsername(f.db), f.now());
	});
	assert.equal(f.db.prepare('SELECT COUNT(DISTINCT nickname) AS n FROM users').get().n, 1001);
	assert.throws(() =>
		f.db
			.prepare('INSERT INTO users(id,nickname,created_at,name_assigned) VALUES (?,?,?,1)')
			.run(randomUUID(), 'lur oter 1000', f.now())
	);
});

test('oppgradering fra v5: duplikatnavn erstattes én gang uten å miste konto, nøkkel, rolle eller XP', async (t) => {
	const ids = [randomUUID(), randomUUID()],
		raw = `itlab_${randomBytes(32).toString('base64url')}`;
	const f = await fixture(t, (filename) => {
		const db = new DatabaseSync(filename);
		db.exec(
			'PRAGMA foreign_keys=ON; CREATE TABLE migrations(name TEXT PRIMARY KEY,hash TEXT NOT NULL,applied_at INTEGER NOT NULL)'
		);
		const directory = new URL('../server/migrations/', import.meta.url);
		for (const file of readdirSync(directory)
			.filter((item) => item.endsWith('.sql'))
			.sort()
			.slice(0, 5)) {
			const sql = readFileSync(new URL(file, directory), 'utf8');
			db.exec(sql);
			db.prepare('INSERT INTO migrations VALUES (?,?,?)').run(
				file,
				createHash('sha256').update(sql).digest('hex'),
				1
			);
		}
		for (const id of ids)
			db.prepare('INSERT INTO users VALUES (?,?,?)').run(id, 'Samme selvvalgte navn', 1);
		db.prepare("INSERT INTO user_roles VALUES (?,'teacher',1)").run(ids[0]);
		db.prepare('INSERT INTO recovery_keys VALUES (?,?,1)').run(
			createHash('sha256').update(raw).digest('hex'),
			ids[1]
		);
		db.prepare('INSERT INTO rewards VALUES (?,?,?,25,?,1)').run(
			randomUUID(),
			ids[1],
			'legacy',
			'Behold XP'
		);
		db.close();
	});
	const rows = f.db.prepare('SELECT * FROM users ORDER BY id').all();
	for (const row of rows) {
		assert.match(row.nickname, namePattern);
		assert.equal(row.name_assigned, 1);
		assert.equal(row.leaderboard_visible, 1);
	}
	assert.notEqual(rows[0].nickname, rows[1].nickname);
	assert.equal(assignExistingUsernames(f.db), 0);
	assert.deepEqual(
		f.db
			.prepare('SELECT nickname FROM users ORDER BY id')
			.all()
			.map((row) => row.nickname),
		rows.map((row) => row.nickname)
	);
	assert.equal(
		f.db.prepare('SELECT role FROM user_roles WHERE user_id=?').get(ids[0]).role,
		'teacher'
	);
	const login = await f.client().request('/api/auth/key', { key: raw });
	assert.equal(login.status, 200);
	assert.equal(login.result.user.id, ids[1]);
	assert.equal(login.result.summary.xp, 25);
});

test('elevoversikt: privat tilgang, paginering, søk som tekst og ingen innloggingshemmeligheter', async (t) => {
	const f = await fixture(t),
		teacher = await f.staff(),
		admin = await f.staff('admin'),
		student = f.client();
	await student.create();
	assert.equal((await f.client().request('/api/teacher/students')).status, 401);
	assert.equal((await student.request('/api/teacher/students')).status, 403);
	for (let i = 0; i < 28; i++)
		f.db
			.prepare('INSERT INTO users(id,nickname,created_at,name_assigned) VALUES (?,?,?,1)')
			.run(randomUUID(), `Test Oter ${3000 + i}`, f.now());
	const list = await teacher.request('/api/teacher/students');
	assert.equal(list.status, 200);
	assert.equal(list.result.total, 29);
	assert.equal(list.result.students.length, 25);
	assert.ok(
		!list.result.students.some((item) => [teacher.user.id, admin.user.id].includes(item.id))
	);
	assert.equal((await teacher.request('/api/teacher/students?page=2')).result.students.length, 4);
	assert.equal((await teacher.request('/api/teacher/students?q=Test%20Oter')).result.total, 28);
	for (const query of ['%', '_', "' OR 1=1 --", String.fromCharCode(92)])
		assert.equal(
			(await teacher.request('/api/teacher/students?q=' + encodeURIComponent(query))).result.total,
			0
		);
	for (const query of ['page=-1', 'page=1.1', 'status=bad', 'q=' + 'a'.repeat(81)])
		assert.equal((await teacher.request('/api/teacher/students?' + query)).status, 400);
	const detail = await teacher.request('/api/teacher/students/' + student.user.id);
	assert.equal(detail.status, 200);
	const encoded = JSON.stringify(detail.result);
	for (const hidden of [
		'solution',
		'snapshot',
		'answers_json',
		'questions_json',
		'csrf',
		'hash',
		student.key.key
	])
		assert.ok(!encoded.includes(hidden), hidden);
	assert.equal((await teacher.request('/api/teacher/students/' + teacher.user.id)).status, 404);
});

test('faglig oversikt: gjennomgått og bestått skilles, og automatisk polling flytter ikke sist jobbet', async (t) => {
	const f = await fixture(t),
		teacher = await f.staff(),
		student = f.client();
	await student.create();
	await student.request('/api/progress', {
		accountId: student.user.id,
		eventId: randomUUID(),
		version: 2,
		kind: 'review',
		activityId: 'frontend-backend',
		objectiveId: 'review',
		confirmed: true
	});
	const first = await teacher.request('/api/teacher/students/' + student.user.id);
	assert.equal(first.result.student.completed, 1);
	assert.equal(first.result.student.checksCompleted, 0);
	assert.equal(first.result.student.xp, 0);
	f.advance(120000);
	await student.request('/api/me');
	const after = await teacher.request('/api/teacher/students/' + student.user.id);
	assert.equal(after.result.student.lastWorkedAt, first.result.student.lastWorkedAt);
	const overview = await teacher.request('/api/teacher/overview');
	assert.equal(overview.result.students, 1);
	assert.equal(overview.result.activeWeek, 1);
	assert.equal(overview.result.completed, 1);
	assert.equal(overview.result.checksCompleted, 0);
});

test('nytt tildelt navn: lærertilgang og CSRF kreves, omforsøk gir ikke flere endringer', async (t) => {
	const f = await fixture(t),
		teacher = await f.staff(),
		student = f.client();
	await student.create();
	const original = student.user.nickname,
		id = randomUUID();
	assert.equal((await student.action(student.user, 'rename')).status, 403);
	assert.equal((await teacher.action(student.user, 'rename', {}, { csrf: false })).status, 403);
	assert.equal(
		(await teacher.action(student.user, 'rename', { accountId: student.user.id })).status,
		409
	);
	const first = await teacher.action(student.user, 'rename', { id, nickname: 'IKKE BRUK DETTE' });
	assert.equal(first.status, 200);
	const changed = f.db
		.prepare('SELECT nickname FROM users WHERE id=?')
		.get(student.user.id).nickname;
	assert.notEqual(changed, original);
	assert.match(changed, namePattern);
	assert.equal((await teacher.action(student.user, 'rename', { id })).status, 200);
	assert.equal(
		f.db.prepare('SELECT nickname FROM users WHERE id=?').get(student.user.id).nickname,
		changed
	);
	assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM management_actions').get().n, 1);
	assert.equal(
		(await teacher.action(student.user, 'rename', { id, confirmName: changed })).status,
		409
	);
	const login = await f.client().request('/api/auth/key', { key: student.key.key });
	assert.equal(login.status, 200);
	assert.equal(login.result.user.nickname, changed);
});

test('deaktivering: bare administrator, alle økter stenges, nøkkel sperres og poeng beholdes ved reaktivering', async (t) => {
	const f = await fixture(t),
		teacher = await f.staff(),
		admin = await f.staff('admin'),
		student = f.client();
	await student.create();
	f.points(student, 50);
	await student.visible(true);
	const other = f.client();
	await other.request('/api/auth/key', { key: student.key.key });
	assert.equal((await teacher.action(student.user, 'status', { disabled: true })).status, 403);
	assert.equal((await admin.action(teacher.user, 'status', { disabled: true })).status, 404);
	assert.equal((await admin.action(student.user, 'status', { disabled: true })).status, 200);
	assert.throws(() => setTeacherRole(f.db, student.user.id, true));
	assert.throws(() => setAdminRole(f.db, student.user.id, true));
	assert.equal(
		f.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id=?').get(student.user.id).n,
		0
	);
	assert.equal((await student.request('/api/me')).result.user, null);
	assert.equal((await other.request('/api/teacher/students')).status, 401);
	assert.equal((await f.client().request('/api/auth/key', { key: student.key.key })).status, 403);
	assert.equal((await f.client().request('/api/leaderboard')).result.total, 0);
	assert.equal((await teacher.request('/api/teacher/students?status=disabled')).result.total, 1);
	assert.equal((await admin.action(student.user, 'status', { disabled: false })).status, 200);
	assert.equal((await student.request('/api/me')).result.user, null);
	const login = await f.client().request('/api/auth/key', { key: student.key.key });
	assert.equal(login.status, 200);
	assert.equal(login.result.summary.xp, 50);
});

test('sletting: krever deaktivert elev og riktig navn, anonymiserer audit og tåler tapt svar', async (t) => {
	const f = await fixture(t),
		admin = await f.staff('admin'),
		student = f.client();
	await student.create();
	f.points(student, 25);
	assert.equal((await admin.action(student.user, 'delete')).status, 409);
	await admin.action(student.user, 'status', { disabled: true });
	assert.equal((await admin.action(student.user, 'delete', { confirmName: 'feil' })).status, 409);
	const id = randomUUID();
	assert.equal((await admin.action(student.user, 'delete', { id })).status, 200);
	assert.equal((await admin.action(student.user, 'delete', { id })).status, 200);
	for (const table of ['users', 'recovery_keys', 'rewards', 'sessions'])
		assert.equal(
			f.db
				.prepare(
					`SELECT COUNT(*) AS n FROM ${table} WHERE ${table === 'users' ? 'id' : 'user_id'}=?`
				)
				.get(student.user.id).n,
			0
		);
	assert.ok(
		f.db
			.prepare('SELECT * FROM management_actions')
			.all()
			.every((item) => item.target_id === null)
	);
	assert.equal((await f.client().request('/api/auth/key', { key: student.key.key })).status, 401);
});

test('administrator: arver lærerfunksjoner, siste admin beskyttes og faktisk CLI bruker riktig database', async (t) => {
	const f = await fixture(t),
		admin = await f.staff('admin'),
		other = await f.staff();
	assert.equal((await admin.request('/api/teacher')).status, 200);
	assert.equal((await admin.request('/api/me')).result.user.role, 'admin');
	assert.throws(() => setTeacherRole(f.db, admin.user.id, false));
	assert.throws(() => setAdminRole(f.db, admin.user.id, false));
	assert.equal((await admin.request('/api/me/delete', { confirm: 'SLETT' })).status, 409);
	const run = (...args) =>
		spawnSync(process.execPath, ['server/admin.js', ...args], {
			cwd: new URL('..', import.meta.url),
			env: { ...process.env, ITLAB_DB_PATH: f.filename },
			encoding: 'utf8'
		});
	assert.equal(run('grant', other.user.id).status, 0);
	assert.equal((await other.request('/api/me')).result.user.role, 'admin');
	assert.equal(run('revoke', admin.user.id).status, 0);
	assert.equal((await admin.request('/api/me')).result.user.role, 'teacher');
	const student = f.client();
	await student.create();
	assert.equal((await admin.action(student.user, 'status', { disabled: true })).status, 403);
	assert.notEqual(run('revoke', other.user.id).status, 0);
});

test('toppliste: på som standard, bare aktive elever, korrekt delt rangering og minimal offentlig respons', async (t) => {
	const f = await fixture(t),
		teacher = await f.staff(),
		admin = await f.staff('admin');
	const students = [];
	for (let i = 0; i < 13; i++) {
		const student = f.client();
		await student.create();
		f.points(student, i < 2 ? 100 : 50 - i);
		students.push(student);
	}
	const guest = f.client();
	assert.equal((await guest.request('/api/leaderboard')).result.total, 13);
	assert.equal((await teacher.visible(true)).status, 403);
	assert.equal((await admin.visible(true)).status, 403);
	const publicResult = await guest.request('/api/leaderboard');
	assert.equal(publicResult.status, 200);
	assert.equal(publicResult.result.total, 13);
	assert.equal(publicResult.result.maxXp, 100);
	assert.equal(publicResult.result.entries.length, 10);
	assert.equal(publicResult.result.self, null);
	assert.deepEqual(
		publicResult.result.entries.slice(0, 3).map((item) => item.rank),
		[1, 1, 3]
	);
	for (const entry of publicResult.result.entries)
		assert.deepEqual(
			Object.keys(entry).sort(),
			['rank', 'nickname', 'classCode', 'xp', 'level', 'colorId', 'avatarId', 'badge'].sort()
		);
	const own = await students[12].request('/api/leaderboard');
	assert.equal(own.result.self.rank, 13);
	assert.equal(own.result.maxXp, 100);
	assert.equal((await guest.request('/api/leaderboard?page=2')).result.entries.length, 3);
	assert.equal((await guest.request('/api/leaderboard?page=2')).result.maxXp, 100);
	assert.equal((await guest.request('/api/leaderboard?page=100')).result.maxXp, 100);
	assert.equal((await guest.request('/api/leaderboard?page=-1')).status, 400);
	await students[0].visible(false);
	assert.equal((await guest.request('/api/leaderboard')).result.total, 12);
	await admin.action(students[1].user, 'status', { disabled: true });
	assert.equal((await guest.request('/api/leaderboard')).result.total, 11);
	assert.equal((await guest.request('/api/leaderboard')).result.maxXp, 48);
	// Hidden/disabled profiles and staff must never define the public chart scale.
	f.points(teacher, 9000);
	f.points(admin, 8000);
	assert.equal((await guest.request('/api/leaderboard')).result.maxXp, 48);
	for (const student of students.slice(2)) await student.visible(false);
	assert.equal((await guest.request('/api/leaderboard')).result.maxXp, 0);
	const beginner = f.client();
	await beginner.create();
	assert.equal((await guest.request('/api/leaderboard')).result.maxXp, 0);
	assert.ok(!JSON.stringify(publicResult.result).includes(students[0].user.id));
});

test('topplistevalg: serveren krever boolsk verdi, riktig konto og CSRF, og tar ikke imot klient-XP', async (t) => {
	const f = await fixture(t),
		student = f.client();
	await student.create();
	for (const options of [{ visible: 'true' }, { accountId: randomUUID(), visible: true }])
		assert.notEqual(
			(await student.request('/api/me/leaderboard', { accountId: student.user.id, ...options }))
				.status,
			200
		);
	assert.equal(
		(
			await student.request(
				'/api/me/leaderboard',
				{ accountId: student.user.id, visible: true },
				{ csrf: false }
			)
		).status,
		403
	);
	const updated = await student.request('/api/me/leaderboard', {
		accountId: student.user.id,
		visible: true,
		xp: 999999,
		role: 'admin'
	});
	assert.equal(updated.result.user.leaderboardVisible, true);
	assert.equal(updated.result.summary.xp, 0);
	assert.equal(updated.result.user.role, 'student');
	assert.equal((await student.request('/api/leaderboard')).result.self.xp, 0);
});

test('backup inkluderer tildelte navn, administrator, kontostatus, deltakelse og administrasjonshistorikk', async (t) => {
	const f = await fixture(t),
		admin = await f.staff('admin'),
		student = f.client();
	await student.create();
	await student.visible(true);
	await admin.action(student.user, 'status', { disabled: true });
	const path = join(f.directory, 'backup.sqlite');
	backupDatabase(f.filename, path);
	const copy = openDatabase(path);
	try {
		const row = copy.prepare('SELECT * FROM users WHERE id=?').get(student.user.id);
		assert.equal(row.nickname, student.user.nickname);
		assert.equal(row.disabled_at, f.now());
		assert.equal(row.leaderboard_visible, 1);
		assert.equal(
			copy.prepare('SELECT role FROM user_roles WHERE user_id=?').get(admin.user.id).role,
			'admin'
		);
		assert.equal(copy.prepare('SELECT COUNT(*) AS n FROM management_actions').get().n, 1);
	} finally {
		copy.close();
	}
});

test('undervisning: læreropplegg og egne lærersider er adskilt fra elevkatalogen og kan utvides med drift', () => {
	assert.equal(teachingPlans.length, 5);
	assert.ok(!teachingPlans.some((plan) => plan.id === 'fra-kode-til-tjeneste'));
	assert.ok(!teachingGuides.some((guide) => guide.planId === 'fra-kode-til-tjeneste'));
	assert.ok(aktiviteter.every((item) => item.audience === 'student'));
	assert.ok(
		teachingPlans.every(
			(plan) => plan.audience === 'teacher' && !catalog.some((item) => item.id === plan.id)
		)
	);
	validateTeachingPlans();
	validateTeachingGuides();
	assert.throws(() => buildCatalog([{ ...aktiviteter[0], audience: 'teacher' }]), /lærerkatalogen/);
	assert.throws(
		() => validateTeachingPlans([{ ...teachingPlans[0], lessonIds: ['ukjent'] }]),
		/leksjon/
	);
	assert.throws(
		() => validateTeachingGuides(teachingPlans, teachingGuides.slice(1)),
		/lærerveiledning/
	);
	const resource = {
		id: 'drift-felles-nettverk',
		audience: 'teacher',
		tittel: 'Nettverk på tavla',
		beskrivelse: 'Felles gjennomgang',
		href: '/laerer/leksjoner/nettverk/',
		fag: 'drift',
		format: 'leksjon'
	};
	const resources = buildPresentationLessons(aktiviteter, [resource]);
	const plan = {
		...teachingPlans[0],
		id: 'drift-nettverk',
		subject: 'drift',
		lessonIds: [resource.id],
		selfWorkIds: []
	};
	validateTeachingPlans([plan], aktiviteter, resources);
	assert.throws(
		() => buildPresentationLessons(aktiviteter, [{ ...resource, id: aktiviteter[0].id }]),
		/lærerleksjon/
	);
	assert.ok(!aktiviteter.some((item) => item.id === resource.id));
});

test('undervisning: lærernotater krever serverrolle ved hvert kall og endrer ikke elevprogresjon', async (t) => {
	const f = await fixture(t),
		teacher = await f.staff(),
		admin = await f.staff('admin'),
		student = f.client();
	await student.create();
	assert.equal((await f.client().request('/api/teacher/teaching')).status, 401);
	assert.equal((await student.request('/api/teacher/teaching')).status, 403);
	assert.equal((await admin.request('/api/teacher/teaching')).status, 200);
	const response = await teacher.request('/api/teacher/teaching');
	assert.equal(response.status, 200);
	assert.equal(response.result.plans.length, 3);
	assert.ok(!response.result.plans.some((plan) => plan.id === 'fra-kode-til-tjeneste'));
	assert.equal(response.result.guides.length, 3);
	assert.ok(!response.result.guides.some((guide) => guide.planId === 'fra-kode-til-tjeneste'));
	assert.deepEqual(response.result.guides[0].preparation, teachingGuides[0].preparation);
	assert.ok(
		!JSON.stringify((await student.request('/api/me')).result).includes(
			teachingGuides[0].preparation[0]
		)
	);
	assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM progress').get().n, 0);
	assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM rewards').get().n, 0);
	assert.equal(
		(
			await student.request('/api/progress', {
				accountId: student.user.id,
				eventId: randomUUID(),
				version: 2,
				kind: 'start',
				activityId: teachingPlans[0].id,
				objectiveId: 'review'
			})
		).status,
		400
	);
	setTeacherRole(f.db, teacher.user.id, false);
	assert.equal((await teacher.request('/api/teacher/teaching')).status, 403);
});

test('presentasjonslenker holder elevforsøk og presentasjon adskilt', () => {
	const projected = presentationLink(
		'/backend/?modus=undervisning&apning=old&utenTid=1#kode',
		'meldingens-reise'
	);
	const url = new URL(projected, 'https://itlab.invalid');
	assert.equal(url.searchParams.get('visning'), 'presentasjon');
	assert.equal(url.searchParams.get('opplegg'), 'meldingens-reise');
	for (const name of ['modus', 'apning', 'utenTid'])
		assert.equal(url.searchParams.has(name), false);
	assert.equal(studentLessonLink(projected), '/backend/#kode');
	assert.equal(
		new URL(presentationLink(projected), 'https://itlab.invalid').searchParams.has('opplegg'),
		false
	);
});

test('toppliste: skjul er et varig aktivt valg, også etter ny innlogging og API-oppstart', async (t) => {
	const f = await fixture(t),
		student = f.client();
	await student.create();
	f.points(student, 25);
	assert.equal(student.user.leaderboardVisible, true);
	assert.equal(
		f.db
			.prepare('SELECT leaderboard_preference_set AS chosen FROM users WHERE id=?')
			.get(student.user.id).chosen,
		0
	);
	await student.visible(false);
	assert.equal(
		f.db
			.prepare('SELECT leaderboard_preference_set AS chosen FROM users WHERE id=?')
			.get(student.user.id).chosen,
		1
	);
	const second = f.client(),
		login = await second.request('/api/auth/key', { key: student.key.key });
	assert.equal(login.result.user.leaderboardVisible, false);
	assert.equal(login.result.summary.xp, 25);
	const reopened = openDatabase(f.filename);
	try {
		createApp({ db: reopened, config: readConfig(), limits: false });
		assert.equal(
			reopened
				.prepare('SELECT leaderboard_visible AS visible FROM users WHERE id=?')
				.get(student.user.id).visible,
			0
		);
	} finally {
		reopened.close();
	}
	assert.equal((await f.client().request('/api/leaderboard')).result.total, 0);
	await second.visible(true);
	assert.equal((await f.client().request('/api/leaderboard')).result.total, 1);
});

test('oppgradering fra tidligere dev bevarer skjulte profiler og aktiverer standarden for kontoer uten tidligere valg', async (t) => {
	const ids = [randomUUID(), randomUUID(), randomUUID()];
	const f = await fixture(t, (filename) => {
		const db = new DatabaseSync(filename);
		db.exec(
			'PRAGMA foreign_keys=ON; CREATE TABLE migrations(name TEXT PRIMARY KEY,hash TEXT NOT NULL,applied_at INTEGER NOT NULL)'
		);
		const directory = new URL('../server/migrations/', import.meta.url);
		for (const file of readdirSync(directory)
			.filter((item) => item.endsWith('.sql'))
			.sort()
			.slice(0, 6)) {
			const sql = readFileSync(new URL(file, directory), 'utf8');
			db.exec(sql);
			db.prepare('INSERT INTO migrations VALUES (?,?,?)').run(
				file,
				createHash('sha256').update(sql).digest('hex'),
				1
			);
		}
		ids.forEach((id, index) =>
			db
				.prepare(
					'INSERT INTO users(id,nickname,created_at,name_assigned,leaderboard_visible) VALUES (?,?,1,?,?)'
				)
				.run(id, `Lur Oter ${2000 + index}`, index === 2 ? 0 : 1, index === 1 ? 1 : 0)
		);
		db.close();
	});
	assert.equal(
		f.db.prepare('SELECT leaderboard_visible AS visible FROM users WHERE id=?').get(ids[0]).visible,
		0
	);
	assert.equal(
		f.db.prepare('SELECT leaderboard_visible AS visible FROM users WHERE id=?').get(ids[1]).visible,
		1
	);
	assert.equal(
		f.db.prepare('SELECT leaderboard_visible AS visible FROM users WHERE id=?').get(ids[2]).visible,
		1
	);
});
