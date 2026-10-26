#!/usr/bin/env bash
# Engangsoppsett på Ubuntu. Timeren fortsetter å hente main etter installasjonen.
set -Eeuo pipefail

setup_die() { printf 'FEIL: %s\n' "$*" >&2; exit 1; }
setup_help() {
    cat <<'HELP'
Bruk på Ubuntu-serveren:
  sudo bash server/deploy/install-main.sh \
    --origin https://itlab.im.local \
    --cert /etc/ssl/it-laben/server.crt \
    --key /etc/ssl/it-laben/server.key \
    --ca /etc/ssl/it-laben/root-ca.crt

  --check  Kontroller forutsetningene uten å endre serveren.
  --ca     Valgfritt dersom utstederen allerede finnes i serverens tillitslager.

Standard HTTPS-port er 443. HTTP på 80 viser åpent innhold uten backend.
Bruk change-origin.sh for å flytte en eksisterende installasjon til en ny adresse.
Eksisterende visning på 8080 beholdes.
Sertifikatet må dekke vertsnavnet/IP-en i --origin. Klientene må stole på CA-en.
Installerer systemd-API, Nginx-HTTPS, daglig backup og oppdatering fra main.
Installerer ikke Node.js, sertifikater eller brannmurregler.
HELP
}

setup_origin() {
    "$DEPLOY_NODE" --input-type=module - "$1" <<'JS'
import { isIP } from 'node:net';
try {
    const url = new URL(process.argv[2]);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password)
        throw new Error('Bruk bare https://vertsnavn med eventuell port.');
    if (!/^[a-z0-9.-]+$/i.test(url.hostname) || url.hostname.startsWith('-'))
        throw new Error('Bruk et DNS-navn eller en IPv4-adresse.');
    console.log([url.origin, url.hostname, url.port || '443', isIP(url.hostname) ? '-checkip' : '-checkhost'].join('\n'));
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
JS
}

