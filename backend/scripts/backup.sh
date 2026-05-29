#!/bin/bash
# AmbientTV SQLite Backup Script
# Runs via cron: 0 3 * * * /path/to/backup.sh

DB_FILE="${DB_FILE:-/root/.openclaw/workspace/AmbientTV/backend/data/users.db}"
BACKUP_DIR="${BACKUP_DIR:-/root/.openclaw/workspace/AmbientTV/backend/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_FILE" ]; then
  echo "[ERROR] Database not found: $DB_FILE"
  exit 1
fi

# Create backup
BACKUP_FILE="$BACKUP_DIR/users_$TIMESTAMP.db"
cp "$DB_FILE" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "[OK] Backup created: $BACKUP_FILE"
  # Compress
  gzip -f "$BACKUP_FILE"
  echo "[OK] Compressed: ${BACKUP_FILE}.gz"
else
  echo "[ERROR] Backup failed"
  exit 1
fi

# Delete old backups
find "$BACKUP_DIR" -name "users_*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "[OK] Cleanup complete. Retention: $RETENTION_DAYS days"
