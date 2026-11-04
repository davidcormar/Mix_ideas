#!/usr/bin/env bash
# Daily restic backup. Install: chmod +x backup.sh && (crontab -l; echo "0 3 * * * $HOME/servicios/backup.sh >> $HOME/backup.log 2>&1") | crontab -
set -euo pipefail
export RESTIC_REPOSITORY=/mnt/backup/restic
export RESTIC_PASSWORD_FILE="$HOME/.restic-pass"   # chmod 600; keep a copy of this password OFF the server
restic backup "$HOME/servicios" /srv/fotos --exclude '**/cache'
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
restic check --read-data-subset=5%
echo "backup OK $(date -Is)"