setup_public_locations() {
    cat <<NGINX
    location = /itlab-config.json {
        alias /etc/it-laben-public.json;
        default_type application/json;
        add_header Cache-Control no-store always;
    }
NGINX
    if [[ -n "${DEPLOY_CA:-}" ]]; then
        cat <<NGINX
    location = /sertifikat/it-laben-root-ca.crt {
        alias $DEPLOY_CA;
        default_type application/x-x509-ca-cert;
        add_header Content-Disposition 'attachment; filename="it-laben-root-ca.crt"';
        add_header Cache-Control no-cache always;
    }
NGINX
    fi
}
setup_nginx() {
    printf '%s\n' '# Managed by IT-laben main deploy v1'
    if [[ "$DEPLOY_HTTPS_PORT" == 443 ]]; then
        cat <<NGINX
# IT-laben public HTTP v2
server {
    listen 80;
    server_name $DEPLOY_HOST;
    root $DEPLOY_WEB/current;
    index index.html;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-Frame-Options DENY always;
NGINX
        setup_public_locations
        cat <<NGINX
    location = /api { return 426; }
    location /api/ {
        default_type application/json;
        return 426 '{"error":{"code":"HTTPS_REQUIRED","message":"Bruk HTTPS for Min lab."}}';
    }
    location /_app/immutable/ {
        try_files \$uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location / {
        try_files \$uri \$uri/ =404;
        add_header Cache-Control no-cache;
        add_header Strict-Transport-Security 'max-age=0' always;
    }
}
NGINX
    fi
    cat <<NGINX
server {
    listen $DEPLOY_HTTPS_PORT ssl;
    server_name $DEPLOY_HOST;
    ssl_certificate $setup_cert;
    ssl_certificate_key $setup_key;
    ssl_protocols TLSv1.2 TLSv1.3;
    root $DEPLOY_WEB/current;
    index index.html;
    client_max_body_size 16k;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-Frame-Options DENY always;
    add_header Strict-Transport-Security 'max-age=0' always;
    if (\$host != $DEPLOY_HOST) { return 308 $DEPLOY_ORIGIN\$request_uri; }
NGINX
    setup_public_locations
    cat <<NGINX
    location = /tilkobling.json {
        default_type application/json;
        add_header Access-Control-Allow-Origin '*' always;
        add_header Cache-Control no-store always;
        return 200 '{"ok":true}';
    }
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_hide_header Strict-Transport-Security;
        add_header Cache-Control no-store always;
        add_header Strict-Transport-Security 'max-age=0' always;
        proxy_cache_bypass 1;
        proxy_no_cache 1;
    }
    location /_app/immutable/ {
        try_files \$uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location / {
        try_files \$uri \$uri/ =404;
        add_header Cache-Control no-cache;
        add_header Strict-Transport-Security 'max-age=0' always;
    }
}
NGINX
}

setup_snapshot() {
    local path
    for path in "${setup_paths[@]}"; do
        if [[ -e "$path" || -L "$path" ]]; then
            mkdir -p -- "$setup_backup$(dirname "$path")"
            cp -a -- "$path" "$setup_backup$path"
        fi
    done
}

setup_restore() {
    local status=$1 path
    trap - ERR INT TERM HUP
    set +e
    systemctl stop it-laben-update.timer it-laben-backup.timer
    for path in "${setup_paths[@]}"; do
        rm -f -- "$path"
        if [[ -e "$setup_backup$path" || -L "$setup_backup$path" ]]; then
            cp -a -- "$setup_backup$path" "$path"
        fi
    done
    systemctl daemon-reload
    nginx -t && systemctl reload nginx
    if [[ "$setup_timer_was_enabled" == 1 ]]; then systemctl enable it-laben-update.timer; else systemctl disable it-laben-update.timer; fi
    if [[ "$setup_backup_was_enabled" == 1 ]]; then systemctl enable it-laben-backup.timer; else systemctl disable it-laben-backup.timer; fi
    [[ "$setup_timer_was_active" != 1 ]] || systemctl start it-laben-update.timer
    [[ "$setup_backup_was_active" != 1 ]] || systemctl start it-laben-backup.timer
    printf 'Oppsett feilet. Forrige konfigurasjon er forsøkt gjenopprettet. Backup: %s\n' "$setup_backup" >&2
    exit "$status"
}

setup_main() {
    local setup_check=0 setup_origin_value='' setup_cert='' setup_key='' DEPLOY_CA=''
    local setup_dir
    setup_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --origin|--cert|--key|--ca)
                [[ $# -ge 2 && -n "$2" ]] || setup_die "Mangler verdi etter $1."
                case "$1" in
                    --origin) setup_origin_value=$2 ;;
                    --cert) setup_cert=$2 ;;
                    --key) setup_key=$2 ;;
                    --ca) DEPLOY_CA=$2 ;;
                esac
                shift 2 ;;
            --check) setup_check=1; shift ;;
            -h|--help) setup_help; return 0 ;;
            *) setup_die "Ukjent argument: $1. Bruk --help." ;;
        esac
    done
    [[ $EUID -eq 0 ]] || setup_die 'Kjør med sudo på Ubuntu-serveren.'
    [[ -n "$setup_origin_value" && -n "$setup_cert" && -n "$setup_key" ]] || { setup_help; exit 1; }
    local DEPLOY_BASE=/srv/it-laben DEPLOY_WEB=/var/www/it-laben DEPLOY_DATA=/var/lib/it-laben
    local DEPLOY_BACKUPS=/var/backups/it-laben/database DEPLOY_CACHE=/var/cache/it-laben/npm DEPLOY_USER=itlab
    local DEPLOY_NODE=/usr/bin/node DEPLOY_NPM=/usr/bin/npm
    local command
    for command in git curl nginx openssl systemctl runuser flock tar ss useradd install find sha256sum; do
        command -v "$command" >/dev/null || setup_die "Mangler $command. Installer nødvendige Ubuntu-pakker først."
    done
    [[ -x "$DEPLOY_NODE" && -x "$DEPLOY_NPM" ]] || setup_die 'Installer systemtilgjengelig Node.js og npm i /usr/bin først.'
    "$DEPLOY_NODE" -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<24 || (a===24 && b<17)) process.exit(1)' || setup_die 'Node.js 24.17 eller nyere kreves.'
    [[ -d /run/systemd/system && -d /etc/nginx/sites-enabled ]] || setup_die 'Dette skriptet forventer Ubuntu med systemd og Nginx sites-enabled.'
    [[ -f "$setup_dir/update-main.sh" && -f "$setup_dir/backup-daily.sh" ]] || setup_die 'update-main.sh og backup-daily.sh må ligge ved siden av install-main.sh.'
    local origin_parts DEPLOY_ORIGIN DEPLOY_HOST DEPLOY_HTTPS_PORT cert_check
    origin_parts=$(setup_origin "$setup_origin_value") || setup_die 'Ugyldig HTTPS-adresse.'
    local -a parts
    mapfile -t parts <<< "$origin_parts"
    DEPLOY_ORIGIN=${parts[0]}; DEPLOY_HOST=${parts[1]}; DEPLOY_HTTPS_PORT=${parts[2]}; cert_check=${parts[3]}
    local path
    for path in "$setup_cert" "$setup_key" "$DEPLOY_CA"; do
        [[ -n "$path" ]] || continue
        [[ "$path" =~ ^/[a-zA-Z0-9_./-]+$ && -f "$path" ]] || setup_die "Mangler fil eller støtter ikke filstien: $path"
    done
    openssl x509 -in "$setup_cert" -noout -checkend 86400 >/dev/null || setup_die 'Sertifikatet er utløpt eller utløper innen ett døgn.'
    openssl x509 -in "$setup_cert" -noout "$cert_check" "$DEPLOY_HOST" >/dev/null || setup_die 'Sertifikatet dekker ikke valgt vertsnavn/IP.'
    local cert_public key_public
    cert_public=$(openssl x509 -in "$setup_cert" -noout -pubkey | openssl pkey -pubin -outform DER | sha256sum)
    key_public=$(openssl pkey -in "$setup_key" -passin pass: -pubout -outform DER | sha256sum)
    [[ "$cert_public" == "$key_public" ]] || setup_die 'Sertifikat og privatnøkkel hører ikke sammen.'
    local -a verify_args=()
    [[ -z "$DEPLOY_CA" ]] || verify_args=(-CAfile "$DEPLOY_CA")
    openssl verify -purpose sslserver "${verify_args[@]}" -untrusted "$setup_cert" "$setup_cert" >/dev/null || setup_die 'Sertifikatet kan ikke verifiseres med valgt CA eller serverens tillitslager.'
    nginx -t
    local nginx_site=/etc/nginx/sites-available/it-laben-https nginx_enabled=/etc/nginx/sites-enabled/it-laben-https
    if [[ -e "$nginx_site" ]] && ! head -n 1 "$nginx_site" | setup_is_managed; then
        setup_die "$nginx_site finnes fra før og er ikke opprettet av dette skriptet."
    fi
    if [[ -e "$nginx_enabled" || -L "$nginx_enabled" ]]; then
        [[ -L "$nginx_enabled" && "$(readlink "$nginx_enabled")" == "$nginx_site" ]] || setup_die "$nginx_enabled finnes fra før med et annet oppsett."
    fi
    if [[ -n "$(ss -H -ltn "sport = :$DEPLOY_HTTPS_PORT")" && ! -L "$nginx_enabled" ]]; then
        setup_die "Port $DEPLOY_HTTPS_PORT er i bruk. Velg en ledig HTTPS-port, for eksempel 8443."
    fi
    if [[ -n "$(systemctl show it-laben-update.service -p DropInPaths --value)" ]]; then
        setup_die 'Oppdateringstjenesten har egne systemd-overstyringer. De må vurderes før installasjon.'
    fi
    if [[ -n "$(systemctl show it-laben-api.service -p DropInPaths --value)" ]]; then
        setup_die 'API-tjenesten har egne systemd-overstyringer. De må vurderes før installasjon.'
    fi
    for path in /etc/systemd/system/it-laben-backup.service /etc/systemd/system/it-laben-backup.timer; do
        if [[ -e "$path" ]] && ! head -n 1 "$path" | setup_is_managed; then
            setup_die "$path finnes fra før og er ikke opprettet av dette skriptet."
        fi
    done
    if [[ -e /etc/systemd/system/it-laben-api.service ]] && \
        ! head -n 1 /etc/systemd/system/it-laben-api.service | setup_is_managed; then
        setup_die 'En manuelt installert API-tjeneste finnes allerede. Tilpass denne installasjonen før skriptet brukes.'
    fi
    if [[ -n "$(ss -H -ltn 'sport = :3001')" ]] && ! systemctl is-active --quiet it-laben-api.service; then
        setup_die 'API-port 3001 er i bruk av en annen prosess.'
    fi
    [[ ! -e "$DEPLOY_WEB/current" || -L "$DEPLOY_WEB/current" ]] || setup_die "$DEPLOY_WEB/current må være en symbolsk lenke."
    if [[ -f /etc/it-laben-api.env ]]; then
        # Ikke overse en eksisterende databasesti og opprett en tilsynelatende tom installasjon.
        local expected
        for expected in "NODE_ENV=production" "APP_ORIGIN=$DEPLOY_ORIGIN" 'API_PORT=3001' "ITLAB_DB_PATH=$DEPLOY_DATA/it-laben.sqlite"; do
            grep -Fxq -- "$expected" /etc/it-laben-api.env || setup_die 'Eksisterende /etc/it-laben-api.env avviker fra valgt oppsett. Behold og vurder den manuelt.'
        done
    fi
    if [[ -e "$DEPLOY_BASE/repo" ]]; then
        local repo_remote
        repo_remote=$(runuser -u "$DEPLOY_USER" -- git -C "$DEPLOY_BASE/repo" remote get-url origin) || setup_die 'Eksisterende repo må kunne leses av itlab.'
        case "$repo_remote" in
            https://github.com/Bodin-IM/it-laben.git|https://github.com/Bodin-IM/it-laben|git@github.com:Bodin-IM/it-laben.git) ;;
            *) setup_die 'Eksisterende repo har en annen origin. Ingen filer er endret.' ;;
        esac
    fi
    printf 'Kontroll OK. HTTPS: %s. Automatisk kilde: origin/main.\n' "$DEPLOY_ORIGIN"
    [[ "$setup_check" != 1 ]] || return 0

    # Stopp timeren, men avbryt aldri en publisering som allerede pågår.
    local setup_timer_was_active=0 setup_timer_was_enabled=0 setup_backup_was_active=0 setup_backup_was_enabled=0
    if systemctl is-active --quiet it-laben-update.timer; then setup_timer_was_active=1; fi
    if systemctl is-enabled --quiet it-laben-update.timer; then setup_timer_was_enabled=1; fi
    if systemctl is-active --quiet it-laben-backup.timer; then setup_backup_was_active=1; fi
    if systemctl is-enabled --quiet it-laben-backup.timer; then setup_backup_was_enabled=1; fi
    systemctl stop it-laben-update.timer 2>/dev/null || true
    if systemctl is-active --quiet it-laben-update.service; then
        [[ "$setup_timer_was_active" != 1 ]] || systemctl start it-laben-update.timer
        setup_die 'En oppdateringsjobb kjører. Vent til den er ferdig og kjør installasjonen igjen.'
    fi
    local setup_backup
    setup_backup="/var/backups/it-laben/setup/$(date -u +%Y%m%dT%H%M%S)-$$"
    install -d -m 0700 "$setup_backup"
    local -a setup_paths=(/usr/local/sbin/it-laben-update /usr/local/sbin/it-laben-backup /etc/it-laben-deploy.conf /etc/it-laben-api.env /etc/it-laben-public.json
        /etc/systemd/system/it-laben-api.service /etc/systemd/system/it-laben-update.service
        /etc/systemd/system/it-laben-update.timer /etc/systemd/system/it-laben-backup.service
        /etc/systemd/system/it-laben-backup.timer "$nginx_site" "$nginx_enabled")
    setup_snapshot
    trap 'setup_restore "$?"' ERR
    trap 'setup_restore 130' INT
    trap 'setup_restore 143' TERM
    trap 'setup_restore 129' HUP
    if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
        useradd --system --user-group --home-dir "$DEPLOY_DATA" --no-create-home --shell /usr/sbin/nologin "$DEPLOY_USER"
    fi
    install -d -m 0755 "$DEPLOY_BASE" "$DEPLOY_BASE/releases" "$DEPLOY_WEB" "$DEPLOY_WEB/releases"
    install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0700 "$DEPLOY_DATA" "$DEPLOY_CACHE" "$DEPLOY_BACKUPS"
    if [[ ! -e "$DEPLOY_BASE/repo" ]]; then
        install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0755 "$DEPLOY_BASE/repo"
        runuser -u "$DEPLOY_USER" -- git clone --branch main --single-branch https://github.com/Bodin-IM/it-laben.git "$DEPLOY_BASE/repo"
    fi
    runuser -u "$DEPLOY_USER" -- git -C "$DEPLOY_BASE/repo" rev-parse --git-dir >/dev/null
    install -m 0755 "$setup_dir/update-main.sh" /usr/local/sbin/it-laben-update
    install -m 0755 "$setup_dir/backup-daily.sh" /usr/local/sbin/it-laben-backup
    (
        umask 077
        for name in DEPLOY_BASE DEPLOY_WEB DEPLOY_DATA DEPLOY_BACKUPS DEPLOY_CACHE DEPLOY_USER DEPLOY_NODE DEPLOY_NPM DEPLOY_CA DEPLOY_ORIGIN DEPLOY_HOST DEPLOY_HTTPS_PORT; do
            printf '%s=%q\n' "$name" "${!name}"
        done > /etc/it-laben-deploy.conf
        if [[ ! -f /etc/it-laben-api.env ]]; then
            printf 'NODE_ENV=production\nAPP_ORIGIN=%s\nAPI_PORT=3001\nITLAB_DB_PATH=%s/it-laben.sqlite\n' "$DEPLOY_ORIGIN" "$DEPLOY_DATA" > /etc/it-laben-api.env
        fi
    )
    chown root:root /etc/it-laben-deploy.conf /etc/it-laben-api.env
    chmod 0600 /etc/it-laben-deploy.conf /etc/it-laben-api.env
    local ca_fingerprint=''
    if [[ -n "$DEPLOY_CA" ]]; then ca_fingerprint=$(openssl x509 -in "$DEPLOY_CA" -outform DER | sha256sum); ca_fingerprint=${ca_fingerprint%% *}; fi
    "$DEPLOY_NODE" --input-type=module - "$DEPLOY_ORIGIN" "$ca_fingerprint" > /etc/it-laben-public.json <<'JS'
