#!/usr/bin/env bash
# Installert som /usr/local/sbin/it-laben-update. Henter alltid main.
set -Eeuo pipefail

deploy_log() { printf '[IT-laben] %s\n' "$*"; }
deploy_die() { deploy_log "FEIL: $*" >&2; exit 1; }
deploy_as_user() { runuser -u "$DEPLOY_USER" -- "$@"; }

deploy_link() {
    local target=$1 link=$2
    ln -s -- "$target" "${link}.next-$$"
    mv -Tf -- "${link}.next-$$" "$link"
}

deploy_api_health() {
    local reply
    reply=$(curl --noproxy 127.0.0.1 --fail --silent --show-error --max-time 3 \
        -H 'X-Forwarded-Proto: https' http://127.0.0.1:3001/api/health) || return 1
    [[ "$reply" == '{"ok":true}' ]]
}

deploy_https_health() {
    local reply ca_args=()
    [[ -z "$DEPLOY_CA" ]] || ca_args=(--cacert "$DEPLOY_CA")
    reply=$(curl --noproxy "$DEPLOY_HOST" --fail --silent --show-error --max-time 5 \
        --resolve "$DEPLOY_HOST:$DEPLOY_HTTPS_PORT:127.0.0.1" "${ca_args[@]}" \
        "$DEPLOY_ORIGIN/api/health") || return 1
    [[ "$reply" == '{"ok":true}' ]]
}

deploy_wait_api() {
    local attempt
    for ((attempt=0; attempt<20; attempt++)); do
        if deploy_api_health; then return 0; fi
        sleep 1
    done
    return 1
}

deploy_failed() {
    local status=$1
    trap - ERR INT TERM HUP
    set +e
    if [[ "${deploy_activation:-0}" == 1 ]]; then
        systemctl stop it-laben-api.service
        if [[ -n "$deploy_old_api" ]]; then
            deploy_link "$deploy_old_api" "$DEPLOY_BASE/api-current"
            if [[ "$deploy_api_was_active" == 1 ]]; then
                systemctl start it-laben-api.service
                if ! deploy_wait_api; then
                    deploy_log 'Forrige API kunne ikke friskmeldes. Kontroller journalctl; skjemaet kan kreve den nye API-versjonen.'
                fi
            fi
        else
            rm -f -- "$DEPLOY_BASE/api-current"
        fi
        if [[ "${deploy_web_switched:-0}" == 1 ]]; then
            if [[ -n "$deploy_old_web" ]]; then
                deploy_link "$deploy_old_web" "$DEPLOY_WEB/current"
            else
                rm -f -- "$DEPLOY_WEB/current"
            fi
        fi
        deploy_log 'Databasebackup gjenopprettes aldri automatisk: det kan slette nye innsendinger.'
        [[ -z "${deploy_backup:-}" ]] || deploy_log "Backup før migrasjon: $deploy_backup"
    fi
    deploy_log 'Publisering avbrutt. Se journalctl -u it-laben-update.service og -u it-laben-api.service.'
    exit "$status"
}

deploy_update() {
    deploy_activation=0
    deploy_web_switched=0
    deploy_backup=''
    deploy_as_user git -C "$DEPLOY_BASE/repo" fetch origin \
        refs/heads/main:refs/remotes/origin/main
    local commit release_name release web_release
    commit=$(deploy_as_user git -C "$DEPLOY_BASE/repo" rev-parse refs/remotes/origin/main)
    # Installasjonen kan gjøres før backend merges. Dagens publisering beholdes.
    if ! deploy_as_user git -C "$DEPLOY_BASE/repo" cat-file -e "$commit:server/index.js" 2>/dev/null; then
        deploy_log "Venter på backend i main ($commit). Nåværende nettside beholdes."
        return 0
    fi
    [[ ! -e "$DEPLOY_BASE/api-current" || -L "$DEPLOY_BASE/api-current" ]] || deploy_die 'api-current må være en symbolsk lenke.'
    [[ ! -e "$DEPLOY_WEB/current" || -L "$DEPLOY_WEB/current" ]] || deploy_die 'Web current må være en symbolsk lenke.'
    if [[ -f "$DEPLOY_WEB/current/.commit" && -f "$DEPLOY_BASE/api-current/.commit" ]] && \
        [[ "$(cat "$DEPLOY_WEB/current/.commit")" == "$commit" && "$(cat "$DEPLOY_BASE/api-current/.commit")" == "$commit" ]]; then
        if ! deploy_api_health || ! deploy_https_health; then
            deploy_die 'Samme commit er publisert, men helsesjekken feiler. Kontroller API, HTTPS og sertifikattillit.'
        fi
        deploy_log "IT-laben er allerede oppdatert: $commit"
        return 0
    fi

    release_name="$(date -u +%Y%m%dT%H%M%S)-${commit:0:12}-$$"
    release="$DEPLOY_BASE/releases/$release_name"
    web_release="$DEPLOY_WEB/releases/$release_name"
    install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0755 "$release"
    deploy_as_user git -C "$DEPLOY_BASE/repo" archive "$commit" | deploy_as_user tar -x -C "$release"
    deploy_log "Bygger og tester main: $commit"
    (
        cd "$release"
        deploy_as_user env -u NODE_ENV "$DEPLOY_NPM" ci --include=dev --cache "$DEPLOY_CACHE"
        deploy_as_user "$DEPLOY_NPM" test
        deploy_as_user "$DEPLOY_NPM" run check
        deploy_as_user "$DEPLOY_NPM" run build
    )
    [[ -f "$release/build/index.html" && -f "$release/build/min-lab/index.html" ]] || deploy_die 'Bygget mangler forsiden eller Min lab.'
    install -d -m 0755 "$web_release"
    cp -a -- "$release/build/." "$web_release/"
    printf '%s\n' "$commit" > "$web_release/.commit"
    printf '%s\n' "$commit" > "$release/.commit"
    chown -R root:root "$release" "$web_release"
    chmod -R a+rX "$release" "$web_release"

    # Ingen aktiv tjeneste eller publisert lenke endres før alle byggetester består.
    deploy_old_api=$(readlink -f "$DEPLOY_BASE/api-current" 2>/dev/null || true)
    deploy_old_web=$(readlink -f "$DEPLOY_WEB/current" 2>/dev/null || true)
    [[ -L "$DEPLOY_BASE/api-current" ]] || deploy_old_api=''
    [[ -L "$DEPLOY_WEB/current" ]] || deploy_old_web=''
    deploy_api_was_active=0
    if systemctl is-active --quiet it-laben-api.service; then deploy_api_was_active=1; fi
    deploy_activation=1
    systemctl stop it-laben-api.service
    # Tjenesten er stoppet, så backup inneholder også de siste godkjente svarene.
    if [[ -f "$DEPLOY_DATA/it-laben.sqlite" ]]; then
        deploy_backup="$DEPLOY_BACKUPS/before-$release_name.sqlite"
        deploy_as_user env ITLAB_DB_PATH="$DEPLOY_DATA/it-laben.sqlite" \
            "$DEPLOY_NODE" "$release/server/backup.js" "$deploy_backup"
    fi
    deploy_link "$release" "$DEPLOY_BASE/api-current"
    # API-oppstart kjører de sjekksumbeskyttede migrasjonene.
    systemctl start it-laben-api.service
    deploy_wait_api
    deploy_https_health
    deploy_link "$web_release" "$DEPLOY_WEB/current"
    deploy_web_switched=1
    systemctl enable it-laben-api.service
    deploy_activation=0
    deploy_log "Publisert: $commit fra main. Adresse: $DEPLOY_ORIGIN"
}

deploy_main() {
    [[ $EUID -eq 0 ]] || deploy_die 'Kjør med sudo, eller gjennom it-laben-update.service.'
    local config=/etc/it-laben-deploy.conf
    [[ -f "$config" && ! -L "$config" ]] || deploy_die "Mangler $config. Kjør install-main.sh først."
    [[ $(stat -c %u "$config") == 0 && -z $(find "$config" -perm /022 -print) ]] || deploy_die 'Deploykonfigurasjonen må eies av root og ikke være skrivbar for andre.'
    # shellcheck source=/dev/null
    source "$config"
    exec 9>/run/lock/it-laben-deploy.lock
    flock -n 9 || { deploy_log 'En annen publisering kjører allerede.'; return 0; }
    trap 'deploy_failed "$?"' ERR
    trap 'deploy_failed 130' INT
    trap 'deploy_failed 143' TERM
    trap 'deploy_failed 129' HUP
    deploy_update
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
    deploy_main "$@"
fi
