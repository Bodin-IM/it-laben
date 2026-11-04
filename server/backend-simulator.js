import { Router } from 'express';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { transaction } from './database.js';
import { requireTeacher, learningError } from './learning-access.js';
import { simulatorRole } from '../src/lib/backendSimulator.js';

const problem = (message, status = 400) => learningError('SIMULATOR_INPUT', message, status);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const validPath = (value) => typeof value === 'string' && /^\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*){0,2}$/.test(value) && value.length <= 80;
const uuid = (value) => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);

function roomFor(db, roomId, userId, writing = false) {
	const room = db.prepare('SELECT * FROM simulator_rooms WHERE id=?').get(roomId);
	const me = db.prepare('SELECT * FROM simulator_players WHERE room_id=? AND user_id=?').get(roomId, userId);
	if (!room || !me) throw problem('Du er ikke med i dette rommet. Bli med med romkoden.', 404);
	if (writing && room.paused) throw problem('Læreren har satt rommet på pause. Du kan fortsatt undersøke tidligere svar.', 409);
	return { room, me };
}

function addPlayer(db, roomId, userId, roleId, now) {
	const existing = db.prepare('SELECT id FROM simulator_players WHERE room_id=? AND user_id=?').get(roomId, userId);
	if (existing) return existing.id;
	const role = simulatorRole(roleId);
	if (!role) throw problem('Velg en av rollene.');
	if (db.prepare('SELECT COUNT(*) AS n FROM simulator_players WHERE room_id=?').get(roomId).n >= 24)
		throw problem('Rommet har plass til 24 deltakere. Be læreren åpne et nytt rom.', 409);
	const id = randomUUID();
	db.prepare('INSERT INTO simulator_players(id,room_id,user_id,role,data,last_seen) VALUES (?,?,?,?,?,?)')
		.run(id, roomId, userId, roleId, JSON.stringify(role.data), now);
	return id;
}

export function simulatorSnapshot(db, roomId, userId, now) {
	const { room, me } = roomFor(db, roomId, userId);
	db.prepare('UPDATE simulator_players SET last_seen=? WHERE id=?').run(now, me.id);
	const players = db.prepare('SELECT p.*, u.nickname FROM simulator_players p JOIN users u ON u.id=p.user_id WHERE room_id=? ORDER BY p.rowid').all(roomId);
	return {
		id: room.id, code: room.code, title: room.title, paused: !!room.paused,
		owner: room.owner_id === userId, me: me.id,
		players: players.map((p) => ({
			id: p.id, name: p.nickname, role: p.role, online: now - (p.id === me.id ? now : p.last_seen) < 12000,
			getPath: p.get_path, postPath: p.post_path, revision: p.revision,
			...(p.id === me.id ? { data: JSON.parse(p.data) } : {}),
			display: p.id === me.id && p.display ? JSON.parse(p.display) : null,
			published: !!p.get_path, fetched: !!p.fetched, shown: !!p.shown, posted: !!p.posted
		})),
		events: db.prepare('SELECT payload FROM simulator_events WHERE room_id=? ORDER BY rowid DESC LIMIT 30').all(roomId)
			.map((row) => JSON.parse(row.payload))
	};
}

export function publishSimulator(db, roomId, userId, input) {
	return transaction(db, () => {
		const { me } = roomFor(db, roomId, userId, true);
		if (input.revision !== me.revision) throw problem('Serverdataene er endret siden du åpnet oppsettet. Hent lagret oppsett før du publiserer igjen.', 409);
		if (!validPath(input.getPath)) throw problem('GET-adressen må starte med / og bruke små bokstaver, tall eller bindestrek. Eksempel: /utstyr.');
		if (!object(input.data) || Buffer.byteLength(JSON.stringify(input.data)) > 3000) throw problem('Data må være et JSON-objekt på høyst 3000 byte.');
		const postPath = input.postPath || null;
		if (postPath && (me.role !== 'utstyr' || !validPath(postPath))) throw problem('Utstyrsrollen kan opprette en POST-adresse for PC-reservasjoner.');
		if (postPath && (!Number.isInteger(input.data.pcLedige) || input.data.pcLedige < 0 || input.data.pcLedige > 100))
			throw problem('Reservasjoner trenger feltet pcLedige med et heltall mellom 0 og 100.');
		db.prepare('UPDATE simulator_players SET get_path=?,post_path=?,data=?,revision=revision+1 WHERE id=?')
			.run(input.getPath, postPath, JSON.stringify(input.data), me.id);
	});
}

