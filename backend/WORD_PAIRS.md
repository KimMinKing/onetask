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

`python migrate.py` applies the HSK 4 catalog only when all 601 word IDs,
Chinese words, pinyin and levels match the expected identities. It updates
meaning and example fields, leaving word IDs and review cards untouched, and
records `hsk4_word_pairs_v1` after success. A separate migration corrects ten
HSK 3/5 examples whose target word was absent. Both are transactional and
idempotent. If an operating database has a different import or partial word
set, the migration skips the catalog; compare that database against the
catalog before changing IDs by hand.

After the HSK 4 correction, 480 of 601 catalog entries match existing legacy
image fingerprints in the repository. The remaining images are deliberately
hidden by `verified_image`; do not relink images solely by row ID. Inspect or
regenerate those images for the corrected word before making them visible.

HSK 6 entries in the tracked dump have no example sentences or pinyin, so
this migration does not invent 2,500 sentence pairs. Review and source that
level separately. Run the backend tests and `audit_word_images.py` against the
real database after deployment.
