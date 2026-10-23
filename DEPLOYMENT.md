# onetask deployment runbook

Run these commands from the repository root on the Ubuntu server.

## 1. Configure secrets

```bash
cp -n .env.example .env
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

Put the two independent generated values in `SECRET_KEY` and `BOOTSTRAP_TOKEN`,
set a strong `POSTGRES_PASSWORD`, and set `APP_BASE_URL` to the public HTTPS site
URL. Use `NEXT_PUBLIC_API_URL=http://backend:8000` for the Next.js server's
internal proxy. Keep `COOKIE_SECURE=true` in production. The database has no
published host port and the API port binds to `127.0.0.1:8001`; serve the
frontend through your HTTPS reverse proxy. Only one scheduler cluster is needed; PostgreSQL advisory locks
prevent duplicate jobs if the backend is temporarily started more than once.
Keep `.env` and `backend/.env` outside Git.

On a new installation, the first account needs the `BOOTSTRAP_TOKEN` value in
the signup form. Existing installations with a user do not need to sign up
again. Do not put this token in client build variables or logs.

This release removes a compromised historical translation dependency. Rotate
`SECRET_KEY`, the database password, and any external API credentials before
the first production rebuild. Changing `SECRET_KEY` invalidates existing login
cookies and encrypted Telegram tokens, so reconnect Telegram after deployment.
The committed `onetask_dump.sql` files were removed from current Git tracking,
but remain in earlier commits. Check where this repository and its clones were
shared, reset the account password from that dump, and coordinate any history
cleanup before force-pushing. Removing current files alone does not erase old
commits.

## 2. Back up PostgreSQL

Always create a backup before pulling a release that changes the schema.

```bash
mkdir -p backups
docker compose exec -T db pg_dump \
  -U "${POSTGRES_USER:-tradediary}" \
  -d "${POSTGRES_DB:-onetask}" \
  --format=custom > "backups/onetask-$(date +%Y%m%d-%H%M%S).dump"
```

Confirm that the resulting dump file is not empty before continuing.

## 3. Deploy

```bash
git pull --ff-only
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
curl --fail http://127.0.0.1:8001/health
```

The backend container runs `python migrate.py` before starting Uvicorn; a
failed migration prevents the API from starting. PostgreSQL advisory locking
serializes simultaneous migration attempts. Existing learning cards are
assigned to the master account when upgrading from the old shared-progress
schema. For local development outside Docker, run `python backend/migrate.py`
before starting Uvicorn from the `backend` directory.
The backend Docker build installs the Python 3.11 dependency set pinned and
SHA-256 hashed in `backend/requirements.lock` with `--require-hashes`. When
direct dependencies in `backend/requirements.txt` change, regenerate the lock
with Python 3.11 and `pip-compile --generate-hashes`, review it, and rebuild.

For the HSK 4 sentence/pinyin correction, rebuilding the backend is required:
`git pull` alone leaves the old container running. Check the complete 601-word
database state with `docker compose exec -T backend python hsk4_pair_audit.py`.
The audit is read-only and prints the migration marker and mismatch counts.
Do not reapply `hsk4_data.sql` or `hsk4_data_fix.sql`; their IDs were shifted.

The A1 English meaning/example correction also runs from `migrate.py` when the
rebuilt backend starts. `git pull` alone does not update the running container;
follow the build and `up -d` steps above. Do not rerun the historical
`fix_english_production.sql`, which contains the incorrect `about = 소개` row.

## 4. Inspect failures

```bash
docker compose logs --tail=200 backend frontend db
```

Do not repeatedly restart a failed migration. Preserve the database volume and
inspect the first backend error.

## 5. Restore a backup

Restoration replaces database contents. Stop the app first and select the exact
backup file explicitly.

```bash
docker compose stop backend
docker compose exec -T db dropdb -U "${POSTGRES_USER:-tradediary}" --if-exists "${POSTGRES_DB:-onetask}"
docker compose exec -T db createdb -U "${POSTGRES_USER:-tradediary}" "${POSTGRES_DB:-onetask}"
docker compose exec -T db pg_restore \
  -U "${POSTGRES_USER:-tradediary}" \
  -d "${POSTGRES_DB:-onetask}" \
  --clean --if-exists < backups/SELECTED_BACKUP.dump
docker compose start backend
```