/** Every simulated exchange is also a real HTTP exchange. Writes and event receipts commit together. */
export function exchangeSimulator(db, roomId, userId, targetId, method, path, body, requestId, now) {
	return transaction(db, () => {
		const { me } = roomFor(db, roomId, userId, true);
		if (!uuid(requestId)) throw problem('Forespørselen mangler en gyldig ID. Send på nytt fra frontendpanelet.');
		const fingerprint = createHash('sha256').update(JSON.stringify([targetId, method, path, body])).digest('hex');
		const previous = db.prepare('SELECT * FROM simulator_events WHERE actor_id=? AND request_id=?').get(me.id, requestId);
		if (previous) {
			if (previous.fingerprint !== fingerprint) throw problem('Samme forespørsels-ID kan ikke brukes til et annet innhold.', 409);
			return JSON.parse(previous.payload);
		}
		const target = db.prepare('SELECT * FROM simulator_players WHERE id=? AND room_id=?').get(targetId, roomId);
		let status = 200;
		let response;
		const failure = (code, message) => { status = code; response = { error: message }; };
		if (!target) failure(404, 'Serveren finnes ikke i dette rommet. Velg en server på brettet.');
		else if (method === 'GET' && path === target.get_path) response = JSON.parse(target.data);
		else if (method === 'POST' && path === target.post_path) {
			const data = JSON.parse(target.data);
			if (!object(body) || Object.keys(body).some((key) => key !== 'antall') || !Number.isInteger(body.antall) || body.antall < 1 || body.antall > 100)
				failure(400, 'Send et JSON-objekt med antall som et heltall fra 1 til 100. Ingen reservasjon ble lagret.');
			else if (!Number.isInteger(data.pcLedige) || data.pcLedige < body.antall)
				failure(409, `Det er ikke nok ledige PC-er. Hent ${target.get_path} igjen og prøv et lavere antall.`);
			else {
				data.pcLedige -= body.antall;
				db.prepare('UPDATE simulator_players SET data=?,revision=revision+1 WHERE id=?').run(JSON.stringify(data), target.id);
				status = 201;
				response = { reservasjon: randomUUID(), antall: body.antall, pcLedige: data.pcLedige };
			}
		} else if ([target.get_path, target.post_path].includes(path)) failure(405, 'Adressen finnes, men metoden passer ikke. Se GET eller POST på serverkortet.');
		else failure(404, 'Endepunktet finnes ikke. Kontroller adressen og at eieren har publisert det.');
		const event = { id: randomUUID(), method, path, from: me.id, to: targetId, status, at: now, body: method === 'POST' ? body : null, response };
		db.prepare('INSERT INTO simulator_events VALUES (?,?,?,?,?,?,?)').run(event.id, roomId, me.id, requestId, fingerprint, JSON.stringify(event), now);
		if (targetId !== me.id && status >= 200 && status < 300) {
			if (method === 'GET') db.prepare('UPDATE simulator_players SET fetched=1 WHERE id=?').run(me.id);
			if (method === 'POST') db.prepare('UPDATE simulator_players SET posted=1 WHERE id=?').run(me.id);
		}
		return event;
	});
}

export function displaySimulator(db, roomId, userId, eventId, field) {
	return transaction(db, () => {
		const { me } = roomFor(db, roomId, userId, true);
		if (!uuid(eventId)) throw problem('Send en GET-forespørsel og velg et felt fra svaret først.');
		const receipt = db.prepare('SELECT payload FROM simulator_events WHERE id=? AND room_id=? AND actor_id=?').get(eventId, roomId, me.id);
		if (!receipt) throw problem('Send en GET-forespørsel først.');
		const event = JSON.parse(receipt.payload);
		if (event.status !== 200 || event.method !== 'GET' || event.to === me.id) throw problem('Hent et gyldig svar fra en annen elev for å fullføre dette oppdraget.');
		if (typeof field !== 'string' || !Object.hasOwn(event.response, field) || ['__proto__', 'constructor', 'prototype'].includes(field)) throw problem('Velg et felt som finnes i svaret.');
		const value = event.response[field];
		if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) throw problem('Velg et enkelt felt med tekst, tall eller sann/usann.');
		if (typeof value === 'string' && value.length > 300) throw problem('Velg et kort tekstfelt på høyst 300 tegn.');
		const display = { source: event.to, field, value, at: event.at };
		db.prepare('UPDATE simulator_players SET shown=1,display=? WHERE id=?').run(JSON.stringify(display), me.id);
		return display;
	});
}

