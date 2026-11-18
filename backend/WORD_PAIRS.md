# Chinese word and example pairs

The repository contains exact catalogs for all 4,997 HSK 1–6 words in
`onetask_dump.sql`:

- `data/hsk4_word_pairs.json`: 601 HSK 4 cards. The older `hsk4_data.sql`
  and `hsk4_data_fix.sql` had shifted word IDs. Do not reapply them.
- `data/hsk35_word_pairs.json`: 299 HSK 3 and 1,300 HSK 5 cards.
- `data/hsk126_word_pairs.json`: 149 HSK 1, 148 HSK 2 and 2,500 HSK 6 cards.
  The tracked dump lacked example pinyin for these 2,797 cards, so the catalog
  contains a generated and context-corrected transcription for every example.

The builders are `build_hsk4_pair_catalog.py`, `build_hsk35_pair_catalog.py`
and `build_hsk126_pair_catalog.py`. Run them from the repository root after
installing `pypinyin`. Reviewed exceptions cover polyphonic words, neutral
particles, tone changes for 一/不, erhua and sentence replacements. A generated
reading is not a substitute for a human recording or professional proofread.

`python backend/audit_chinese_source_pairs.py` checks all 4,997 catalog IDs
against the dump and verifies example presence, target inclusion, syllable
alignment, target word reading and target tones. The HSK 1/2/6 generator applies
its own context rules before this structural audit; the audit does not
independently prove every non-target character's pronunciation.

On backend startup, `migrate.py` reconciles all three catalogs with the
database. It verifies the complete catalog's IDs, levels, Chinese words and
allowed legacy pinyin before applying any changes. Reconciliation is
transactional, idempotent and runs even if an earlier marker exists. It repairs
the matching Chinese example and pinyin; reviewed Korean translations and
meanings are repaired where recorded. Unreviewed Korean translation edits are
preserved when the Chinese sentence still matches. If the database has a
partial or different import, the catalog is skipped and a warning is logged.
Do not change word IDs manually to force a match.

The card, search, quiz and daily-quiz API views use the canonical catalog text
when a verified database row is stale. If the ID, level, Chinese word or legacy
reading does not match, the card's untrusted example is hidden. Images continue
to require a matching word fingerprint; a shifted image must not be attached
by ID alone.

After `git pull` on the server, rebuild the backend image and audit the live DB:

```sh
docker compose up -d --build backend
docker compose exec -T backend python chinese_pair_db_audit.py
docker compose exec -T backend python chinese_pair_db_audit.py --word 脱
```

The audit is read-only and reports all missing, extra, identity and content
mismatches. A zero result demonstrates database/catalog agreement; inspect the
site cards separately to verify the deployed frontend and image presentation.
`git pull` alone does not replace a running container image. No manual SQL is
needed for the catalog migration.
