#!/usr/bin/env python3
"""
Fill Japanese word examples and Simplified Chinese translations with DeepSeek.

Input JSONL records are expected to contain:
{"id": 1, "jlpt_level": "N5", "expression": "...", "reading": "...",
 "example_jp": "", "meaning_ko": "...", "example_ko": "",
 "meaning_zh": "", "example_zh": ""}

The script validates id/order, supports resume, and writes only verified rows.
Existing example_jp/example_ko values are preserved exactly.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

import requests


API_URL = "https://api.deepseek.com/chat/completions"

SYSTEM_PROMPT = """\
You create Japanese vocabulary learning data for Simplified Chinese UI users.

Rules:
1. Empty input fields are normal. Fill missing fields instead of treating them as errors.
2. Most items may only have id, jlpt_level, expression, reading, and meaning_ko.
3. If example_jp is empty, create one natural Japanese sentence using expression/reading/meaning_ko.
4. If example_jp is already non-empty, return it exactly unchanged.
5. If example_ko is already non-empty, return it exactly unchanged.
6. If example_ko is empty, translate example_jp into natural Korean.
7. Translate meaning_ko into accurate Simplified Chinese as meaning_zh. Use expression as context.
8. Translate example_jp into natural Simplified Chinese as example_zh.
9. Never modify id.
10. Output order must exactly match input order.
11. Do not add, remove, split, or merge items.
12. Output only one JSON object. Do not output markdown or code fences.
13. Exact output shape:
{"items":[{"id": ORIGINAL_ID, "example_jp":"...", "example_ko":"...", "meaning_zh":"...", "example_zh":"..."}]}

