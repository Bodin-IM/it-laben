import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { createServer } from 'node:https';
import { createHash } from 'node:crypto';
import {
	mkdtempSync,
	mkdirSync,
	writeFileSync,
	readFileSync,
	copyFileSync,
	symlinkSync,
	existsSync,
	readdirSync,
	rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const supported = process.platform === 'linux';
const execute = promisify(execFile);
const script = new URL('../server/deploy/change-origin.sh', import.meta.url).pathname;
const certificate = new URL('../server/deploy/create-local-certificate.sh', import.meta.url)
	.pathname;
const installer = new URL('../server/deploy/install-main.sh', import.meta.url).pathname;
const fingerprint = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
function shell(source, args = [], env = {}) {
	return spawnSync('bash', ['-c', source, '--', ...args], {
		encoding: 'utf8',
		env: { ...process.env, ...env },
		timeout: 30_000
	});
}
function fixture(t) {
	const dir = mkdtempSync(join(tmpdir(), 'itlab-origin-'));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	for (const path of [
		'etc',
		'nginx',
		'data',
		'backups',
		'base/api-current/server',
		'web/current',
		'stage'
	])
		mkdirSync(join(dir, path), { recursive: true });
	const cert = shell(
		'source "$1"; certificate_name=im.local; certificate_ip=10.100.0.14; certificate_ca="$2/ca"; certificate_out="$2/certs"; certificate_create',
		[certificate, dir]
	);
	assert.equal(cert.status, 0, cert.stderr);
	const config = `DEPLOY_BASE=${dir}/base\nDEPLOY_WEB=${dir}/web\nDEPLOY_DATA=${dir}/data\nDEPLOY_BACKUPS=${dir}/backups\nDEPLOY_USER=itlab\nDEPLOY_NODE=${process.execPath}\nDEPLOY_NPM=/usr/bin/npm\nDEPLOY_CA=${dir}/certs/root-ca.crt\nDEPLOY_HOST=10.100.0.14\nDEPLOY_HTTPS_PORT=8443\nDEPLOY_ORIGIN=https://10.100.0.14:8443\n`;
	writeFileSync(join(dir, 'etc/deploy.conf'), config);
	writeFileSync(
		join(dir, 'etc/api.env'),
		`NODE_ENV=production\nAPP_ORIGIN=https://10.100.0.14:8443\nAPI_PORT=3001\nITLAB_DB_PATH=${dir}/data/it-laben.sqlite\n`
	);
	writeFileSync(
		join(dir, 'nginx/https'),
		'# Managed by IT-laben main deploy v1\n# previous nginx configuration\n'
	);
	symlinkSync(join(dir, 'nginx/https'), join(dir, 'nginx/enabled'));
	writeFileSync(join(dir, 'web/current/index.html'), 'existing frontend');
	copyFileSync(
		new URL('../server/backup.js', import.meta.url),
		join(dir, 'base/api-current/server/backup.js')
	);
	copyFileSync(
		new URL('../server/config.js', import.meta.url),
		join(dir, 'base/api-current/server/config.js')
	);
	const db = new DatabaseSync(join(dir, 'data/it-laben.sqlite'));
	db.exec("CREATE TABLE work(answer TEXT); INSERT INTO work VALUES ('behold elevens svar');");
	db.close();
	writeFileSync(join(dir, 'api-active'), '1');
	writeFileSync(join(dir, 'timer-active'), '1');
	return {
		dir,
		config,
		key: fingerprint(join(dir, 'certs/server.key')),
		ca: fingerprint(join(dir, 'ca/root-ca.key'))
	};
}
const preparation = `set -Eeuo pipefail
source "$1"
origin_paths
ORIGIN_config="$QA_DIR/etc/deploy.conf"; ORIGIN_env="$QA_DIR/etc/api.env"
ORIGIN_site="$QA_DIR/nginx/https"; ORIGIN_enabled="$QA_DIR/nginx/enabled"
ORIGIN_cert="$QA_DIR/certs/server.crt"; ORIGIN_key="$QA_DIR/certs/server.key"
ORIGIN_ca="$QA_DIR/ca"; ORIGIN_public_ca="$QA_DIR/certs/root-ca.crt"
ORIGIN_public_config="$QA_DIR/etc/public.json"
ORIGIN_backups="$QA_DIR/origin-backups"; ORIGIN_lock="$QA_DIR/deploy.lock"
ORIGIN_host=itlab.im.local; ORIGIN_ip=10.100.0.14
# Only service management, ownership and HTTP are mocked. Certificates, file edits,
# snapshots and consistent SQLite backups run for real inside the temporary fixture.
origin_owned() { [[ -f "$1" && ! -L "$1" ]]; }
systemctl() {
  printf '%s\\n' "$*" >> "$QA_DIR/services"
  case "$1" in
    is-active) if [[ "$*" == *it-laben-api.service* ]]; then [[ -f "$QA_DIR/api-active" ]]; else [[ -f "$QA_DIR/timer-active" ]]; fi ;;
    stop) rm -f "$QA_DIR/timer-active" ;;
    start) touch "$QA_DIR/timer-active" ;;
    restart)
      touch "$QA_DIR/api-active"
      if [[ "$QA_UPDATE_DATA" == 1 && ! -e "$QA_DIR/new-answer" ]] && grep -Fxq 'APP_ORIGIN=https://itlab.im.local' "$ORIGIN_env"; then
        "$DEPLOY_NODE" --input-type=module - "$DEPLOY_DATA/it-laben.sqlite" <<'JS'
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(process.argv[2]);
db.prepare('UPDATE work SET answer=?').run('ny innlevering etter backup');
db.close();
JS
        touch "$QA_DIR/new-answer"
      fi ;;
    reload) return 0 ;;
    *) return 1 ;;
  esac
}
nginx() {
  if grep -q 'DNS and IP access configured' "$ORIGIN_site"; then
    if [[ "$QA_FAIL_NGINX" == 1 ]]; then printf 'invalid config\\n' >&2; return 1; fi
    if [[ "$QA_FAIL_NGINX" == warning ]]; then printf 'conflicting server name\\n' >&2; fi
  fi
}
ss() { :; }
origin_health() {
  printf '%s\\n' "$3" >> "$QA_DIR/health"
  if [[ "$3" == https://itlab.im.local && "$QA_FAIL_HTTPS" == 1 ]]; then return 1; fi
  if [[ "$3" == https://10.100.0.14 && "$QA_FAIL_IP" == 1 ]]; then return 1; fi
}
curl() {
  printf '%s\\n' "$*" >> "$QA_DIR/requests"
  if [[ "$*" == *api/me/lab* ]]; then printf 401
  elif [[ "$*" == *http://*/api/* ]]; then printf 426
  else printf 200
  fi
}
sleep() { :; }
runuser() { shift 3; "$@"; }
install() {
  local args=()
  while [[ $# -gt 0 ]]; do case "$1" in -o|-g) shift 2 ;; *) args+=("$1"); shift ;; esac; done
  command install "\${args[@]}"
}
origin_check
`;
function run(f, command, env = {}) {
	return shell(preparation + command, [script], {
		QA_DIR: f.dir,
		QA_FAIL_NGINX: '0',
		QA_FAIL_HTTPS: '0',
		QA_FAIL_IP: '0',
		QA_UPDATE_DATA: '0',
		...env
	});
}

// Exercise argument parsing and the real CLI control flow without touching /etc
// or requiring the test runner to be root. Service/HTTP mocks stay the same.
function runMain(f, options = '', env = {}) {
	return run(
		f,
		`origin_paths() { :; }; origin_require_root() { :; }; origin_main --name itlab.im.local --ip 10.100.0.14 ${options}`,
		env
	);
}

test(
	'CLI: gammel HTTP v2 på samme DNS-navn oppgraderes, og --check endrer ingenting',
	{ skip: !supported },
	(t) => {
		const f = fixture(t);
		assert.equal(run(f, 'origin_apply').status, 0);
		const nginxPath = join(f.dir, 'nginx/https');
		const envPath = join(f.dir, 'etc/api.env');
		const oldNginx = readFileSync(nginxPath, 'utf8').replace(
			/^    if \(\$host !~.*$/m,
			'    if ($host != itlab.im.local) { return 308 https://itlab.im.local$request_uri; }'
		);
		writeFileSync(nginxPath, oldNginx);
		writeFileSync(envPath, readFileSync(envPath, 'utf8').replace(/^APP_ORIGIN_ALIASES=.*\n/m, ''));
		const oldEnv = readFileSync(envPath, 'utf8');
		const cert = fingerprint(join(f.dir, 'certs/server.crt'));
		const backupCount = readdirSync(join(f.dir, 'origin-backups')).length;
		// Reproduce the old installation: DNS works, but IP health redirects until applied.
		const ipRedirect = `origin_health() { if [[ "$3" == https://10.100.0.14 ]] && grep -Fq 'if ($host != itlab.im.local)' "$ORIGIN_site"; then return 1; fi; }; `;
		const command =
			'origin_paths() { :; }; origin_require_root() { :; }; ' +
			ipRedirect +
			'origin_main --name itlab.im.local --ip 10.100.0.14';
		const checked = run(f, command + ' --check');
		assert.equal(checked.status, 0, checked.stderr);
		assert.equal(readFileSync(nginxPath, 'utf8'), oldNginx);
		assert.equal(readFileSync(envPath, 'utf8'), oldEnv);
		assert.equal(readdirSync(join(f.dir, 'origin-backups')).length, backupCount);
		const applied = run(f, command);
		assert.equal(applied.status, 0, applied.stderr + applied.stdout);
		assert.match(applied.stdout, /Oppsett ferdig:/);
		assert.doesNotMatch(readFileSync(nginxPath, 'utf8'), /if \(\$host != itlab.im.local\)/);
		assert.match(readFileSync(envPath, 'utf8'), /^APP_ORIGIN_ALIASES=https:\/\/10.100.0.14$/m);
		assert.equal(fingerprint(join(f.dir, 'certs/server.crt')), cert);
		const repeated = runMain(f);
		assert.equal(repeated.status, 0, repeated.stderr + repeated.stdout);
		assert.match(repeated.stdout, /Oppsett ferdig:/);
		assert.equal(fingerprint(join(f.dir, 'certs/server.crt')), cert);
		const db = new DatabaseSync(join(f.dir, 'data/it-laben.sqlite'));
		assert.equal(db.prepare('SELECT answer FROM work').get().answer, 'behold elevens svar');
		db.close();
	}
);

test(
	'adressebytte: Bash-syntaks og avvisning av ugyldige navn/IP før endring',
	{ skip: !supported },
	() => {
		assert.equal(spawnSync('bash', ['-n', script]).status, 0);
		for (const [name, ip] of [
			['itlab.im.local', '10.100.0.14'],
			['bad;command.local', '10.100.0.14'],
			['itlab.im.local', '999.100.0.14'],
			['itlab.im.local', '10.0100.0.14']
		]) {
			const result = shell('source "$1"; ORIGIN_host="$2"; ORIGIN_ip="$3"; origin_validate', [
				script,
				name,
				ip
			]);
			assert.equal(result.status === 0, name === 'itlab.im.local' && ip === '10.100.0.14');
		}
	}
);
test(
	'adressebytte: forhåndskontroll endrer ingen filer, sertifikater, database eller tjenester',
	{ skip: !supported },
	(t) => {
		const f = fixture(t),
			cert = fingerprint(join(f.dir, 'certs/server.crt'));
		const result = run(f, ':');
		assert.equal(result.status, 0, result.stderr + result.stdout);
		assert.equal(fingerprint(join(f.dir, 'certs/server.crt')), cert);
		assert.equal(readFileSync(join(f.dir, 'etc/deploy.conf'), 'utf8'), f.config);
		assert.equal(readdirSync(join(f.dir, 'backups')).length, 0);
		assert.ok(!existsSync(join(f.dir, 'origin-backups')));
		assert.ok(
			!readFileSync(join(f.dir, 'services'), 'utf8').match(/^(stop|restart|reload|start) /m)
		);
	}
);
test(
	'adressebytte: eldre API uten IP-støtte avvises før filer eller tjenester endres',
	{ skip: !supported },
	(t) => {
		const f = fixture(t);
		writeFileSync(
			join(f.dir, 'base/api-current/server/config.js'),
			'export function readConfig(env) { return {allowedOrigins: new Set([env.APP_ORIGIN])}; }'
		);
		const result = run(f, ':');
		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /Publiser main med støtte for APP_ORIGIN_ALIASES først/);
		assert.equal(readFileSync(join(f.dir, 'etc/deploy.conf'), 'utf8'), f.config);
		assert.equal(readdirSync(join(f.dir, 'backups')).length, 0);
		assert.ok(existsSync(join(f.dir, 'timer-active')));
		assert.ok(!existsSync(join(f.dir, 'origin-backups')));
	}
);

test(
	'adressebytte: samme CA og nøkkel, DNS/IP beholdes, konfigurasjon og frisk tjeneste aktiveres samlet',
	{ skip: !supported },
	(t) => {
		const f = fixture(t),
			result = run(f, 'origin_apply');
		assert.equal(result.status, 0, result.stderr + result.stdout);
		assert.equal(fingerprint(join(f.dir, 'certs/server.key')), f.key);
		assert.equal(fingerprint(join(f.dir, 'ca/root-ca.key')), f.ca);
		const names = spawnSync(
			'openssl',
			['x509', '-in', join(f.dir, 'certs/server.crt'), '-noout', '-ext', 'subjectAltName'],
			{ encoding: 'utf8' }
		);
		assert.match(names.stdout, /DNS:im.local/);
		assert.match(names.stdout, /DNS:itlab.im.local/);
		assert.match(names.stdout, /IP Address:10.100.0.14/);
		const conf = readFileSync(join(f.dir, 'etc/deploy.conf'), 'utf8');
		assert.match(conf, /DEPLOY_ORIGIN=https:\/\/itlab.im.local\n/);
		assert.match(conf, /DEPLOY_HTTPS_PORT=443\n/);
		assert.match(conf, new RegExp('DEPLOY_DATA=' + f.dir + '/data\\n'));
		assert.match(
			readFileSync(join(f.dir, 'etc/api.env'), 'utf8'),
			/APP_ORIGIN=https:\/\/itlab.im.local\n/
		);
		const nginx = readFileSync(join(f.dir, 'nginx/https'), 'utf8');
		assert.match(nginx, /listen 80;/);
		assert.match(nginx, /listen 443 ssl;/);
		assert.match(nginx, /listen 8443 ssl;/);
		assert.match(nginx, /server_name itlab.im.local 10.100.0.14;/);
		assert.match(
			nginx,
			/if \(\$host = 10.100.0.14\) \{ return 307 https:\/\/10.100.0.14\$request_uri; \}/
		);
		assert.match(nginx, /if \(\$host !~ \^\(itlab\\\.im\\\.local\|10\\\.100\\\.0\\\.14\)\$\)/);
		assert.doesNotMatch(nginx, /if \(\$host !=|return 308/);
		assert.match(
			readFileSync(join(f.dir, 'etc/api.env'), 'utf8'),
			/^APP_ORIGIN_ALIASES=https:\/\/10.100.0.14$/m
		);
		assert.match(nginx, /proxy_pass http:\/\/127.0.0.1:3001;/);
		assert.match(nginx, /proxy_set_header X-Forwarded-Proto \$scheme;/);
		assert.match(nginx, /proxy_hide_header Strict-Transport-Security;/);
		assert.match(nginx, /Strict-Transport-Security 'max-age=0' always/);
		const http = nginx.split('listen 443 ssl;')[0];
		assert.doesNotMatch(http, /proxy_pass|return 308/);
		assert.match(http, /return 426/);
		assert.match(http, /alias .*\/certs\/root-ca.crt;/);
		const metadata = JSON.parse(readFileSync(join(f.dir, 'etc/public.json'), 'utf8'));
		assert.equal(metadata.httpsOrigin, 'https://itlab.im.local');
		assert.match(metadata.caSha256, /^[0-9A-F]{64}$/);
		assert.equal(readFileSync(join(f.dir, 'web/current/index.html'), 'utf8'), 'existing frontend');
		assert.ok(existsSync(join(f.dir, 'timer-active')));
		const db = new DatabaseSync(join(f.dir, 'data/it-laben.sqlite'));
		assert.equal(db.prepare('SELECT answer FROM work').get().answer, 'behold elevens svar');
		db.close();
		assert.equal(readdirSync(join(f.dir, 'backups')).length, 1);
		const again = run(f, 'origin_verify_target');
		assert.equal(again.status, 0, again.stderr);
		assert.match(readFileSync(join(f.dir, 'health'), 'utf8'), /^https:\/\/10.100.0.14$/m);
		assert.match(readFileSync(join(f.dir, 'requests'), 'utf8'), /Origin: https:\/\/10.100.0.14/);
	}
);
test(
	'adressebytte: allerede konfigurert HTTPS får offentlig HTTP uten nytt sertifikat, og 8443-videresending beholdes',
	{ skip: !supported },
	(t) => {
		const f = fixture(t),
			first = run(f, 'origin_apply');
		assert.equal(first.status, 0, first.stderr);
		const cert = fingerprint(join(f.dir, 'certs/server.crt'));
		const second = run(f, 'origin_apply');
		assert.equal(second.status, 0, second.stderr);
		assert.equal(fingerprint(join(f.dir, 'certs/server.crt')), cert);
		assert.match(readFileSync(join(f.dir, 'nginx/https'), 'utf8'), /listen 8443 ssl;/);
		assert.equal(
			readFileSync(join(f.dir, 'etc/api.env'), 'utf8').match(/^APP_ORIGIN_ALIASES=/gm).length,
			1
		);
	}
);
test(
	'adressebytte: eksisterende aliaser bevares, og manglende IP i sertifikatet repareres også ved samme DNS-navn',
	{ skip: !supported },
	(t) => {
		const f = fixture(t);
		assert.equal(run(f, 'origin_apply').status, 0);
		const envPath = join(f.dir, 'etc/api.env');
		writeFileSync(
			envPath,
			readFileSync(envPath, 'utf8').replace(
				'APP_ORIGIN_ALIASES=https://10.100.0.14',
				'APP_ORIGIN_ALIASES=https://extra.example.test'
			)
		);
		const missingIp = run(
			f,
			'ORIGIN_stage="$QA_DIR/stage"; ORIGIN_san=DNS:itlab.im.local; origin_certificate() { openssl req -new -sha256 -key "$ORIGIN_key" -subj "/CN=$ORIGIN_host" -out "$ORIGIN_stage/server.csr"; printf "subjectAltName=DNS:itlab.im.local\\nextendedKeyUsage=serverAuth\\n" > "$ORIGIN_stage/server.ext"; openssl x509 -req -days 365 -in "$ORIGIN_stage/server.csr" -CA "$ORIGIN_ca/root-ca.crt" -CAkey "$ORIGIN_ca/root-ca.key" -set_serial 42 -extfile "$ORIGIN_stage/server.ext" -out "$ORIGIN_cert"; }; origin_certificate'
		);
		assert.equal(missingIp.status, 0, missingIp.stderr);
		const before = fingerprint(join(f.dir, 'certs/server.crt'));
		const result = run(f, 'origin_apply');
		assert.equal(result.status, 0, result.stderr + result.stdout);
		assert.notEqual(fingerprint(join(f.dir, 'certs/server.crt')), before);
		assert.equal(fingerprint(join(f.dir, 'certs/server.key')), f.key);
		assert.equal(fingerprint(join(f.dir, 'ca/root-ca.key')), f.ca);
		assert.match(
			readFileSync(envPath, 'utf8'),
			/^APP_ORIGIN_ALIASES=https:\/\/extra.example.test,https:\/\/10.100.0.14$/m
		);
		const ipCheck = spawnSync('openssl', [
			'x509',
			'-in',
			join(f.dir, 'certs/server.crt'),
			'-noout',
			'-checkip',
			'10.100.0.14'
		]);
		assert.equal(ipCheck.status, 0);
	}
);
for (const condition of [
	{ QA_FAIL_NGINX: '1' },
	{ QA_FAIL_NGINX: 'warning' },
	{ QA_FAIL_HTTPS: '1' },
	{ QA_FAIL_IP: '1' }
]) {
	test(
		`adressebytte: ${JSON.stringify(condition)} gjenoppretter filer og timer uten databasetilbakerulling`,
		{ skip: !supported },
		(t) => {
			const f = fixture(t),
				cert = fingerprint(join(f.dir, 'certs/server.crt')),
				env = readFileSync(join(f.dir, 'etc/api.env'), 'utf8');
			const result = run(f, 'origin_apply', condition);
			assert.notEqual(result.status, 0);
			assert.equal(readFileSync(join(f.dir, 'etc/deploy.conf'), 'utf8'), f.config);
			assert.equal(readFileSync(join(f.dir, 'etc/api.env'), 'utf8'), env);
			assert.equal(fingerprint(join(f.dir, 'certs/server.crt')), cert);
			assert.equal(fingerprint(join(f.dir, 'ca/root-ca.key')), f.ca);
			assert.ok(existsSync(join(f.dir, 'timer-active')));
			assert.equal(readdirSync(join(f.dir, 'backups')).length, 1);
		}
	);
}
test(
	'adressebytte: tilbakeføring beholder en innlevering som kom etter databasebackup',
	{ skip: !supported },
	(t) => {
		const f = fixture(t),
			result = run(f, 'origin_apply', { QA_FAIL_HTTPS: '1', QA_UPDATE_DATA: '1' });
		assert.notEqual(result.status, 0);
		const live = new DatabaseSync(join(f.dir, 'data/it-laben.sqlite'));
		assert.equal(
			live.prepare('SELECT answer FROM work').get().answer,
			'ny innlevering etter backup'
		);
		live.close();
		const backup = new DatabaseSync(join(f.dir, 'backups', readdirSync(join(f.dir, 'backups'))[0]));
		assert.equal(backup.prepare('SELECT answer FROM work').get().answer, 'behold elevens svar');
		backup.close();
	}
);
test(
	'adressebytte: feil i HTTPS må avvise også når Origin-kontrollen isolert sett ville bestått',
	{ skip: !supported },
	(t) => {
		const f = fixture(t),
			result = run(f, 'origin_verify_target', { QA_FAIL_HTTPS: '1' });
		assert.notEqual(result.status, 0);
	}
);
test(
	'adressebytte: publiseringslås stanser byttet uten filendringer og gjenoppretter timerens tilstand',
	{ skip: !supported },
	(t) => {
		const f = fixture(t),
			result = run(f, 'exec 8>"$ORIGIN_lock"; flock 8; origin_apply');
		assert.notEqual(result.status, 0);
		assert.equal(readFileSync(join(f.dir, 'etc/deploy.conf'), 'utf8'), f.config);
		assert.ok(existsSync(join(f.dir, 'timer-active')));
		assert.ok(!existsSync(join(f.dir, 'origin-backups')));
	}
);
test('adressebytte: feil Origin avvises selv om HTTPS er frisk', { skip: !supported }, (t) => {
	const f = fixture(t),
		result = run(f, 'curl() { printf 403; }; origin_verify_target');
	assert.notEqual(result.status, 0);
});
test(
	'installasjon: HTTP viser statisk innhold og sperrer API, mens HTTPS beholder profiltilgang',
	{ skip: !supported },
	() => {
		const result = shell(
			'source "$1"; DEPLOY_HTTPS_PORT=443; DEPLOY_HOST=itlab.im.local; DEPLOY_ORIGIN=https://itlab.im.local; DEPLOY_WEB=/var/www/it-laben; setup_cert=/etc/ssl/it-laben/server.crt; setup_key=/etc/ssl/it-laben/server.key; setup_nginx',
			[installer]
		);
		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.stdout.split('\n')[0], '# Managed by IT-laben main deploy v1');
		assert.match(result.stdout, /listen 80;/);
		assert.match(result.stdout, /listen 443 ssl;/);
		const [http, https] = result.stdout.split('listen 443 ssl;');
		assert.match(http, /return 426/);
		assert.match(http, /try_files \$uri \$uri\/ =404;/);
		assert.doesNotMatch(http, /proxy_pass|return 308/);
		assert.match(https, /proxy_pass http:\/\/127.0.0.1:3001;/);
		assert.match(https, /location = \/tilkobling.json/);
		assert.match(https, /Access-Control-Allow-Origin '\*'/);
	}
);
test(
	'adressebytte: nytt serversertifikat verifiseres gjennom faktisk TLS og krever riktig CA',
	{ skip: !supported },
	async (t) => {
		const f = fixture(t),
			prepared = run(f, 'ORIGIN_stage="$QA_DIR/stage"; origin_certificate');
		assert.equal(prepared.status, 0, prepared.stderr);
		const server = createServer(
			{
				key: readFileSync(join(f.dir, 'certs/server.key')),
				cert: readFileSync(join(f.dir, 'stage/server.crt'))
			},
			(_req, res) => res.end('{"ok":true}')
		).listen(0, '127.0.0.1');
		await once(server, 'listening');
		t.after(() => new Promise((resolve) => server.close(resolve)));
		const port = server.address().port;
		const source =
			'source "$1"; ORIGIN_public_ca="$2"; origin_health itlab.im.local "$3" "https://itlab.im.local:$3"';
		const ok = await execute(
			'bash',
			['-c', source, '--', script, join(f.dir, 'certs/root-ca.crt'), String(port)],
			{ timeout: 10000 }
		);
		assert.equal(ok.stderr, '');
		await assert.rejects(
			execute(
				'bash',
				['-c', source, '--', script, '/etc/ssl/certs/ca-certificates.crt', String(port)],
				{ timeout: 10000 }
			),
			/certificate|certificat/i
		);
	}
);