export function backendSimulatorRouter({ db, authenticated, clock }) {
	const router = Router();
	router.use(authenticated);
	router.use((req, _res, next) => {
		if (req.get('X-Lab-Account') !== req.labUser.id) throw problem('Påloggingen er endret. Oppdater siden før du fortsetter.', 409);
		next();
	});
	router.get('/rooms', (req, res) => {
		res.json({ rooms: db.prepare('SELECT r.id,r.code,r.title,r.paused FROM simulator_rooms r JOIN simulator_players p ON p.room_id=r.id WHERE p.user_id=? ORDER BY r.created_at DESC LIMIT 20').all(req.labUser.id) });
	});
	router.post('/rooms', (req, res) => {
		requireTeacher(db, req.labUser.id);
		const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
		if (!title || title.length > 50) throw problem('Gi rommet et navn på 1–50 tegn.');
		const id = transaction(db, () => {
			if (db.prepare('SELECT COUNT(*) AS n FROM simulator_rooms WHERE owner_id=?').get(req.labUser.id).n >= 30) throw problem('Du har 30 rom. Bruk et eksisterende rom.', 409);
			const id = randomUUID();
			let code;
			do { code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase(); } while (db.prepare('SELECT 1 FROM simulator_rooms WHERE code=?').get(code));
			db.prepare('INSERT INTO simulator_rooms(id,code,owner_id,title,created_at) VALUES (?,?,?,?,?)').run(id, code, req.labUser.id, title, clock());
			addPlayer(db, id, req.labUser.id, req.body.role, clock());
			return id;
		});
		res.status(201).json(simulatorSnapshot(db, id, req.labUser.id, clock()));
	});
	router.post('/join', (req, res) => {
		const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
		const room = db.prepare('SELECT * FROM simulator_rooms WHERE code=?').get(code);
		if (!room) throw problem('Fant ikke rommet. Kontroller de seks tegnene i romkoden.', 404);
		if (room.paused) throw problem('Rommet er satt på pause. Be læreren åpne det.', 409);
		transaction(db, () => addPlayer(db, room.id, req.labUser.id, req.body.role, clock()));
		res.json(simulatorSnapshot(db, room.id, req.labUser.id, clock()));
	});
	router.get('/rooms/:roomId', (req, res) => res.json(simulatorSnapshot(db, req.params.roomId, req.labUser.id, clock())));
	router.post('/rooms/:roomId/publish', (req, res) => {
		publishSimulator(db, req.params.roomId, req.labUser.id, req.body);
		res.json(simulatorSnapshot(db, req.params.roomId, req.labUser.id, clock()));
	});
	router.post('/rooms/:roomId/display', (req, res) => {
		displaySimulator(db, req.params.roomId, req.labUser.id, req.body.eventId, req.body.field);
		res.json(simulatorSnapshot(db, req.params.roomId, req.labUser.id, clock()));
	});
	router.post('/rooms/:roomId/pause', (req, res) => {
		requireTeacher(db, req.labUser.id);
		const { room } = roomFor(db, req.params.roomId, req.labUser.id);
		if (room.owner_id !== req.labUser.id) throw problem('Bare læreren som opprettet rommet kan sette det på pause.', 403);
		if (typeof req.body.paused !== 'boolean') throw problem('Velg pause eller fortsett.');
		db.prepare('UPDATE simulator_rooms SET paused=? WHERE id=?').run(Number(req.body.paused), room.id);
		res.json(simulatorSnapshot(db, room.id, req.labUser.id, clock()));
	});
	router.all('/rooms/:roomId/servers/:serverId/{*endpoint}', (req, res) => {
		const path = '/' + (req.params.endpoint ?? []).join('/');
		const event = exchangeSimulator(db, req.params.roomId, req.labUser.id, req.params.serverId, req.method, path, req.method === 'POST' ? req.body : null, req.get('X-Simulator-Request'), clock());
		res.set('X-Simulator-Event', event.id);
		if (event.status === 405) {
			const target = db.prepare('SELECT get_path,post_path FROM simulator_players WHERE id=? AND room_id=?').get(req.params.serverId, req.params.roomId);
			res.set('Allow', [target?.get_path === path ? 'GET' : '', target?.post_path === path ? 'POST' : ''].filter(Boolean).join(', '));
		}
		res.status(event.status).json(event.response);
	});
	return router;
}