Example:
Input item:
{"id":1,"jlpt_level":"N5","expression":"食べる","reading":"たべる","example_jp":"","meaning_ko":"먹다","example_ko":"","meaning_zh":"","example_zh":""}
Output item:
{"id":1,"example_jp":"朝ご飯を食べます。","example_ko":"아침밥을 먹습니다.","meaning_zh":"吃","example_zh":"吃早饭。"}
"""


@dataclass(frozen=True)
class EntryView:
    id: Any
    jlpt_level: str
    expression: str
    reading: str
    example_jp: str
    meaning_ko: str
    example_ko: str


class TranslationError(RuntimeError):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fill Japanese JSONL example and Chinese translation fields with DeepSeek."
    )
    parser.add_argument("input", type=Path, help="Source JSONL path")
    parser.add_argument("output", type=Path, help="Translated JSONL path")
    parser.add_argument("--model", default=os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash"))
    parser.add_argument("--batch-size", type=int, default=50)
    parser.add_argument("--max-retries", type=int, default=5)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--temperature", type=float, default=0.1)
    parser.add_argument("--start-line", type=int, default=1)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def load_jsonl(path: Path) -> list[Any]:
    if not path.exists():
        raise FileNotFoundError(f"Input file does not exist: {path}")

    rows: list[Any] = []
    with path.open("r", encoding="utf-8-sig") as file:
        for line_no, raw in enumerate(file, start=1):
            text = raw.strip()
            if not text:
                raise ValueError(f"Line {line_no} is empty.")
            try:
                row = json.loads(text)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON on line {line_no}: {exc}") from exc
            validate_row_shape(row, line_no)
            rows.append(row)

    if not rows:
        raise ValueError("Input JSONL is empty.")

    ids = [extract_view(row).id for row in rows]
    duplicate_ids = find_duplicates(ids)
    if duplicate_ids:
        raise ValueError(f"Duplicate ids in input file: {duplicate_ids[:10]}")

    return rows


def validate_row_shape(row: Any, line_no: int) -> None:
    if isinstance(row, dict):
        required = {"id", "expression", "reading", "meaning_ko"}
        missing = required - row.keys()
        if missing:
            raise ValueError(f"Line {line_no} is missing fields: {sorted(missing)}")
        return

    if isinstance(row, list):
        if len(row) < 8:
            raise ValueError(f"Line {line_no} list length is {len(row)}. Expected at least 8.")
        return

    raise ValueError(f"Line {line_no} must be a JSON object or list, got {type(row).__name__}.")


def extract_view(row: Any) -> EntryView:
    if isinstance(row, dict):
        return EntryView(
            id=row["id"],
            jlpt_level=str(row.get("jlpt_level", "")),
            expression=str(row.get("expression", "")),
            reading=str(row.get("reading", "")),
            example_jp=str(row.get("example_jp", "")),
            meaning_ko=str(row.get("meaning_ko", "")),
            example_ko=str(row.get("example_ko", "")),
        )

    return EntryView(
        id=row[0],
        jlpt_level=str(row[1]),
        expression=str(row[2]),
        reading=str(row[3]),
        example_jp=str(row[4]),
        meaning_ko=str(row[5]),
        example_ko=str(row[6]),
    )


def apply_translation(row: Any, example_jp: str, example_ko: str, meaning_zh: str, example_zh: str) -> Any:
    if isinstance(row, dict):
        result = dict(row)
        if not str(result.get("example_jp") or "").strip():
            result["example_jp"] = example_jp
        if not str(result.get("example_ko") or "").strip():
            result["example_ko"] = example_ko
        result["meaning_zh"] = meaning_zh
        result["example_zh"] = example_zh
        return result

    result = list(row)
    if not str(result[4] or "").strip():
        result[4] = example_jp
    if not str(result[6] or "").strip():
        result[6] = example_ko
    result[7] = meaning_zh
    if len(result) > 8:
        result[8] = example_zh
    else:
        result.append(example_zh)
    return result


def find_duplicates(values: Sequence[Any]) -> list[Any]:
    seen: set[str] = set()
    duplicates: list[Any] = []
    for value in values:
        key = canonical_id(value)
        if key in seen:
            duplicates.append(value)
        else:
            seen.add(key)
    return duplicates


def canonical_id(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def load_and_validate_resume(output: Path, input_rows: Sequence[Any]) -> int:
    if not output.exists():
        return 0

    completed = 0
    with output.open("r", encoding="utf-8-sig") as file:
        for line_no, raw in enumerate(file, start=1):
            text = raw.strip()
            if not text:
                raise ValueError(f"Output line {line_no} is empty.")
            output_row = json.loads(text)
            if completed >= len(input_rows):
                raise ValueError("Output file has more rows than input file.")
            input_id = extract_view(input_rows[completed]).id
            output_id = extract_view(output_row).id
            if canonical_id(input_id) != canonical_id(output_id):
                raise ValueError(f"Resume validation failed on line {line_no}: input={input_id!r}, output={output_id!r}")
            completed += 1
    return completed


def build_user_payload(rows: Sequence[Any]) -> str:
    items = []
    for row in rows:
        view = extract_view(row)
        items.append({
            "id": view.id,
            "jlpt_level": view.jlpt_level,
            "expression": view.expression,
            "reading": view.reading,
            "example_jp": view.example_jp,
            "meaning_ko": view.meaning_ko,
            "example_ko": view.example_ko,
            "meaning_zh": "",
            "example_zh": "",
            "task": "Fill missing example_jp/example_ko and fill meaning_zh/example_zh. Preserve existing examples exactly.",
        })
    return json.dumps({"items": items}, ensure_ascii=False, separators=(",", ":"))


def request_translation(
    session: requests.Session,
    api_key: str,
    model: str,
    rows: Sequence[Any],
    max_retries: int,
    timeout: int,
    temperature: float,
) -> list[dict[str, Any]]:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_payload(rows)},
        ],
        "response_format": {"type": "json_object"},
        "temperature": temperature,
        "stream": False,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    last_error: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            response = session.post(API_URL, headers=headers, json=payload, timeout=timeout)
            if response.status_code == 401:
                raise TranslationError("Invalid API key.")
            if response.status_code == 402:
                raise TranslationError("DeepSeek API balance is insufficient.")
            if response.status_code == 429 or response.status_code >= 500:
                raise requests.HTTPError(f"Temporary API error HTTP {response.status_code}: {response.text[:500]}", response=response)
            if not response.ok:
                raise TranslationError(f"API request failed HTTP {response.status_code}: {response.text[:1000]}")

            data = response.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            items = parsed.get("items")
            if not isinstance(items, list):
                raise TranslationError("API output has no items array.")
            validate_translations(rows, items)
            return items

        except TranslationError:
            raise
        except (requests.RequestException, KeyError, TypeError, json.JSONDecodeError, ValueError) as exc:
            last_error = exc
            if attempt == max_retries:
                break
            delay = min(60.0, (2 ** (attempt - 1)) + random.uniform(0.2, 1.0))
            print(f"\nRequest failed, retrying in {delay:.1f}s ({attempt}/{max_retries}): {exc}", file=sys.stderr)
            time.sleep(delay)

    raise TranslationError(f"All {max_retries} requests failed: {last_error}")


def validate_translations(source_rows: Sequence[Any], translated_items: Sequence[dict[str, Any]]) -> None:
    if len(source_rows) != len(translated_items):
        raise ValueError(f"Item count mismatch: input {len(source_rows)}, output {len(translated_items)}")

    for index, (source_row, item) in enumerate(zip(source_rows, translated_items), start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Translated item {index} is not an object.")
        required = {"id", "example_jp", "example_ko", "meaning_zh", "example_zh"}
        missing = required - item.keys()
        if missing:
            raise ValueError(f"Translated item {index} is missing fields: {sorted(missing)}")

        source = extract_view(source_row)
        if canonical_id(source.id) != canonical_id(item["id"]):
            raise ValueError(f"id/order mismatch at item {index}: input={source.id!r}, output={item['id']!r}")

        if source.example_jp and item["example_jp"] != source.example_jp:
            raise ValueError(f"id={source.id!r} changed existing example_jp.")
        if source.example_ko and item["example_ko"] != source.example_ko:
            raise ValueError(f"id={source.id!r} changed existing example_ko.")

        for key in ["example_jp", "example_ko", "meaning_zh", "example_zh"]:
            value = item[key]
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"id={source.id!r} has empty {key}.")


def translate_with_split(
    session: requests.Session,
    api_key: str,
    model: str,
    rows: Sequence[Any],
    max_retries: int,
    timeout: int,
    temperature: float,
) -> list[dict[str, Any]]:
    try:
        return request_translation(session, api_key, model, rows, max_retries, timeout, temperature)
    except TranslationError as exc:
        if len(rows) == 1:
            source_id = extract_view(rows[0]).id
            raise TranslationError(f"id={source_id!r} final translation failed: {exc}") from exc

        midpoint = len(rows) // 2
        print(f"\nBatch of {len(rows)} failed. Retrying as {midpoint} + {len(rows) - midpoint}.", file=sys.stderr)
        left = translate_with_split(session, api_key, model, rows[:midpoint], max_retries, timeout, temperature)
        right = translate_with_split(session, api_key, model, rows[midpoint:], max_retries, timeout, temperature)
        return left + right


def append_rows(path: Path, rows: Sequence[Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="\n") as file:
        for row in rows:
            file.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
        file.flush()
        os.fsync(file.fileno())


def main() -> int:
    args = parse_args()
    if args.batch_size < 1:
        raise ValueError("--batch-size must be at least 1.")
    if args.max_retries < 1:
        raise ValueError("--max-retries must be at least 1.")
    if args.start_line < 1:
        raise ValueError("--start-line must be at least 1.")

    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise EnvironmentError('Missing DEEPSEEK_API_KEY. In PowerShell: $env:DEEPSEEK_API_KEY="sk-..."')

    input_path = args.input.resolve()
    output_path = args.output.resolve()
    if input_path == output_path:
        raise ValueError("Input and output files must be different.")

    input_rows = load_jsonl(input_path)
    if args.overwrite and output_path.exists():
        output_path.unlink()

    completed = load_and_validate_resume(output_path, input_rows)
    if completed == 0 and args.start_line > 1:
        completed = args.start_line - 1
        if completed >= len(input_rows):
            raise ValueError("--start-line is beyond the input length.")

    total = len(input_rows)
    if completed == total:
        print(f"Already complete: {completed}/{total}")
        return 0

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Model: {args.model}")
    print(f"Progress: {completed}/{total}")
    print("Only id/order-validated results are written.")

    with requests.Session() as session:
        index = completed
        while index < total:
            end = min(index + args.batch_size, total)
            source_batch = input_rows[index:end]
            translated_items = translate_with_split(session, api_key, args.model, source_batch, args.max_retries, args.timeout, args.temperature)

            completed_rows = []
            for source_row, translated in zip(source_batch, translated_items):
                completed_rows.append(apply_translation(
                    source_row,
                    translated["example_jp"].strip(),
                    translated["example_ko"].strip(),
                    translated["meaning_zh"].strip(),
                    translated["example_zh"].strip(),
                ))

            append_rows(output_path, completed_rows)
            index = end
            percent = index / total * 100
            first_id = extract_view(source_batch[0]).id
            last_id = extract_view(source_batch[-1]).id
            print(f"\rDone: {index}/{total} ({percent:6.2f}%) id {first_id!r} ~ {last_id!r}", end="", flush=True)

    print("\nTranslation complete")
    print(f"Output file: {output_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nInterrupted. Run again to resume from the existing output file.", file=sys.stderr)
        raise SystemExit(130)
    except Exception as exc:
        print(f"\nError: {exc}", file=sys.stderr)
        raise SystemExit(1)
