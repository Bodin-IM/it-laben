#!/usr/bin/env bash
# Flytt en eksisterende main-installasjon til DNS-navn og standardportene.
set -Eeuo pipefail

origin_die() { printf 'FEIL: %s\n' "$*" >&2; return 1; }
origin_paths() {
    ORIGIN_config=/etc/it-laben-deploy.conf
    ORIGIN_env=/etc/it-laben-api.env
    ORIGIN_site=/etc/nginx/sites-available/it-laben-https
    ORIGIN_enabled=/etc/nginx/sites-enabled/it-laben-https
    ORIGIN_cert=/etc/ssl/it-laben/server.crt
    ORIGIN_key=/etc/ssl/it-laben/server.key
    ORIGIN_ca=/root/it-laben-ca
    ORIGIN_public_ca=/etc/ssl/it-laben/root-ca.crt
    ORIGIN_backups=/var/backups/it-laben/origin
    ORIGIN_lock=/run/lock/it-laben-deploy.lock
    ORIGIN_port=443
}
origin_validate() {
    ORIGIN_host=${ORIGIN_host,,}
    [[ "$ORIGIN_host" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ && "$ORIGIN_host" == *.* && "$ORIGIN_host" != *..* ]] || origin_die 'Oppgi et fullt DNS-navn med --name.'
    local -a octets
    local octet
    [[ "$ORIGIN_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || origin_die 'Oppgi serverens IPv4-adresse med --ip.'
    IFS=. read -r -a octets <<< "$ORIGIN_ip"
    for octet in "${octets[@]}"; do
        [[ ${#octet} -le 3 && "$octet" == "$((10#$octet))" && $((10#$octet)) -le 255 ]] || origin_die 'Ugyldig IPv4-adresse.'
    done
    ORIGIN_target="https://$ORIGIN_host"
}
origin_owned() {
    local path=$1
    [[ -f "$path" && ! -L "$path" && $(stat -c %u "$path") == 0 && -z $(find "$path" -perm /022 -print) ]] || origin_die "Forventet en root-eid fil som andre ikke kan endre: $path"
}
origin_health() {
    local reply
    reply=$(curl --noproxy "$1" --fail --silent --show-error --max-time 5 \
        --cacert "$ORIGIN_public_ca" --resolve "$1:$2:127.0.0.1" "$3/api/health") || return 1
    [[ "$reply" == '{"ok":true}' ]]
}
origin_check() {
    origin_validate
    local file
    for file in "$ORIGIN_config" "$ORIGIN_env" "$ORIGIN_site" "$ORIGIN_cert" "$ORIGIN_key" "$ORIGIN_ca/root-ca.crt" "$ORIGIN_ca/root-ca.key" "$ORIGIN_public_ca"; do origin_owned "$file"; done
    [[ -L "$ORIGIN_enabled" && $(readlink "$ORIGIN_enabled") == "$ORIGIN_site" ]] || origin_die 'Fant ikke installatørens Nginx-lenke.'
    head -n 1 "$ORIGIN_site" | grep -Fxq '# Managed by IT-laben main deploy v1' || origin_die 'HTTPS-oppsettet er ikke fra IT-labens installatør.'
    # shellcheck source=/dev/null
    source "$ORIGIN_config"
    [[ -x "$DEPLOY_NODE" && "$DEPLOY_HTTPS_PORT" =~ ^[0-9]+$ && "$DEPLOY_HOST" =~ ^[a-zA-Z0-9.-]+$ ]] || origin_die 'Uventet publiseringskonfigurasjon.'
    [[ "$DEPLOY_ORIGIN" == "https://$DEPLOY_HOST:$DEPLOY_HTTPS_PORT" || ( "$DEPLOY_HTTPS_PORT" == 443 && "$DEPLOY_ORIGIN" == "https://$DEPLOY_HOST" ) ]] || origin_die 'Adresse, vertsnavn og port i publiseringsoppsettet avviker.'
    ORIGIN_old=$DEPLOY_ORIGIN; ORIGIN_old_host=$DEPLOY_HOST; ORIGIN_old_port=$DEPLOY_HTTPS_PORT
    [[ $(grep -c '^APP_ORIGIN=' "$ORIGIN_env") == 1 ]] || origin_die 'Forventet én APP_ORIGIN.'
    grep -Fxq "APP_ORIGIN=$ORIGIN_old" "$ORIGIN_env" || origin_die 'API-adressen avviker fra publiseringsoppsettet.'
    grep -Fxq "ITLAB_DB_PATH=$DEPLOY_DATA/it-laben.sqlite" "$ORIGIN_env" || origin_die 'Uventet databasesti. Behold den eksisterende databasen.'
    grep -Fxq 'API_PORT=3001' "$ORIGIN_env" || origin_die 'Forventet internt API på port 3001.'
    [[ -f "$DEPLOY_BASE/api-current/server/backup.js" && -f "$DEPLOY_WEB/current/index.html" && -f "$DEPLOY_DATA/it-laben.sqlite" ]] || origin_die 'Forventet et publisert API, nettsted og eksisterende database.'
    [[ "$DEPLOY_CA" == "$ORIGIN_public_ca" ]] || origin_die 'Oppsettet bruker en annen CA. Dette skriptet er for IT-labens lokale CA.'
    openssl verify -CAfile "$ORIGIN_ca/root-ca.crt" "$ORIGIN_cert" >/dev/null
    openssl verify -CAfile "$ORIGIN_public_ca" "$ORIGIN_cert" >/dev/null
    openssl x509 -in "$ORIGIN_ca/root-ca.crt" -noout -checkend 31536000 >/dev/null || origin_die 'CA-en må vare lenger enn det nye ettårige serversertifikatet.'
    local public private
    public=$(openssl x509 -in "$ORIGIN_ca/root-ca.crt" -outform DER | sha256sum)
    private=$(openssl x509 -in "$ORIGIN_public_ca" -outform DER | sha256sum)
    [[ "$public" == "$private" ]] || origin_die 'Serveren og klientfilen bruker forskjellige CA-sertifikater.'
    public=$(openssl x509 -in "$ORIGIN_cert" -noout -pubkey | openssl pkey -pubin -outform DER | sha256sum)
    private=$(openssl pkey -in "$ORIGIN_key" -passin pass: -pubout -outform DER | sha256sum)
    [[ "$public" == "$private" ]] || origin_die 'Serversertifikat og nøkkel hører ikke sammen.'
    public=$(openssl x509 -in "$ORIGIN_ca/root-ca.crt" -noout -pubkey | openssl pkey -pubin -outform DER | sha256sum)
    private=$(openssl pkey -in "$ORIGIN_ca/root-ca.key" -passin pass: -pubout -outform DER | sha256sum)
    [[ "$public" == "$private" ]] || origin_die 'CA-sertifikat og nøkkel hører ikke sammen.'
    nginx -t
    systemctl is-active --quiet it-laben-api.service || origin_die 'API-et må fungere før adressebyttet.'
    origin_health "$ORIGIN_old_host" "$ORIGIN_old_port" "$ORIGIN_old" || origin_die 'Eksisterende HTTPS/API består ikke helsesjekken.'
    if [[ "$ORIGIN_old" != "$ORIGIN_target" && -n $(ss -H -ltn 'sport = :443') ]]; then origin_die 'Port 443 er allerede i bruk. Ingen filer er endret.'; fi
    local http_listener
    http_listener=$(ss -H -ltnp 'sport = :80')
    [[ -z "$http_listener" || "$http_listener" == *'"nginx"'* ]] || origin_die 'En annen tjeneste enn Nginx bruker port 80.'
    # Preserve every existing DNS/IP SAN, including the old address used for redirects.
    ORIGIN_san=$("$DEPLOY_NODE" --input-type=module - "$ORIGIN_host" "$ORIGIN_ip" "$(openssl x509 -in "$ORIGIN_cert" -noout -ext subjectAltName)" <<'JS'
import { isIP } from 'node:net';
const [name,ip,extension] = process.argv.slice(2);
const previous = extension.split('\n').slice(1).join('').split(',').map(s => s.trim()).filter(Boolean).map(s => {
    if (/^DNS:[a-zA-Z0-9*.-]+$/.test(s)) return s;
    const match = s.match(/^IP Address:\s*(.+)$/);
    if (match && isIP(match[1])) return 'IP:'+match[1];
    throw new Error('Sertifikatet har en SAN-type som må vurderes manuelt.');
});
console.log([...new Set([...previous,'DNS:'+name,'IP:'+ip])].join(','));
JS
    )
    printf 'Kontroll OK: %s → %s (80 videresender, API forblir lokalt).\n' "$ORIGIN_old" "$ORIGIN_target"
}
origin_certificate() {
    openssl req -new -sha256 -key "$ORIGIN_key" -subj "/CN=$ORIGIN_host" -out "$ORIGIN_stage/server.csr"
    cat > "$ORIGIN_stage/server.ext" <<EXT
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=$ORIGIN_san
EXT
    openssl x509 -req -sha256 -days 365 -in "$ORIGIN_stage/server.csr" \
        -CA "$ORIGIN_ca/root-ca.crt" -CAkey "$ORIGIN_ca/root-ca.key" \
        -set_serial "0x$(openssl rand -hex 16)" -extfile "$ORIGIN_stage/server.ext" -out "$ORIGIN_stage/server.crt"
    openssl verify -purpose sslserver -CAfile "$ORIGIN_public_ca" "$ORIGIN_stage/server.crt"
    openssl x509 -in "$ORIGIN_stage/server.crt" -noout -checkhost "$ORIGIN_host"
    openssl x509 -in "$ORIGIN_stage/server.crt" -noout -checkip "$ORIGIN_ip"
}
origin_nginx() {
    cat <<NGINX
# Managed by IT-laben main deploy v1
# Canonical origin configured by change-origin.sh
server {
    listen 80;
    server_name $ORIGIN_host;
    return 308 $ORIGIN_target\$request_uri;
}
server {
    listen 443 ssl;
    server_name $ORIGIN_host;
    ssl_certificate $ORIGIN_cert;
    ssl_certificate_key $ORIGIN_key;
    ssl_protocols TLSv1.2 TLSv1.3;
    root $DEPLOY_WEB/current;
    index index.html;
    client_max_body_size 16k;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-Frame-Options DENY always;
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        add_header Cache-Control no-store always;
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
    }
}
NGINX
    if [[ "$ORIGIN_old_port" != 443 ]]; then
        cat <<NGINX
server {
    listen $ORIGIN_old_port ssl;
    server_name $ORIGIN_old_host;
    ssl_certificate $ORIGIN_cert;
    ssl_certificate_key $ORIGIN_key;
    ssl_protocols TLSv1.2 TLSv1.3;
    return 308 $ORIGIN_target\$request_uri;
}
NGINX
    fi
}
origin_configs() {
    sed "s#^APP_ORIGIN=.*#APP_ORIGIN=$ORIGIN_target#" "$ORIGIN_env" > "$ORIGIN_stage/api.env"
    sed -e "s#^DEPLOY_ORIGIN=.*#DEPLOY_ORIGIN=$ORIGIN_target#" \
        -e "s#^DEPLOY_HOST=.*#DEPLOY_HOST=$ORIGIN_host#" \
        -e 's#^DEPLOY_HTTPS_PORT=.*#DEPLOY_HTTPS_PORT=443#' "$ORIGIN_config" > "$ORIGIN_stage/deploy.conf"
    origin_nginx > "$ORIGIN_stage/nginx.conf"
}
origin_verify_target() {
    origin_health "$ORIGIN_host" "$ORIGIN_port" "$ORIGIN_target" || return 1
    local status
    # A write without a session must reach authentication, rather than fail Origin.
    status=$(curl --noproxy "$ORIGIN_host" --silent --show-error --max-time 5 \
        --cacert "$ORIGIN_public_ca" --resolve "$ORIGIN_host:$ORIGIN_port:127.0.0.1" \
        -H "Origin: $ORIGIN_target" -H 'Content-Type: application/json' \
        --data '{}' --output /dev/null --write-out '%{http_code}' "$ORIGIN_target/api/me/lab") || return 1
    [[ "$status" == 401 ]] || return 1
    status=$(curl --noproxy "$ORIGIN_host" --silent --show-error --max-time 5 \
        --resolve "$ORIGIN_host:80:127.0.0.1" --output /dev/null --write-out '%{http_code}' "http://$ORIGIN_host/") || return 1
    [[ "$status" == 308 ]] || return 1
    curl --noproxy "$ORIGIN_host" --fail --silent --show-error --max-time 5 \
        --cacert "$ORIGIN_public_ca" --resolve "$ORIGIN_host:$ORIGIN_port:127.0.0.1" --output /dev/null "$ORIGIN_target/"
}
origin_failed() {
    local status=$1 restored=1
    trap - ERR INT TERM HUP
    set +e
    if [[ "${ORIGIN_changed:-0}" == 1 ]]; then
        local file
        for file in "${ORIGIN_files[@]}"; do
            if [[ -f "$ORIGIN_backup/files$file" ]]; then cp -a -- "$ORIGIN_backup/files$file" "$file" || restored=0;
            else rm -f -- "$file" || restored=0; fi
        done
        nginx -t && systemctl reload nginx || restored=0
        systemctl restart it-laben-api.service || restored=0
        local attempt recovered=0
        for ((attempt=0; attempt<10; attempt++)); do
            if origin_health "$ORIGIN_old_host" "$ORIGIN_old_port" "$ORIGIN_old"; then recovered=1; break; fi
            sleep 1
        done
        [[ "$recovered" == 1 ]] || restored=0
    fi
    if [[ "$restored" == 1 && "${ORIGIN_timer_active:-0}" == 1 ]]; then systemctl start it-laben-update.timer || restored=0; fi
    printf 'Adressebyttet feilet. Eksisterende database er beholdt. Konfigurasjonsbackup: %s\n' "${ORIGIN_backup:-ikke opprettet}" >&2
    [[ "$restored" == 1 ]] || printf 'Tilbakeføring må kontrolleres manuelt. Oppdateringstimeren er ikke friskmeldt.\n' >&2
    exit "$status"
}
origin_apply() {
    ORIGIN_changed=0; ORIGIN_timer_active=0
    if systemctl is-active --quiet it-laben-update.timer; then ORIGIN_timer_active=1; fi
    trap 'origin_failed "$?"' ERR
    trap 'origin_failed 130' INT
    trap 'origin_failed 143' TERM HUP
    systemctl stop it-laben-update.timer
    exec 9>"$ORIGIN_lock"
    flock -n 9 || origin_die 'En publisering kjører. Vent til den er ferdig, og kjør på nytt.'
    # Recheck under the same lock used by automatic main deployment.
    origin_check
    ORIGIN_backup="$ORIGIN_backups/$(date -u +%Y%m%dT%H%M%S)-$$"
    ORIGIN_stage="$ORIGIN_backup/staged"
    install -d -m 0700 "$ORIGIN_stage" "$ORIGIN_backup/files"
    ORIGIN_files=("$ORIGIN_env" "$ORIGIN_config" "$ORIGIN_site" "$ORIGIN_cert" "$ORIGIN_ca/server.csr" "$ORIGIN_ca/server.ext")
    local file
    for file in "${ORIGIN_files[@]}"; do
        if [[ -f "$file" ]]; then
            mkdir -p -- "$ORIGIN_backup/files$(dirname "$file")"
            cp -a -- "$file" "$ORIGIN_backup/files$file"
        fi
    done
    origin_certificate
    origin_configs
    runuser -u "$DEPLOY_USER" -- env ITLAB_DB_PATH="$DEPLOY_DATA/it-laben.sqlite" \
        "$DEPLOY_NODE" "$DEPLOY_BASE/api-current/server/backup.js" "$DEPLOY_BACKUPS/before-origin-$(basename "$ORIGIN_backup").sqlite"
    ORIGIN_changed=1
    install -o root -g root -m 0644 "$ORIGIN_stage/server.crt" "$ORIGIN_cert"
    install -o root -g root -m 0600 "$ORIGIN_stage/server.csr" "$ORIGIN_ca/server.csr"
    install -o root -g root -m 0600 "$ORIGIN_stage/server.ext" "$ORIGIN_ca/server.ext"
    install -o root -g root -m 0600 "$ORIGIN_stage/api.env" "$ORIGIN_env"
    install -o root -g root -m 0600 "$ORIGIN_stage/deploy.conf" "$ORIGIN_config"
    install -o root -g root -m 0644 "$ORIGIN_stage/nginx.conf" "$ORIGIN_site"
    # nginx -t can return success with duplicate-server warnings; refuse those too.
    nginx -t 2> "$ORIGIN_stage/nginx-check.log"
    if grep -q 'conflicting server name' "$ORIGIN_stage/nginx-check.log"; then origin_die 'Nginx har et motstridende servernavn. Forrige oppsett gjenopprettes.'; fi
    systemctl restart it-laben-api.service
    systemctl reload nginx
    local attempt healthy=0
    for ((attempt=0; attempt<15; attempt++)); do
        if origin_verify_target; then healthy=1; break; fi
        sleep 1
    done
    [[ "$healthy" == 1 ]] || origin_die 'Ny HTTPS-adresse eller API-Origin består ikke helsesjekken.'
    [[ "$ORIGIN_timer_active" != 1 ]] || systemctl start it-laben-update.timer
    trap - ERR INT TERM HUP
    printf '\nAdressebytte ferdig: %s\nSamme CA, database og publiserte main-versjon er beholdt.\nBackup: %s\n' "$ORIGIN_target" "$ORIGIN_backup"
    printf 'Test DNS og HTTPS fra begge elevnett. Tillat TCP 80/443 i eventuelle brannmurer.\n'
    if [[ "$ORIGIN_timer_active" == 1 ]]; then printf 'Automatisk oppdatering fra main fortsetter.\n';
    else printf 'Oppdateringstimeren var pauset og er fortsatt pauset. Start den igjen når publiseringen er klar.\n'; fi
}
origin_main() {
    origin_paths
    local check=0 command
    ORIGIN_host=''; ORIGIN_ip=''
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --name|--ip)
                [[ $# -ge 2 && -n "$2" ]] || origin_die "Mangler verdi etter $1."
                if [[ "$1" == --name ]]; then ORIGIN_host=$2; else ORIGIN_ip=$2; fi
                shift 2 ;;
            --check) check=1; shift ;;
            -h|--help) printf 'Bruk: sudo bash change-origin.sh --name itlab.im.local --ip 10.100.0.14 [--check]\n'; return 0 ;;
            *) origin_die "Ukjent argument: $1" ;;
        esac
    done
    [[ $EUID -eq 0 ]] || origin_die 'Kjør med sudo på Ubuntu-serveren.'
    umask 077
    for command in openssl nginx systemctl curl ss flock runuser sed grep stat find sha256sum; do command -v "$command" >/dev/null || origin_die "Mangler $command."; done
    origin_check
    [[ "$check" != 1 ]] || return 0
    if [[ "$ORIGIN_old" == "$ORIGIN_target" ]]; then
        origin_verify_target
        printf 'Serveren bruker allerede %s. Ingen filer er endret.\n' "$ORIGIN_target"
        return 0
    fi
    origin_apply
}
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then origin_main "$@"; fi
