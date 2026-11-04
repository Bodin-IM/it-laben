import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/database.js';
import { readConfig } from '../server/config.js';
import { createApp } from '../server/app.js';
import { readPartnerState, ADAPTER_VERSION } from '../src/lib/partnerContext.js';
import { partnerPageById } from '../src/lib/partnerPages.js';
import { pageWork } from '../server/lab-partner/page-context.js';

test('backend simulator: real HTTP, shared data, isolation, concurrency and restart', async (t) => {
	const directory = mkdtempSync(join(tmpdir(), 'it-lab-simulator-'));
	const filename = join(directory, 'lab.sqlite');
	const config = readConfig({});
	let db = openDatabase(filename);
	let server, base;
	async function start() {
		server = createApp({ db, config, limits: false }).listen(0, '127.0.0.1');
		await once(server, 'listening');
		base = `http://127.0.0.1:${server.address().port}/api`;
	}
	async function stop() {
		server.closeAllConnections();
		await new Promise((resolve) => server.close(resolve));
	}
	await start();
	t.after(async () => { await stop(); db.close(); rmSync(directory, { recursive: true, force: true }); });
	async function call(user, path, body, headers = {}, method = body === undefined ? 'GET' : 'POST') {
		const response = await fetch(base + path, {
			method,
			headers: {
				Cookie: user?.cookie ?? '', Origin: config.origin,
				'Content-Type': 'application/json', 'X-CSRF-Token': user?.csrf ?? '',
				'X-Lab-Account': user?.id ?? '', ...headers
			},
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		return { status: response.status, data: await response.json(), event: response.headers.get('X-Simulator-Event'), allow: response.headers.get('Allow'), cookie: response.headers.getSetCookie()[0]?.split(';')[0] };
	}
	async function account(role = 'student') {
		const created = await call(null, '/auth/create', {});
		assert.equal(created.status, 201);
		const user = { id: created.data.user.id, csrf: created.data.csrfToken, cookie: created.cookie };
		if (role !== 'student') db.prepare('INSERT INTO user_roles VALUES (?,?,?)').run(user.id, role, Date.now());
		return user;
	}
	const teacher = await account('teacher'), a = await account(), b = await account(), outsider = await account();
	const root = '/simulator';
	assert.equal((await call(null, `${root}/rooms`)).status, 401);
	assert.equal((await call(a, `${root}/rooms`, { title: 'Ikke lærer', role: 'utstyr' })).status, 403);
	const created = await call(teacher, `${root}/rooms`, { title: 'LAN', role: 'program' });
	assert.equal(created.status, 201);
	const room = created.data, roomPath = `${root}/rooms/${room.id}`;
	const equipment = (await call(a, `${root}/join`, { code: room.code, role: 'utstyr' })).data;
	const client = (await call(b, `${root}/join`, { code: room.code, role: 'kiosk' })).data;
	assert.equal(equipment.players.length, 2);
	assert.equal(client.players.length, 3);
	assert.equal((await call(a, `${root}/join`, { code: room.code, role: 'program' })).data.me, equipment.me, 'rejoining keeps identity and role');
	const publish = (user, data, revision = 0) => call(user, `${roomPath}/publish`, { getPath: '/utstyr', postPath: '/reservasjoner', data, revision });
	const endpoint = (target, path) => `${roomPath}/servers/${target}${path}`;
	const get = (user, target = equipment.me, path = '/utstyr', id = randomUUID()) => call(user, endpoint(target, path), undefined, { 'X-Simulator-Request': id });
	const reserve = (user, body, id = randomUUID(), headers = {}) => call(user, endpoint(equipment.me, '/reservasjoner'), body, { 'X-Simulator-Request': id, ...headers });

	await t.test('membership, account, publication ownership, CSRF and Origin are enforced', async () => {
		assert.equal((await call(outsider, roomPath)).status, 404);
		assert.equal((await publish(outsider, { pcLedige: 20 })).status, 404);
		assert.equal((await call(a, roomPath, undefined, { 'X-Lab-Account': b.id })).status, 409);
		assert.equal((await reserve(b, { antall: 1 }, randomUUID(), { 'X-CSRF-Token': 'wrong' })).status, 403);
		assert.equal((await reserve(b, { antall: 1 }, randomUUID(), { Origin: 'https://other.invalid' })).status, 403);
		assert.equal((await publish(b, { pcLedige: 20 })).status, 400, 'kiosk cannot publish reservation logic');
		const own = await call(b, `${roomPath}/publish`, { serverId: equipment.me, getPath: '/meny', data: { vare: 'Pizza' }, revision: 0 });
		assert.equal(own.status, 200);
		assert.equal(own.data.players.find((p) => p.id === equipment.me).getPath, null, 'supplied server ID cannot change another player');
		assert.equal(own.data.players.find((p) => p.id === client.me).getPath, '/meny');
		assert.equal((await publish(a, { pcLedige: 3, rom: 'A' })).status, 200);
		const snapshot = (await call(b, roomPath)).data;
		assert.equal(Object.hasOwn(snapshot.players.find((p) => p.id === equipment.me), 'data'), false, 'board does not expose the other editable data source');
		assert.equal((await call(b, `${roomPath}/pause`, { paused: true })).status, 403);
	});

	await t.test('actual GET/POST statuses and response fields drive frontend output', async () => {
		const response = await get(b);
		assert.equal(response.status, 200);
		assert.deepEqual(response.data, { pcLedige: 3, rom: 'A' });
		assert.ok(response.event);
		const shown = await call(b, `${roomPath}/display`, { eventId: response.event, field: 'pcLedige' });
		assert.equal(shown.status, 200);
		assert.equal(shown.data.players.find((p) => p.id === client.me).display.value, 3);
		assert.equal((await call(a, `${roomPath}/display`, { eventId: response.event, field: 'pcLedige' })).status, 400, 'another player cannot claim the receipt');
		assert.equal((await call(b, `${roomPath}/display`, {})).status, 400, 'missing receipt is a validation error');
		assert.equal((await get(b, equipment.me, '/finnes-ikke')).status, 404);
		const wrongMethod = await get(b, equipment.me, '/reservasjoner');
		assert.equal(wrongMethod.status, 405);
		assert.equal(wrongMethod.allow, 'POST');
		assert.equal((await reserve(b, { antall: -1 })).status, 400);
		assert.equal((await reserve(b, { antall: '1' })).status, 400);
		assert.equal((await reserve(b, { antall: 1, pcLedige: 99 })).status, 400);
		assert.equal((await reserve(b, { antall: 4 })).status, 409);
		assert.equal((await get(b)).data.pcLedige, 3, 'rejected requests do not change inventory');
	});

	let lastReceipt;
	await t.test('simultaneous reservations cannot oversell; retries keep the original receipt', async () => {
		const requestId = randomUUID();
		const [first, duplicate] = await Promise.all([reserve(b, { antall: 2 }, requestId), reserve(b, { antall: 2 }, requestId)]);
		assert.equal(first.status, 201);
		assert.equal(duplicate.status, 201);
		assert.equal(first.event, duplicate.event);
		assert.deepEqual(first.data, duplicate.data);
		assert.equal((await get(b)).data.pcLedige, 1);
		assert.equal((await reserve(b, { antall: 1 }, requestId)).status, 409, 'changed contents cannot reuse a receipt');
		const finalA = randomUUID(), finalB = randomUUID();
		const results = await Promise.all([reserve(b, { antall: 1 }, finalA), reserve(teacher, { antall: 1 }, finalB)]);
		assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
		assert.equal((await get(b)).data.pcLedige, 0);
		lastReceipt = { user: results[0].status === 201 ? b : teacher, id: results[0].status === 201 ? finalA : finalB, response: results.find((r) => r.status === 201) };
		assert.equal((await publish(a, { pcLedige: 3 }, 1)).status, 409, 'an old draft must not restore reserved stock');
		const snapshot = (await call(b, roomPath)).data;
		assert.equal(snapshot.players.find((p) => p.id === client.me).display.value, 3, 'display remains a labelled old snapshot until explicitly refreshed');
	});

	await t.test('another room cannot read or call a foreign virtual server; pause blocks writes', async () => {
		const second = (await call(teacher, `${root}/rooms`, { title: 'Annet rom', role: 'program' })).data;
		await call(outsider, `${root}/join`, { code: second.code, role: 'utstyr' });
		assert.equal((await get(outsider)).status, 404);
		const cross = await call(outsider, `${root}/rooms/${second.id}/servers/${equipment.me}/utstyr`, undefined, { 'X-Simulator-Request': randomUUID() });
		assert.equal(cross.status, 404);
		assert.equal(cross.data.pcLedige, undefined);
		assert.equal((await call(teacher, `${roomPath}/pause`, { paused: true })).status, 200);
		assert.equal((await reserve(b, { antall: 1 })).status, 409);
		assert.equal((await publish(a, { pcLedige: 10 }, 3)).status, 409);
		assert.equal((await call(b, roomPath)).status, 200, 'previous state remains readable');
		await call(teacher, `${roomPath}/pause`, { paused: false });
	});

	await t.test('rooms, endpoints, stock, frontend state and retry receipts survive restart without XP', async () => {
		await stop(); db.close(); db = openDatabase(filename); await start();
		const snapshot = (await call(b, roomPath)).data;
		assert.equal(snapshot.code, room.code);
		assert.equal(snapshot.players.length, 3);
		assert.equal(snapshot.players.find((p) => p.id === client.me).shown, true);
		assert.equal((await get(b)).data.pcLedige, 0);
		const retried = await reserve(lastReceipt.user, { antall: 1 }, lastReceipt.id);
		assert.equal(retried.status, 201);
		assert.equal(retried.event, lastReceipt.response.event);
		assert.deepEqual(retried.data, lastReceipt.response.data);
		assert.equal((await get(b)).data.pcLedige, 0);
		assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rewards').get().n, 0);
	});
});

test('simulator labpartner contract excludes room contents and validates its version', () => {
	const values = { role: 'utstyr', view: 'frontend', published: true, status: 405, stale: false };
	const state = { version: ADAPTER_VERSION, values };
	assert.deepEqual(readPartnerState('backend-simulator', state).values, values);
	for (const extra of [{ code: 'ABC123' }, { response: { pcLedige: 8 } }, { name: 'Elev' }, { role: 'administrator' }, { status: 999 }]) {
		assert.throws(() => readPartnerState('backend-simulator', { ...state, values: { ...values, ...extra } }));
	}
	assert.throws(() => readPartnerState('backend-simulator', { ...state, version: 999 }));
	const work = pageWork(partnerPageById('backend-simulator'), state);
	assert.ok(work.task.goal.includes('JSON'));
	assert.ok(work.limit.includes('ingen kode'));
});
