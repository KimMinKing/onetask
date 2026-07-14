# Translation Export Workflow

## English source files

- `english_words_for_zh_translation.md`: human-readable source for a Chinese AI.
- `english_words_for_zh_translation.jsonl`: machine-readable source and import template.

Ask the translator to keep `id` unchanged and fill only:

```jsonl
{"id": 24, "meaning_zh": "分数", "example_zh": "今天比赛的最终比分是多少？"}
```

The final translated JSONL can include the original fields too. The import script only needs `id`, `meaning_zh`, and `example_zh`.

## Import reviewed translations

From `backend`:

```powershell
$env:DATABASE_URL="postgresql://tradediary:tradediary@localhost:55432/onetask"
.\venv\Scripts\python.exe import_zh_translations.py ..\translation_exports\english_translated.jsonl --lang en --dry-run
.\venv\Scripts\python.exe import_zh_translations.py ..\translation_exports\english_translated.jsonl --lang en
```

On the server, run the same script inside the backend container or with the server `DATABASE_URL`.
