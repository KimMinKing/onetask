# Translation Export Workflow

This folder is for preparing English/Japanese vocabulary data for Simplified Chinese users.

## Export Sources

From `backend`:

```powershell
$env:DATABASE_URL="postgresql://tradediary:tradediary@localhost:55432/onetask"
.\venv\Scripts\python.exe export_translation_sources.py --lang en --source dump
.\venv\Scripts\python.exe export_translation_sources.py --lang ja --source dump
```

Output files:

- `english_words_for_zh_translation.jsonl`
- `english_words_for_zh_translation.md`
- `japanese_words_for_zh_translation.jsonl`
- `japanese_words_for_zh_translation.md`

The JSONL files are the source files for DeepSeek or another translator. Keep `id` and input order unchanged.

## Fill English With DeepSeek

```powershell
$env:DEEPSEEK_API_KEY="sk-..."
python translation_exports\translate_english_to_zh.py `
  translation_exports\english_words_for_zh_translation.jsonl `
  translation_exports\english_translated.jsonl `
  --batch-size 100
```

The English script fills:

- `example_en`
- `example_ko`
- `meaning_zh`
- `example_zh`

Existing `example_en` and `example_ko` values are preserved.

## Fill Japanese With DeepSeek

```powershell
$env:DEEPSEEK_API_KEY="sk-..."
python translation_exports\translate_japanese_to_zh.py `
  translation_exports\japanese_words_for_zh_translation.jsonl `
  translation_exports\japanese_translated.jsonl `
  --batch-size 100
```

The Japanese script fills:

- `example_jp`
- `example_ko`
- `meaning_zh`
- `example_zh`

Existing `example_jp` and `example_ko` values are preserved.

## Resume

Both DeepSeek scripts append only validated rows. If the run stops, run the same command again and it resumes from the existing output file.

Use `--overwrite` only when you want to recreate the output from line 1.

## Import Reviewed Translations

From `backend`:

```powershell
$env:DATABASE_URL="postgresql://tradediary:tradediary@localhost:55432/onetask"
.\venv\Scripts\python.exe import_zh_translations.py ..\translation_exports\english_translated.jsonl --lang en --dry-run
.\venv\Scripts\python.exe import_zh_translations.py ..\translation_exports\english_translated.jsonl --lang en

.\venv\Scripts\python.exe import_zh_translations.py ..\translation_exports\japanese_translated.jsonl --lang ja --dry-run
.\venv\Scripts\python.exe import_zh_translations.py ..\translation_exports\japanese_translated.jsonl --lang ja
```

On the server, run the same scripts inside the backend container or with the server `DATABASE_URL`.
