# English word catalog review

The old `en-ko.txt` import chooses one Korean gloss for each English word. The
historical `fix_english_production.sql` then attaches an independently chosen
English sentence and machine-translated Korean sentence. These fields were not
sense-aligned. Examples in that file include `way = 웨이팅`, `about = 소개`, and
`You are in my way. = 당신은 내 방식대로입니다.` Reapplying that SQL restores errors.

There are 15,868 rows in the historical SQL: A1 46, A2 722, B1 4,294, B2
7,407, and C1 3,399. The A1 46 entries have reviewed meanings and paired
examples in `english_beginner_words.py`. The A2 722 entries have individually
reviewed Korean meanings in `data/english_a2_reviewed.tsv`. Their legacy
examples are removed unless their English sentence and Korean translation were
checked together and replaced with a simple example (43 A2 words so far).
Several meanings deliberately show more than one common sense or explain an
inflected form. Daily new cards show A1 before A2.

The remaining 15,100 B1–C1 legacy entries are excluded from browse, review,
favorites, and daily learning until their meanings and sentence pairs have been
reviewed. Their database rows and existing review progress are retained. This
prevents an unreviewed translation from being presented as a memorization
answer. It does not claim that all 15,868 meanings have been verified.

`migrate.py` reconciles the 768 reviewed entries on every backend startup, so
content drift caused by a later SQL import is repaired even if a migration
marker already exists. Check the live database without modifying it:

```bash
docker compose exec -T backend python english_word_audit.py
```

The review compared the old glossary and sentence pairs with separate English
to Korean dictionary sources, including [Open English-Korean Dictionary](https://github.com/jhseo1211/open-english-korean-dict)
and [Wiktionary-derived English–Korean entries](https://danielgregorini.github.io/koreader-dicts/en/en-ko/).
Neither source was imported wholesale: both have gaps or unexpected first
senses (for example, `bank` may initially show “riverbank”). The checked A2
meanings in this repository were written for the learning context. The source
dictionaries are licensed CC BY-SA 4.0 and should be credited if their full
entries are reused in a later catalog expansion.

Next review batches should work through B1, then B2 and C1, adding each word
only after its Korean meanings and any displayed example pair have been checked
together. Do not bring back legacy examples merely because the word itself is
present in a sentence.