console.log(JSON.stringify({httpsOrigin: process.argv[2], caSha256: process.argv[3] ? process.argv[3].toUpperCase() : null}));
JS
    chown root:root /etc/it-laben-public.json
    chmod 0644 /etc/it-laben-public.json
    cat > /etc/systemd/system/it-laben-api.service <<'API'
# Managed by IT-laben main deploy v1
[Unit]
Description=IT-laben API
After=network.target
[Service]
Type=simple
User=itlab
Group=itlab
WorkingDirectory=/srv/it-laben/api-current
EnvironmentFile=/etc/it-laben-api.env
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=3
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/it-laben
[Install]
WantedBy=multi-user.target
API
    cat > /etc/systemd/system/it-laben-update.service <<'UPDATE'
# Managed by IT-laben main deploy v1
[Unit]
Description=Bygg, test og publiser IT-laben fra main
Wants=network-online.target
After=network-online.target nginx.service
[Service]
Type=oneshot
User=root
Group=root
ExecStart=/usr/local/sbin/it-laben-update
TimeoutStartSec=30min
UMask=0022
Nice=10
UPDATE
    if [[ ! -f /etc/systemd/system/it-laben-update.timer ]]; then
        cat > /etc/systemd/system/it-laben-update.timer <<'TIMER'
