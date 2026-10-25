import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { createServer } from 'node:https';
import {
	mkdtempSync,
	mkdirSync,
	writeFileSync,
	readFileSync,
	copyFileSync,
	symlinkSync,
	realpathSync,
	readdirSync,
	statSync,
	existsSync,
	rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const supported = process.platform === 'linux';
const execute = promisify(execFile);
const deployFile = new URL('../server/deploy/update-main.sh', import.meta.url).pathname;
const installFile = new URL('../server/deploy/install-main.sh', import.meta.url).pathname;
const certificateFile = new URL('../server/deploy/create-local-certificate.sh', import.meta.url)
	.pathname;
const backupFile = new URL('../server/deploy/backup-daily.sh', import.meta.url).pathname;

function shell(source, args = [], env = {}) {
	return spawnSync('bash', ['-c', source, '--', ...args], {
		encoding: 'utf8',
		env: { ...process.env, ...env },
		timeout: 30_000
	});
}

function temporary(t) {
	const directory = mkdtempSync(join(tmpdir(), 'itlab-deploy-'));
	t.after(() => rmSync(directory, { recursive: true, force: true }));
	return directory;
}

function git(directory, ...args) {
	const result = spawnSync('git', ['-C', directory, ...args], { encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr);
	return result.stdout.trim();
}

function fixture(t, { backend = true, invalidMigration = false } = {}) {
	const dir = temporary(t);
	for (const name of ['seed', 'base/releases/old', 'web/releases/old', 'data', 'backups', 'cache'])
		mkdirSync(join(dir, name), { recursive: true });
	const seed = join(dir, 'seed');
	git(seed, 'init', '--initial-branch=main');
	writeFileSync(join(seed, 'package.json'), '{"type":"module"}');
	if (backend) {
		mkdirSync(join(seed, 'server/migrations'), { recursive: true });
		writeFileSync(join(seed, 'server/index.js'), '// API marker for deployment fixture\n');
		for (const file of ['database.js', 'backup.js'])
			copyFileSync(new URL(`../server/${file}`, import.meta.url), join(seed, 'server', file));
		writeFileSync(
			join(seed, 'server/migrations/001_deployment.sql'),
			invalidMigration
				? 'THIS IS NOT VALID SQL;'
				: 'ALTER TABLE work ADD COLUMN checked INTEGER DEFAULT 0;'
		);
		writeFileSync(
			join(seed, 'server/migrate-test.js'),
			"import {openDatabase} from './database.js'; openDatabase(process.env.ITLAB_DB_PATH).close();"
		);
	}
	git(seed, 'add', '.');
	git(seed, '-c', 'user.name=QA', '-c', 'user.email=qa@example.test', 'commit', '-m', 'Fixture');
	const commit = git(seed, 'rev-parse', 'HEAD');
	git(dir, 'clone', '--bare', seed, 'origin.git');
	git(dir, 'clone', join(dir, 'origin.git'), 'base/repo');
	writeFileSync(join(dir, 'web/releases/old/index.html'), 'old frontend');
	writeFileSync(join(dir, 'web/releases/old/.commit'), 'old-commit\n');
	writeFileSync(join(dir, 'base/releases/old/.commit'), 'old-commit\n');
	symlinkSync(join(dir, 'web/releases/old'), join(dir, 'web/current'));
	symlinkSync(join(dir, 'base/releases/old'), join(dir, 'base/api-current'));
	writeFileSync(join(dir, 'api-active'), '1');
	const db = new DatabaseSync(join(dir, 'data/it-laben.sqlite'));
	db.exec("CREATE TABLE work(answer TEXT); INSERT INTO work VALUES ('behold elevens svar');");
	db.close();
	const npm = join(dir, 'fake-npm');
	writeFileSync(
		npm,
		`#!/usr/bin/env bash
set -eu
printf 'npm %s\\n' "$*" >> "$QA_DIR/events"
if [[ "$*" == "run build" ]]; then
  [[ "$QA_FAIL_BUILD" != 1 ]] || exit 3
  mkdir -p build/min-lab
  printf 'new frontend' > build/index.html
  printf 'min lab' > build/min-lab/index.html
fi
`,
		{ mode: 0o755 }
	);
	return { dir, commit, npm };
}

function deploy(f, env = {}) {
	// Real git archive, files, SQLite migration and backup. Mock only service/root/network operations.
	return shell(
		`set -Eeuo pipefail
source "$1"
DEPLOY_BASE="$QA_DIR/base"; DEPLOY_WEB="$QA_DIR/web"; DEPLOY_DATA="$QA_DIR/data"
DEPLOY_BACKUPS="$QA_DIR/backups"; DEPLOY_CACHE="$QA_DIR/cache"; DEPLOY_USER=qa
DEPLOY_NODE="$2"; DEPLOY_NPM="$QA_DIR/fake-npm"
DEPLOY_CA=''; DEPLOY_HOST=im.local; DEPLOY_HTTPS_PORT=8443; DEPLOY_ORIGIN=https://im.local:8443
deploy_as_user() { "$@"; }
chown() { :; }
install() {
  local args=()
  while [[ $# -gt 0 ]]; do
    case "$1" in -o|-g) shift 2 ;; *) args+=("$1"); shift ;; esac
  done
  command install "\${args[@]}"
}
systemctl() {
  printf 'systemctl %s\\n' "$*" >> "$QA_DIR/events"
  case "$1" in
    is-active) [[ -e "$QA_DIR/api-active" ]] ;;
    stop) rm -f "$QA_DIR/api-active" ;;
    start)
      if [[ -f "$DEPLOY_BASE/api-current/server/migrate-test.js" ]]; then
        ITLAB_DB_PATH="$DEPLOY_DATA/it-laben.sqlite" "$DEPLOY_NODE" "$DEPLOY_BASE/api-current/server/migrate-test.js" || return 1
      fi
      touch "$QA_DIR/api-active" ;;
    enable) return 0 ;;
    *) return 2 ;;
  esac
}
deploy_api_health() { [[ -f "$QA_DIR/api-active" ]]; }
deploy_https_health() { [[ "$QA_FAIL_HTTPS" != 1 ]]; }
trap 'deploy_failed "$?"' ERR
deploy_update
`,
		[deployFile, process.execPath],
		{ QA_DIR: f.dir, QA_FAIL_BUILD: '0', QA_FAIL_HTTPS: '0', ...env }
	);
}

test('deployskriptene har gyldig Bash-syntaks', { skip: !supported }, () => {
	for (const file of [deployFile, installFile, certificateFile, backupFile]) {
		const result = spawnSync('bash', ['-n', file], { encoding: 'utf8' });
		assert.equal(result.status, 0, result.stderr);
	}
});

test(
	'deploy godtar HTTPS med IP/port, og avviser HTTP og konfigurasjonsinnsprøyting',
	{ skip: !supported },
	() => {
		const source = 'source "$1"; DEPLOY_NODE="$2"; setup_origin "$3"';
		const good = shell(source, [installFile, process.execPath, 'https://192.168.10.20:8443']);
		assert.equal(good.status, 0, good.stderr);
		assert.equal(good.stdout, 'https://192.168.10.20:8443\n192.168.10.20\n8443\n-checkip\n');
		for (const bad of [
			'http://im.local',
			'https://im.local/api/',
			'https://im.local/?q=x',
			'https://user@im.local',
			'https://im.local;include.example'
		])
			assert.notEqual(shell(source, [installFile, process.execPath, bad]).status, 0, bad);
	}
);

test(
	'før merge av backend til main beholdes aktiv nettside og API urørt',
	{ skip: !supported },
	(t) => {
		const f = fixture(t, { backend: false });
		const result = deploy(f);
		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout, /Venter på backend i main/);
		assert.equal(readFileSync(join(f.dir, 'web/current/index.html'), 'utf8'), 'old frontend');
		assert.ok(existsSync(join(f.dir, 'api-active')));
		assert.ok(!existsSync(join(f.dir, 'events')));
	}
);

test(
	'byggefeil stopper før tjeneste, backup eller publiserte lenker endres',
	{ skip: !supported },
	(t) => {
		const f = fixture(t);
		const result = deploy(f, { QA_FAIL_BUILD: '1' });
		assert.notEqual(result.status, 0);
		assert.equal(readFileSync(join(f.dir, 'web/current/index.html'), 'utf8'), 'old frontend');
		assert.ok(existsSync(join(f.dir, 'api-active')));
		assert.equal(readdirSync(join(f.dir, 'backups')).length, 0);
		assert.doesNotMatch(readFileSync(join(f.dir, 'events'), 'utf8'), /systemctl/);
	}
);

test(
	'main publiseres med konsistent backup før migrasjon, og samme commit bygges ikke igjen',
	{ skip: !supported },
	(t) => {
		const f = fixture(t);
		const result = deploy(f);
		assert.equal(result.status, 0, result.stderr + result.stdout);
		assert.equal(readFileSync(join(f.dir, 'web/current/.commit'), 'utf8').trim(), f.commit);
		assert.equal(readFileSync(join(f.dir, 'base/api-current/.commit'), 'utf8').trim(), f.commit);
		assert.equal(readFileSync(join(f.dir, 'web/current/index.html'), 'utf8'), 'new frontend');
		assert.ok(!existsSync(join(f.dir, 'web/current/server')));
		const live = new DatabaseSync(join(f.dir, 'data/it-laben.sqlite'));
		assert.equal(
			live.prepare('SELECT answer, checked FROM work').get().answer,
			'behold elevens svar'
		);
		live.close();
		const backups = readdirSync(join(f.dir, 'backups'));
		assert.equal(backups.length, 1);
		const backup = new DatabaseSync(join(f.dir, 'backups', backups[0]));
		assert.equal(backup.prepare('SELECT answer FROM work').get().answer, 'behold elevens svar');
		assert.equal(backup.prepare('PRAGMA table_info(work)').all().length, 1);
		backup.close();
		const events = readFileSync(join(f.dir, 'events'), 'utf8');
		const again = deploy(f);
		assert.equal(again.status, 0, again.stderr);
		assert.match(again.stdout, /allerede oppdatert/);
		assert.equal(readFileSync(join(f.dir, 'events'), 'utf8'), events);
		assert.equal(readdirSync(join(f.dir, 'backups')).length, 1);
	}
);

test(
	'migrasjonsfeil beholder gammel frontend og backup, uten å overskrive elevdata',
	{ skip: !supported },
	(t) => {
		const f = fixture(t, { invalidMigration: true });
		const result = deploy(f);
		assert.notEqual(result.status, 0);
		assert.equal(readFileSync(join(f.dir, 'web/current/index.html'), 'utf8'), 'old frontend');
		assert.equal(realpathSync(join(f.dir, 'base/api-current')), join(f.dir, 'base/releases/old'));
		assert.equal(readdirSync(join(f.dir, 'backups')).length, 1);
		const live = new DatabaseSync(join(f.dir, 'data/it-laben.sqlite'));
		assert.equal(live.prepare('SELECT answer FROM work').get().answer, 'behold elevens svar');
		live.close();
	}
);

test(
	'feil i HTTPS-helsesjekken aktiverer ikke ny frontend eller ruller databasen tilbake',
	{ skip: !supported },
	(t) => {
		const f = fixture(t);
		const result = deploy(f, { QA_FAIL_HTTPS: '1' });
		assert.notEqual(result.status, 0);
		assert.equal(readFileSync(join(f.dir, 'web/current/index.html'), 'utf8'), 'old frontend');
		const live = new DatabaseSync(join(f.dir, 'data/it-laben.sqlite'));
		assert.equal(live.prepare('PRAGMA table_info(work)').all().length, 2);
		live.close();
		assert.equal(readdirSync(join(f.dir, 'backups')).length, 1);
	}
);

test(
	'lokal CA gir verifiserbart sertifikat for både navn og IP, og eksisterende nøkler bevares',
	{ skip: !supported },
	(t) => {
		const directory = temporary(t);
		const source = `source "$1"
certificate_name=im.local; certificate_ip=192.168.10.20
certificate_ca="$2/ca"; certificate_out="$2/certs"
certificate_create`;
		const first = shell(source, [certificateFile, directory]);
		assert.equal(first.status, 0, first.stderr + first.stdout);
		for (const [flag, value] of [
			['-checkhost', 'im.local'],
			['-checkip', '192.168.10.20']
		]) {
			const result = spawnSync(
				'openssl',
				['x509', '-in', join(directory, 'certs/server.crt'), '-noout', flag, value],
				{ encoding: 'utf8' }
			);
			assert.equal(result.status, 0, result.stderr);
		}
		const before = readFileSync(join(directory, 'certs/root-ca.crt'), 'utf8');
		assert.equal(statSync(join(directory, 'ca')).mode & 0o777, 0o700);
		assert.equal(statSync(join(directory, 'ca/root-ca.key')).mode & 0o777, 0o600);
		assert.equal(statSync(join(directory, 'certs/server.key')).mode & 0o777, 0o600);
		assert.notEqual(shell(source, [certificateFile, directory]).status, 0);
		assert.equal(readFileSync(join(directory, 'certs/root-ca.crt'), 'utf8'), before);
	}
);

test(
	'HTTPS-helsesjekken bruker faktisk TLS-tillit, korrekt vertsnavn og API-svar',
	{ skip: !supported },
	async (t) => {
		const directory = temporary(t);
		const certificate = shell(
			'source "$1"; certificate_name=im.local; certificate_ip=192.168.10.20; certificate_ca="$2/ca"; certificate_out="$2/certs"; certificate_create',
			[certificateFile, directory]
		);
		assert.equal(certificate.status, 0, certificate.stderr);
		let reply = '{"ok":true}';
		const server = createServer(
			{
				key: readFileSync(join(directory, 'certs/server.key')),
				cert: readFileSync(join(directory, 'certs/server.crt'))
			},
			(_req, res) => {
				res.setHeader('Content-Type', 'application/json');
				res.end(reply);
			}
		).listen(0, '127.0.0.1');
		await once(server, 'listening');
		t.after(() => new Promise((resolve) => server.close(resolve)));
		const port = server.address().port;
		const check = (host, ca) =>
			execute(
				'bash',
				[
					'-c',
					'source "$1"; DEPLOY_HOST="$2"; DEPLOY_HTTPS_PORT="$3"; DEPLOY_CA="$4"; DEPLOY_ORIGIN="https://$2:$3"; deploy_https_health',
					'--',
					deployFile,
					host,
					String(port),
					ca
				],
				{ timeout: 10_000 }
			);
		await check('im.local', join(directory, 'certs/root-ca.crt'));
		await check('192.168.10.20', join(directory, 'certs/root-ca.crt'));
		await assert.rejects(check('wrong.local', join(directory, 'certs/root-ca.crt')));
		await assert.rejects(check('im.local', ''));
		reply = '{"ok":false}';
		await assert.rejects(check('im.local', join(directory, 'certs/root-ca.crt')));
	}
);
