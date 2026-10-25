#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Kjøres som itlab av systemd, med samme EnvironmentFile som API-et.
destination="/var/backups/it-laben/database/daily-$(date -u +%Y%m%dT%H%M%S)-$$.sqlite"
exec /usr/bin/node /srv/it-laben/api-current/server/backup.js "$destination"
