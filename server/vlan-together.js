import { Router } from 'express';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { transaction } from './database.js';
import { requireTeacher, learningError } from './learning-access.js';
import { defaultDeviceConfig, devicePorts, portLink, validateTogetherConfig, pingTogether } from '../src/lib/vlanTogether.js';

const problem = (message, status = 400) => learningError('NETWORK_ROOM', message, status);
const uuid = (id) => typeof id === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id);
function name(value) {
	if (typeof value !== 'string' || !value.trim() || value.trim().length > 40) throw problem('Bruk et navn på 1–40 tegn.');
	return value.trim();
}
function roomFor(db, roomId, userId) {
	const room = db.prepare('SELECT * FROM vlan_rooms WHERE id=?').get(roomId);
	const me = db.prepare('SELECT * FROM vlan_members WHERE room_id=? AND user_id=?').get(roomId, userId);
	if (!room || !me) throw problem('Du er ikke med i dette rommet. Velg rommet i romlisten først.', 404);
	const members = db.prepare('SELECT m.id,m.last_seen,m.area_name,m.notes,m.document_revision,u.nickname FROM vlan_members m JOIN users u ON u.id=m.user_id WHERE room_id=? ORDER BY m.rowid').all(roomId);
	const state = JSON.parse(room.state);
	// Account deletion cascades membership; remove its graph before any read or write.
	const alive = new Set(members.map((m) => m.id));
	const before = state.devices.length;
	state.devices = state.devices.filter((d) => alive.has(d.owner));
	if (state.devices.length !== before) {
		const ids = new Set(state.devices.map((d) => d.id));
		state.links = state.links.filter((l) => ids.has(l.a) && ids.has(l.b));
		state.requests = state.requests.filter((r) => ids.has(r.source) && ids.has(r.target));
		save(db, room, state);
	}
	return { room, me, members, state };
}
function save(db, room, state) {
	room.revision++;
	db.prepare('UPDATE vlan_rooms SET state=?,revision=?,paused=? WHERE id=?').run(JSON.stringify(state), room.revision, room.paused, room.id);
}
function addMember(db, room, userId, now) {
	const exists = db.prepare('SELECT id FROM vlan_members WHERE room_id=? AND user_id=?').get(room.id, userId);
	if (exists) return;
	const count = db.prepare('SELECT COUNT(*) AS n FROM vlan_members WHERE room_id=?').get(room.id).n;
	if (count >= 24) throw problem('Rommet har 24 deltakere. Be læreren opprette et nytt rom.', 409);
	const id = randomUUID(), sw = randomUUID(), pc = randomUUID();
	db.prepare('INSERT INTO vlan_members(id,room_id,user_id,last_seen) VALUES (?,?,?,?)').run(id, room.id, userId, now);
	const state = JSON.parse(room.state);
	// Find an unused starting address even if an earlier member deleted their account.
	const used = new Set(state.devices.flatMap((d) => d.kind === 'pc' ? [d.config.ip] : d.kind === 'router' ? d.config.interfaces.map((i) => i.ip) : []));
	let host = 11; while (used.has(`10.10.10.${host}`)) host++;
	state.devices.push(
		{ id: sw, owner: id, kind: 'switch', name: 'S1', revision: 0, config: defaultDeviceConfig('switch') },
		{ id: pc, owner: id, kind: 'pc', name: 'PC1', revision: 0, config: { ip: `10.10.10.${host}`, gateway: '' } }
	);
	state.links.push({ id: randomUUID(), a: sw, aPort: 'eth0', b: pc, bPort: 'eth0' });
	save(db, room, state);
}
function snapshot(db, roomId, userId, now) {
	const { room, me, members, state } = roomFor(db, roomId, userId);
	db.prepare('UPDATE vlan_members SET last_seen=? WHERE id=?').run(now, me.id);
	db.prepare('DELETE FROM vlan_pings WHERE room_id=? AND expires_at<=?').run(roomId, now);
	return {
		id: room.id, title: room.title, owner: room.owner_id === userId,
		me: me.id, paused: !!room.paused, revision: room.revision,
		members: members.map((m) => ({ id: m.id, name: m.nickname, areaName: m.area_name, notes: m.notes, documentRevision: m.document_revision, online: m.id === me.id || now - m.last_seen < 15000 })),
		devices: state.devices, links: state.links,
		serverNow: now,
		pings: db.prepare('SELECT payload FROM vlan_pings WHERE room_id=? AND revision=? ORDER BY created_at DESC,id DESC LIMIT 64').all(roomId, room.revision).map((p) => JSON.parse(p.payload)),
		requests: state.requests.filter((r) => r.expires > now && (r.from === me.id || r.to === me.id))
	};
}
function device(state, id) {
	const d = state.devices.find((d) => d.id === id);
	if (!d) throw problem('Enheten finnes ikke lenger. Hent brettet på nytt.', 409);
	return d;
}
function own(state, id, member) {
	const d = device(state, id);
	if (d.owner !== member) throw problem('Du kan bare endre egne enheter.', 403);
	return d;
}
function free(state, id, port) {
	if (!devicePorts(device(state, id).kind).includes(port)) throw problem('Velg en gyldig port.');
	if (portLink(state, id, port)) throw problem('Porten er allerede i bruk. Velg en ledig port.', 409);
}
function connect(state, a, aPort, b, bPort) {
	if (a === b) throw problem('Velg to ulike enheter.');
	free(state, a, aPort); free(state, b, bPort);
	// No STP model: prevent physical switch-only loops rather than claim they work.
	if (device(state, a).kind === 'switch' && device(state, b).kind === 'switch') {
		const reached = new Set([a]), queue = [a];
		while (queue.length) {
			const id = queue.shift();
			for (const l of state.links.filter((l) => l.a === id || l.b === id)) {
				const next = l.a === id ? l.b : l.a;
				if (next === b) throw problem('Kabelen ville lage en switch-løkke. Denne første versjonen har ikke STP. Fjern en annen switchforbindelse først.', 409);
				if (!reached.has(next) && device(state, next).kind === 'switch') { reached.add(next); queue.push(next); }
			}
		}
	}
	state.links.push({ id: randomUUID(), a, aPort, b, bPort });
	state.requests = state.requests.filter((r) => !(r.source === a && r.port === aPort || r.source === b && r.port === bPort));
}
function command(db, roomId, userId, input, now) {
	const { room, me, state } = roomFor(db, roomId, userId);
	if (!uuid(input.requestId)) throw problem('Handlingen mangler en gyldig forespørsels-ID.');
	const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
	const previous = db.prepare('SELECT fingerprint FROM vlan_commands WHERE room_id=? AND member_id=? AND request_id=?').get(roomId, me.id, input.requestId);
	if (previous) {
		if (previous.fingerprint !== fingerprint) throw problem('Forespørsels-ID-en er allerede brukt til noe annet.', 409);
		return;
	}
	if (room.paused && input.action !== 'pause') throw problem('Læreren har satt rommet på pause. Oppsettet kan fortsatt leses.', 409);
	state.requests = state.requests.filter((r) => r.expires > now);
	switch (input.action) {
		case 'document': {
			if (input.revision !== me.document_revision) throw problem('Dokumentasjonen er endret i en annen fane. Kopier det du vil beholde, og hent lagret tekst før du prøver igjen.', 409);
			if (typeof input.areaName !== 'string' || input.areaName.trim().length > 40 || /[\r\n\t]/.test(input.areaName)) throw problem('Områdenavnet kan ha opptil 40 tegn på én linje.');
			if (typeof input.notes !== 'string' || input.notes.length > 2000 || Buffer.byteLength(input.notes, 'utf8') > 6000) throw problem('Bruk opptil 2000 tegn i dokumentasjonen. Kort ned teksten hvis den inneholder mange spesialtegn.');
			// The account's own membership is authoritative; no client owner/member ID is used.
			db.prepare('UPDATE vlan_members SET area_name=?,notes=?,document_revision=document_revision+1 WHERE id=?').run(input.areaName.trim(), input.notes, me.id);
			break;
		}
		case 'add': {
			if (!['pc', 'switch', 'router'].includes(input.kind)) throw problem('Velg PC, switch eller ruter.');
			if (state.devices.filter((d) => d.owner === me.id).length >= 8) throw problem('Ditt område har plass til åtte enheter.', 409);
			const prefix = { pc: 'PC', switch: 'S', router: 'R' }[input.kind];
			let n = 1; while (state.devices.some((d) => d.owner === me.id && d.name === `${prefix}${n}`)) n++;
			state.devices.push({ id: randomUUID(), owner: me.id, kind: input.kind, name: `${prefix}${n}`, revision: 0, config: defaultDeviceConfig(input.kind) }); break;
		}
		case 'configure': {
			const d = own(state, input.deviceId, me.id);
			if (input.revision !== d.revision) throw problem('Enheten er endret i en annen fane. Hent lagret oppsett før du lagrer.', 409);
			try { d.config = validateTogetherConfig(d.kind, input.config); } catch (e) { throw problem(e.message); }
			d.name = name(input.name); d.revision++; break;
		}
		case 'remove': {
			const d = own(state, input.deviceId, me.id);
			if (state.links.some((l) => l.a === d.id || l.b === d.id)) throw problem('Koble fra kablene før du fjerner enheten.', 409);
			state.devices = state.devices.filter((item) => item.id !== d.id);
			state.requests = state.requests.filter((r) => r.source !== d.id && r.target !== d.id); break;
		}
		case 'connect':
			own(state, input.source, me.id);
			if (own(state, input.target, me.id).kind === 'pc') throw problem('Avslutt kabelen på en switch eller ruter. En PC kobles ved å starte fra PC-en.');
			connect(state, input.source, input.port, input.target, input.targetPort); break;
		case 'request': {
			const source = own(state, input.source, me.id), target = device(state, input.target);
			if (source.kind === 'pc' || target.kind === 'pc' || source.owner === target.owner) throw problem('Be om forbindelse mellom din switch/ruter og en annen deltakers switch/ruter.');
			free(state, source.id, input.port);
			if (!devicePorts(target.kind).some((p) => !portLink(state, target.id, p))) throw problem('Den andre enheten har ingen ledige porter.', 409);
			if (state.requests.some((r) => r.source === source.id && r.port === input.port)) throw problem('Du har allerede en forespørsel fra denne porten. Avbryt den først.', 409);
			if (state.requests.filter((r) => r.from === me.id).length >= 4 || state.requests.length >= 48) throw problem('For mange ventende forespørsler. Avklar eller avbryt dem først.', 409);
			state.requests.push({ id: randomUUID(), from: me.id, to: target.owner, source: source.id, port: input.port, target: target.id, expires: now + 5 * 60000 }); break;
		}
		case 'respond': {
			const r = state.requests.find((r) => r.id === input.id);
			if (!r) throw problem('Forespørselen er utløpt eller allerede behandlet.', 409);
			if (r.to !== me.id && !(r.from === me.id && input.accept === false)) throw problem('Bare mottakeren kan godta forbindelsen.', 403);
			if (typeof input.accept !== 'boolean') throw problem('Velg godta eller avslå.');
			if (input.accept) connect(state, r.source, r.port, r.target, input.targetPort);
			state.requests = state.requests.filter((item) => item.id !== r.id); break;
		}
		case 'disconnect': {
			const l = state.links.find((l) => l.id === input.id);
			if (!l) throw problem('Kabelen er allerede fjernet.', 409);
			if (![device(state, l.a).owner, device(state, l.b).owner].includes(me.id)) throw problem('Bare en av kabelens eiere kan koble den fra.', 403);
			state.links = state.links.filter((item) => item.id !== l.id); break;
		}
		case 'pause':
			requireTeacher(db, userId);
			if (room.owner_id !== userId) throw problem('Bare rommets lærer kan styre pausen.', 403);
			if (typeof input.paused !== 'boolean') throw problem('Velg pause eller fortsett.');
			room.paused = Number(input.paused); break;
		default: throw problem('Ukjent handling.');
	}
	// Documentation does not change the network and must not invalidate a ping result.
	if (input.action !== 'document') save(db, room, state);
	db.prepare('INSERT INTO vlan_commands VALUES (?,?,?,?)').run(roomId, me.id, input.requestId, fingerprint);
}

