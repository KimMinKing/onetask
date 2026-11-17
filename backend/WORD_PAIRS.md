# Chinese word/example pairs

`data/hsk4_word_pairs.json` is the reviewed HSK 4 catalog for the 601 IDs in
`onetask_dump.sql`. The source updates in `hsk4_data.sql` and
`hsk4_data_fix.sql` had shifted IDs; the old production fix also paired some
Chinese sentences with pinyin for *different* sentences. Do not reapply those
SQL files as a word-pair fix.

Run `pip install pypinyin` and `python backend/build_hsk4_pair_catalog.py` to
rebuild the catalog. The generator joins the source sentence to the pinyin for
that exact sentence from the original dump, then uses explicitly reviewed
exceptions for ambiguous or unsuitable examples. It checks that every HSK 4
word occurs in its example. The `厉害` example is transcribed explicitly so
`说得` is `shuō de`, `厉害` is `lì hai`, and `一样` is `yí yàng`.

`python backend/audit_chinese_source_pairs.py` checks each tracked sentence
against its pinyin after applying the HSK 4 catalog and ten HSK 3/5 corrections.
Install `pypinyin` locally for this source audit. The HSK 3/5 catalog is built
with `python backend/build_hsk35_pair_catalog.py` from the exact dump sentences.

`python migrate.py` compares all 601 HSK 4 and 1,599 HSK 3/5 catalog rows on
every backend startup. It repairs changed content even when the old migration
marker is already present. Word IDs, word readings and review cards remain
unchanged; all expected identities must match before a catalog is applied.
Both reconciliations are transactional and idempotent. If an operating database
has a different import or partial word set, the migration skips the catalog;
investigate its identities before changing IDs by hand.
For HSK 3/5, a changed Chinese sentence also restores its matching Korean
translation; a pinyin-only correction preserves the current translation.
Unreviewed translation edits are not reset just because they differ from the
dump.

After rebuilding the backend image, run
`docker compose exec -T backend python hsk4_pair_audit.py` from the repository
root to compare **all 601** production HSK 4 rows with the catalog. Also run
`docker compose exec -T backend python chinese_pair_db_audit.py` to compare
all 2,200 HSK 3/4/5 rows and report example/pinyin coverage at other levels.
These commands are read-only. They report missing/extra IDs, word-identity
mismatches, and mismatched Chinese/Korean examples and example pinyin. Keep the
audit output if identities differ. `git pull` alone does not replace the running
backend image; use `docker compose up -d --build backend`.

After the HSK 4 correction, 480 of 601 catalog entries match existing legacy
image fingerprints in the repository. The remaining images are deliberately
hidden by `verified_image`; do not relink images solely by row ID. Inspect or
regenerate those images for the corrected word before making them visible.

The tracked dump has Chinese examples but no example pinyin for 149 HSK 1,
148 HSK 2 and 2,500 HSK 6 entries. These are missing transcriptions, not
verified pairs. HSK 6 has eight examples that use a related expression instead
of the exact target: 3892 `受罪`, 3247 `举动`, 3382 `谅解`, 2710 `恶心`,
2812 `福气`, 2846 `港口`, 3435 `埋葬`, 4284 `压榨`. Three more split the
target around a particle or complement: 3239 `鞠躬`, 2523 `出洋相`, 2575
`打官司`. Also review HSK 2 ID 4868 `长`: its current example uses `长辈`
(zhǎng), while the taught reading is `cháng` (long). Review these sentences
and pronunciations before adding missing pinyin. Run the backend tests and
`audit_word_images.py` against the real database after deployment.
