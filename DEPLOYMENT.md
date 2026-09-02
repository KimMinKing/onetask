# onetask deployment runbook

Run these commands from the repository root on the Ubuntu server.

## 1. Configure secrets

```bash
cp -n .env.example .env
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

Put the generated value in `SECRET_KEY`, set a strong `POSTGRES_PASSWORD`, and
set `APP_BASE_URL` to the public HTTPS site URL. Keep `COOKIE_SECURE=true` in
production. Only one scheduler cluster is needed; PostgreSQL advisory locks
prevent duplicate jobs if the backend is temporarily started more than once.
Keep `.env` and `backend/.env` outside Git.

This release removes a compromised historical translation dependency. Rotate
`SECRET_KEY`, the database password, and any external API credentials before
the first production rebuild. Changing `SECRET_KEY` invalidates existing login
cookies and encrypted Telegram tokens, so reconnect Telegram after deployment.

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

The backend performs compatible runtime migrations during startup. Existing
learning cards are assigned to the master account when upgrading from the old
shared-progress schema.

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