export function vlanTogetherRouter({ db, authenticated, clock }) {
	const router = Router(); router.use(authenticated);
	router.use((req, _res, next) => { if (req.get('X-Lab-Account') !== req.labUser.id) throw problem('Påloggingen er endret. Oppdater siden.', 409); next(); });
	// Discovery exposes room metadata to signed-in users, never the board or member list.
	router.get('/rooms', (req, res) => res.json({
		rooms: db.prepare(`
			SELECT r.id,r.title,r.paused,u.nickname AS teacherName,
				(SELECT COUNT(*) FROM vlan_members m WHERE m.room_id=r.id) AS participants,
				EXISTS(SELECT 1 FROM vlan_members m WHERE m.room_id=r.id AND m.user_id=?) AS joined
			FROM vlan_rooms r JOIN users u ON u.id=r.owner_id
			ORDER BY joined DESC,r.created_at DESC,r.id LIMIT 100
		`).all(req.labUser.id).map((room) => ({ ...room, paused: !!room.paused, joined: !!room.joined }))
	}));
	router.post('/rooms', (req, res) => {
		requireTeacher(db, req.labUser.id); const title = name(req.body.title);
		const roomId = transaction(db, () => {
			if (db.prepare('SELECT COUNT(*) AS n FROM vlan_rooms WHERE owner_id=?').get(req.labUser.id).n >= 30) throw problem('Du har 30 rom. Bruk et eksisterende rom.', 409);
			// Keep the existing database column compatible; codes are no longer shown or accepted for joining.
			let code; do { code = randomBytes(3).toString('hex').toUpperCase(); } while (db.prepare('SELECT 1 FROM vlan_rooms WHERE code=?').get(code));
			const id = randomUUID();
			db.prepare('INSERT INTO vlan_rooms(id,code,owner_id,title,state,created_at) VALUES (?,?,?,?,?,?)').run(id, code, req.labUser.id, title, JSON.stringify({ devices: [], links: [], requests: [] }), clock());
			addMember(db, db.prepare('SELECT * FROM vlan_rooms WHERE id=?').get(id), req.labUser.id, clock()); return id;
		});
		res.status(201).json(transaction(db, () => snapshot(db, roomId, req.labUser.id, clock())));
	});
	router.post('/join', (req, res) => {
		const id = transaction(db, () => {
			if (!uuid(req.body.roomId)) throw problem('Velg et rom fra romlisten.');
			const room = db.prepare('SELECT * FROM vlan_rooms WHERE id=?').get(req.body.roomId);
			if (!room) throw problem('Rommet finnes ikke lenger. Oppdater romlisten.', 404);
			const joined = db.prepare('SELECT 1 FROM vlan_members WHERE room_id=? AND user_id=?').get(room.id, req.labUser.id);
			if (room.paused && !joined) throw problem('Rommet er på pause. Be læreren åpne det.', 409);
			addMember(db, room, req.labUser.id, clock()); return room.id;
		});
		res.json(transaction(db, () => snapshot(db, id, req.labUser.id, clock())));
	});
	router.get('/rooms/:roomId', (req, res) => res.json(transaction(db, () => snapshot(db, req.params.roomId, req.labUser.id, clock()))));
	router.post('/rooms/:roomId/commands', (req, res) => res.json(transaction(db, () => {
		command(db, req.params.roomId, req.labUser.id, req.body, clock());
		return snapshot(db, req.params.roomId, req.labUser.id, clock());
	})));
	router.post('/rooms/:roomId/ping', (req, res) => res.json(transaction(db, () => {
		const { room, me, state } = roomFor(db, req.params.roomId, req.labUser.id);
		const from = own(state, req.body.from, me.id), to = device(state, req.body.to), now = clock();
		if (from.kind !== 'pc' || to.kind !== 'pc' || from.id === to.id) throw problem('Velg din avsender-PC og en annen PC som mottaker.');
		// Old clients may still send a private probe. The board tool always sends an ID.
		if (req.body.requestId === undefined) return { ...pingTogether(state, from.id, to.id), revision: room.revision };
		if (!uuid(req.body.requestId)) throw problem('Ping mangler en gyldig forespørsels-ID.');
		db.prepare('DELETE FROM vlan_pings WHERE room_id=? AND expires_at<=?').run(room.id, now);
		const previous = db.prepare('SELECT payload FROM vlan_pings WHERE room_id=? AND member_id=? AND request_id=?').get(room.id, me.id, req.body.requestId);
		if (previous) {
			const ping = JSON.parse(previous.payload);
			if (ping.from !== from.id || ping.to !== to.id) throw problem('Denne ping-ID-en er allerede brukt til et annet mål.', 409);
			return { ...ping, serverNow: now };
		}
		if (room.paused) throw problem('Læreren har satt rommet på pause.', 409);
		const active = db.prepare('SELECT payload FROM vlan_pings WHERE room_id=? AND member_id=? AND revision=? ORDER BY created_at DESC LIMIT 1').get(room.id, me.id, room.revision);
		if (active) {
			const ping = JSON.parse(active.payload);
			if (now < ping.startsAt + ping.duration) throw problem('Vent til din forrige ping er ferdig før du sender en ny.', 429);
		}
		const result = pingTogether(state, from.id, to.id);
		const startsAt = now + 2800, duration = Math.max(4000, Math.min(18000, result.steps.length * 650));
		const ping = { ...result, id: randomUUID(), by: me.id, from: from.id, to: to.id, revision: room.revision, startsAt, duration, expiresAt: startsAt + duration + 8000 };
		db.prepare('INSERT INTO vlan_pings VALUES (?,?,?,?,?,?,?,?)').run(ping.id, room.id, me.id, req.body.requestId, now, ping.expiresAt, room.revision, JSON.stringify(ping));
		db.prepare('DELETE FROM vlan_pings WHERE room_id=? AND id NOT IN (SELECT id FROM vlan_pings WHERE room_id=? ORDER BY created_at DESC,id DESC LIMIT 64)').run(room.id, room.id);
		return { ...ping, serverNow: now };
	})));
	return router;
}