# Managed by IT-laben main deploy v1
[Unit]
Description=Se etter ny IT-laben på main
[Timer]
OnBootSec=1min
OnUnitInactiveSec=2min
Unit=it-laben-update.service
[Install]
WantedBy=timers.target
TIMER
    fi
    cat > /etc/systemd/system/it-laben-backup.service <<'BACKUP'
# Managed by IT-laben main deploy v1
[Unit]
Description=Konsistent SQLite-backup av IT-laben
ConditionPathExists=/srv/it-laben/api-current/server/backup.js
[Service]
Type=oneshot
User=itlab
Group=itlab
EnvironmentFile=/etc/it-laben-api.env
ExecStart=/usr/local/sbin/it-laben-backup
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/it-laben /var/backups/it-laben/database
BACKUP
    cat > /etc/systemd/system/it-laben-backup.timer <<'BACKUPTIMER'
# Managed by IT-laben main deploy v1
[Unit]
Description=Daglig IT-laben-backup
[Timer]
OnCalendar=*-*-* 03:00:00
RandomizedDelaySec=15min
Persistent=true
Unit=it-laben-backup.service
[Install]
WantedBy=timers.target
BACKUPTIMER
    setup_nginx > "$nginx_site"
    ln -sfn -- "$nginx_site" "$nginx_enabled"
    nginx -t
    systemctl daemon-reload
    systemctl reload nginx
    systemctl enable --now it-laben-update.timer
    systemctl enable --now it-laben-backup.timer
    trap - ERR INT TERM HUP
    printf '\nOppsett ferdig. Timeren henter fortsatt main. Backup av serveroppsett: %s\n' "$setup_backup"
    printf 'Når backend er merget til main, publiseres API og nettside automatisk.\nAdresse: %s\n' "$DEPLOY_ORIGIN"
    printf 'Se logger: sudo journalctl -u it-laben-update.service -n 80 --no-pager\n'
}

# grep finnes på standard Ubuntu; rg er ikke en forutsetning på serveren.
setup_is_managed() { grep -Fxq '# Managed by IT-laben main deploy v1'; }

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
    setup_main "$@"
fi
