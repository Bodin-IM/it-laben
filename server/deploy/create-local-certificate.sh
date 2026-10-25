#!/usr/bin/env bash
set -Eeuo pipefail

certificate_die() { printf 'FEIL: %s\n' "$*" >&2; exit 1; }

certificate_validate() {
    [[ -n "$certificate_name" || -n "$certificate_ip" ]] || certificate_die 'Oppgi --ip SERVER_IP og/eller --name im.local.'
    [[ -z "$certificate_name" || "$certificate_name" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ ]] || certificate_die 'Ugyldig DNS-navn.'
    if [[ -n "$certificate_ip" ]]; then
        local -a octets
        local octet
        [[ "$certificate_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || certificate_die 'Bruk en IPv4-adresse.'
        IFS=. read -r -a octets <<< "$certificate_ip"
        for octet in "${octets[@]}"; do
            [[ ${#octet} -le 3 && "$octet" == "$((10#$octet))" && $((10#$octet)) -le 255 ]] || certificate_die 'Ugyldig IPv4-adresse.'
        done
    fi
}

certificate_create() {
    certificate_validate
    [[ ! -e "$certificate_ca" && ! -e "$certificate_out" ]] || certificate_die 'Sertifikat- eller CA-mappen finnes allerede. Eksisterende nøkler overskrives ikke.'
    local san='' common_name
    common_name=${certificate_name:-$certificate_ip}
    [[ -z "$certificate_name" ]] || san="DNS:$certificate_name"
    if [[ -n "$certificate_ip" ]]; then san="${san:+$san,}IP:$certificate_ip"; fi
    (
        umask 077
        mkdir -p -- "$certificate_ca" "$certificate_out"
        openssl req -x509 -newkey rsa:3072 -sha256 -noenc -days 3650 \
            -subj '/CN=IT-laben lokal CA' \
            -addext 'basicConstraints=critical,CA:TRUE,pathlen:0' \
            -addext 'keyUsage=critical,keyCertSign,cRLSign' \
            -keyout "$certificate_ca/root-ca.key" -out "$certificate_ca/root-ca.crt" 2>/dev/null
        openssl req -new -newkey rsa:3072 -noenc -sha256 \
            -subj "/CN=$common_name" -keyout "$certificate_out/server.key" \
            -out "$certificate_ca/server.csr" 2>/dev/null
        cat > "$certificate_ca/server.ext" <<EXT
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=$san
EXT
        openssl x509 -req -sha256 -days 365 -in "$certificate_ca/server.csr" \
            -CA "$certificate_ca/root-ca.crt" -CAkey "$certificate_ca/root-ca.key" \
            -CAcreateserial -extfile "$certificate_ca/server.ext" -out "$certificate_out/server.crt"
        cp -- "$certificate_ca/root-ca.crt" "$certificate_out/root-ca.crt"
        chmod 0755 "$certificate_out"
        chmod 0644 "$certificate_out/server.crt" "$certificate_out/root-ca.crt"
        openssl verify -CAfile "$certificate_out/root-ca.crt" "$certificate_out/server.crt"
    )
    printf '\nSertifikat laget i %s. Serversertifikatet varer ett år.\n' "$certificate_out"
    printf 'Installer bare den offentlige filen root-ca.crt på klientene.\nCA-privatnøkkelen beholdes i %s.\n' "$certificate_ca"
}

certificate_main() {
    local certificate_name='' certificate_ip=''
    local certificate_ca=/root/it-laben-ca certificate_out=/etc/ssl/it-laben
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --name|--ip)
                [[ $# -ge 2 ]] || certificate_die "Mangler verdi etter $1."
                if [[ "$1" == --name ]]; then certificate_name=$2; else certificate_ip=$2; fi
                shift 2 ;;
            --help|-h)
                printf 'Bruk: sudo bash server/deploy/create-local-certificate.sh --ip SERVER_IP [--name im.local]\n'
                return 0 ;;
            *) certificate_die "Ukjent argument: $1" ;;
        esac
    done
    [[ $EUID -eq 0 ]] || certificate_die 'Kjør med sudo på Ubuntu-serveren.'
    command -v openssl >/dev/null || certificate_die 'Installer openssl først.'
    certificate_create
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
    certificate_main "$@"
fi
