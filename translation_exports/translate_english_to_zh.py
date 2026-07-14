#!/usr/bin/env python3
"""
DeepSeek를 이용해 영어 단어 JSONL의 example_en, example_ko, meaning_zh, example_zh를 채우는 프로그램.

지원 입력 형식
1) 객체형:
{"id": 1, "level": "...", "word": "apple", "example_en": "...",
 "meaning_ko": "...", "example_ko": "...", "meaning_zh": "", "example_zh": ""}

2) 배열형:
[id, level, word, example_en, meaning_ko, example_ko, meaning_zh, example_zh]

특징
- 입력 순서 그대로 출력
- id 변경/누락/순서 변경 검증
- 기존 출력 파일이 있으면 이어서 실행
- API 오류 시 재시도
- 큰 배치가 계속 실패하면 자동으로 반씩 나눠 재처리
- 성공한 데이터만 즉시 파일에 기록
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
너는 중국어권 학습자를 위한 영어 단어 학습 데이터 작성자다.

규칙:
1. 입력의 빈 필드는 오류가 아니다. 빈 필드를 반드시 새로 채워야 한다.
2. 각 항목은 보통 id, level, word, meaning_ko만 있고 example_en, example_ko, meaning_zh, example_zh는 비어 있을 수 있다.
3. word와 meaning_ko를 보고, 해당 level에 맞는 짧고 자연스러운 영어 예문 example_en을 새로 만든다.
4. example_en은 단어의 실제 용법을 보여주는 한 문장이어야 하며, 너무 길거나 어려우면 안 된다.
5. example_ko는 생성한 example_en의 자연스러운 한국어 번역이다.
6. meaning_zh는 meaning_ko와 word를 참고해서 중국어 간체(简体中文)로 짧고 정확하게 번역한다.
7. example_zh는 생성한 example_en의 자연스러운 중국어 간체 번역이다.
8. 입력의 id를 절대 수정하지 않는다.
9. 입력 순서와 출력 순서를 완전히 동일하게 유지한다.
10. 항목을 추가하거나 누락하거나 합치지 않는다.
11. JSON 객체 하나만 출력하며, 설명·마크다운·코드블록은 출력하지 않는다.
12. 출력 형식은 정확히 {"items":[{"id": 원본ID, "example_en":"...", "example_ko":"...", "meaning_zh":"...", "example_zh":"..."}]} 이다.

예시:
입력: {"id":1,"level":"A1","word":"and","example_en":"","meaning_ko":"그리고","example_ko":"","meaning_zh":"","example_zh":""}
출력 항목: {"id":1,"example_en":"I like apples and bananas.","example_ko":"나는 사과와 바나나를 좋아한다.","meaning_zh":"和；以及","example_zh":"我喜欢苹果和香蕉。"}
"""


@dataclass(frozen=True)
class EntryView:
    id: Any
    level: str
    word: str
    example_en: str
    meaning_ko: str
    example_ko: str


class TranslationError(RuntimeError):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="DeepSeek API로 영어 단어 JSONL에 중국어 번역을 채웁니다."
    )
    parser.add_argument("input", type=Path, help="원본 JSONL 경로")
    parser.add_argument("output", type=Path, help="번역 결과 JSONL 경로")
    parser.add_argument(
        "--model",
        default=os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash"),
        help="DeepSeek 모델명 (기본: DEEPSEEK_MODEL 또는 deepseek-v4-flash)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=20,
        help="한 번에 번역할 항목 수 (기본: 20)",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=5,
        help="API 요청 최대 재시도 횟수 (기본: 5)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=180,
        help="API 요청 제한 시간(초, 기본: 180)",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=0.1,
        help="번역 생성 temperature (기본: 0.1)",
    )
    parser.add_argument(
        "--start-line",
        type=int,
        default=1,
        help="입력의 시작 줄 번호. 출력 파일이 없을 때만 사용 (기본: 1)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="기존 출력 파일을 삭제하고 처음부터 실행",
    )
    return parser.parse_args()


def load_jsonl(path: Path) -> list[Any]:
    if not path.exists():
        raise FileNotFoundError(f"입력 파일이 없습니다: {path}")

    rows: list[Any] = []
    with path.open("r", encoding="utf-8-sig") as file:
        for line_no, raw in enumerate(file, start=1):
            text = raw.strip()
            if not text:
                raise ValueError(f"{line_no}번째 줄이 비어 있습니다.")
            try:
                row = json.loads(text)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"{line_no}번째 줄의 JSON이 올바르지 않습니다: {exc}"
                ) from exc
            validate_row_shape(row, line_no)
            rows.append(row)

    if not rows:
        raise ValueError("입력 JSONL이 비어 있습니다.")

    ids = [extract_view(row).id for row in rows]
    duplicate_ids = find_duplicates(ids)
    if duplicate_ids:
        preview = duplicate_ids[:10]
        raise ValueError(f"입력 파일에 중복 id가 있습니다: {preview}")

    return rows


def validate_row_shape(row: Any, line_no: int) -> None:
    if isinstance(row, dict):
        required = {"id", "word", "meaning_ko"}
        missing = required - row.keys()
        if missing:
            raise ValueError(
                f"{line_no}번째 줄 객체에 필드가 없습니다: {sorted(missing)}"
            )
        return

    if isinstance(row, list):
        if len(row) < 8:
            raise ValueError(
                f"{line_no}번째 줄 배열 길이가 {len(row)}입니다. 최소 8개가 필요합니다."
            )
        return

    raise ValueError(
        f"{line_no}번째 줄은 JSON 객체 또는 배열이어야 합니다: {type(row).__name__}"
    )


def extract_view(row: Any) -> EntryView:
    if isinstance(row, dict):
        return EntryView(
            id=row["id"],
            level=str(row.get("level", "")),
            word=str(row.get("word", "")),
            example_en=str(row.get("example_en", "")),
            meaning_ko=str(row.get("meaning_ko", "")),
            example_ko=str(row.get("example_ko", "")),
        )

    return EntryView(
        id=row[0],
        level=str(row[1]),
        word=str(row[2]),
        example_en=str(row[3]),
        meaning_ko=str(row[4]),
        example_ko=str(row[5]),
    )


def apply_translation(row: Any, example_en: str, example_ko: str, meaning_zh: str, example_zh: str) -> Any:
    if isinstance(row, dict):
        result = dict(row)
        result["example_en"] = example_en
        result["example_ko"] = example_ko
        result["meaning_zh"] = meaning_zh
        result["example_zh"] = example_zh
        return result

    result = list(row)
    result[3] = example_en
    result[5] = example_ko
    result[6] = meaning_zh
    result[7] = example_zh
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
                raise ValueError(f"출력 파일 {line_no}번째 줄이 비어 있습니다.")

            try:
                output_row = json.loads(text)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"출력 파일 {line_no}번째 줄이 손상되었습니다: {exc}"
                ) from exc

            if completed >= len(input_rows):
                raise ValueError("출력 파일 줄 수가 입력 파일보다 많습니다.")

            input_id = extract_view(input_rows[completed]).id
            output_id = extract_view(output_row).id

            if canonical_id(input_id) != canonical_id(output_id):
                raise ValueError(
                    f"재개 검증 실패: {line_no}번째 줄 id가 다릅니다. "
                    f"입력={input_id!r}, 출력={output_id!r}"
                )

            completed += 1

    return completed


def build_user_payload(rows: Sequence[Any]) -> str:
    items = []
    for row in rows:
        view = extract_view(row)
        items.append(
            {
                "id": view.id,
                "level": view.level,
                "word": view.word,
                "example_en": view.example_en,
                "meaning_ko": view.meaning_ko,
                "example_ko": view.example_ko,
                "meaning_zh": "",
                "example_zh": "",
                "task": "Fill empty fields. Create example_en, translate it to example_ko and example_zh, and translate meaning_ko to meaning_zh.",
            }
        )

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

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    last_error: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            response = session.post(
                API_URL,
                headers=headers,
                json=payload,
                timeout=timeout,
            )

            if response.status_code == 401:
                raise TranslationError("API 키가 올바르지 않습니다.")
            if response.status_code == 402:
                raise TranslationError("DeepSeek API 잔액이 부족합니다.")

            if response.status_code == 429 or response.status_code >= 500:
                raise requests.HTTPError(
                    f"일시적 API 오류 HTTP {response.status_code}: "
                    f"{response.text[:500]}",
                    response=response,
                )

            if not response.ok:
                raise TranslationError(
                    f"API 요청 실패 HTTP {response.status_code}: "
                    f"{response.text[:1000]}"
                )

            data = response.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            items = parsed.get("items")

            if not isinstance(items, list):
                raise TranslationError("API 출력에 items 배열이 없습니다.")

            validate_translations(rows, items)
            return items

        except TranslationError:
            raise
        except (
            requests.RequestException,
            KeyError,
            TypeError,
            json.JSONDecodeError,
            ValueError,
        ) as exc:
            last_error = exc
            if attempt == max_retries:
                break

            delay = min(60.0, (2 ** (attempt - 1)) + random.uniform(0.2, 1.0))
            print(
                f"\n요청 실패, {delay:.1f}초 후 재시도 "
                f"({attempt}/{max_retries}): {exc}",
                file=sys.stderr,
            )
            time.sleep(delay)

    raise TranslationError(f"{max_retries}회 요청이 모두 실패했습니다: {last_error}")


def validate_translations(
    source_rows: Sequence[Any],
    translated_items: Sequence[dict[str, Any]],
) -> None:
    if len(source_rows) != len(translated_items):
        raise ValueError(
            f"항목 수 불일치: 입력 {len(source_rows)}개, 출력 {len(translated_items)}개"
        )

    for index, (source_row, item) in enumerate(
        zip(source_rows, translated_items), start=1
    ):
        if not isinstance(item, dict):
            raise ValueError(f"{index}번째 번역 결과가 객체가 아닙니다.")

        required = {"id", "example_en", "example_ko", "meaning_zh", "example_zh"}
        missing = required - item.keys()
        if missing:
            raise ValueError(
                f"{index}번째 번역 결과에 필드가 없습니다: {sorted(missing)}"
            )

        source_id = extract_view(source_row).id
        if canonical_id(source_id) != canonical_id(item["id"]):
            raise ValueError(
                f"{index}번째 id/순서 불일치: "
                f"입력={source_id!r}, 출력={item['id']!r}"
            )

        example_en = item["example_en"]
        example_ko = item["example_ko"]
        meaning_zh = item["meaning_zh"]
        example_zh = item["example_zh"]

        if not isinstance(example_en, str) or not example_en.strip():
            raise ValueError(f"id={source_id!r}의 example_en이 비어 있습니다.")
        if not isinstance(example_ko, str) or not example_ko.strip():
            raise ValueError(f"id={source_id!r}의 example_ko가 비어 있습니다.")
        if not isinstance(meaning_zh, str) or not meaning_zh.strip():
            raise ValueError(f"id={source_id!r}의 meaning_zh가 비어 있습니다.")
        if not isinstance(example_zh, str) or not example_zh.strip():
            raise ValueError(f"id={source_id!r}의 example_zh가 비어 있습니다.")


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
        return request_translation(
            session=session,
            api_key=api_key,
            model=model,
            rows=rows,
            max_retries=max_retries,
            timeout=timeout,
            temperature=temperature,
        )
    except TranslationError as exc:
        if len(rows) == 1:
            source_id = extract_view(rows[0]).id
            raise TranslationError(
                f"id={source_id!r} 번역에 최종 실패했습니다: {exc}"
            ) from exc

        midpoint = len(rows) // 2
        print(
            f"\n배치 {len(rows)}개 처리 실패. "
            f"{midpoint}개 + {len(rows) - midpoint}개로 나눠 재시도합니다.",
            file=sys.stderr,
        )

        left = translate_with_split(
            session,
            api_key,
            model,
            rows[:midpoint],
            max_retries,
            timeout,
            temperature,
        )
        right = translate_with_split(
            session,
            api_key,
            model,
            rows[midpoint:],
            max_retries,
            timeout,
            temperature,
        )
        return left + right


def append_rows(path: Path, rows: Sequence[Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("a", encoding="utf-8", newline="\n") as file:
        for row in rows:
            file.write(
                json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n"
            )
        file.flush()
        os.fsync(file.fileno())


def main() -> int:
    args = parse_args()

    if args.batch_size < 1:
        raise ValueError("--batch-size는 1 이상이어야 합니다.")
    if args.max_retries < 1:
        raise ValueError("--max-retries는 1 이상이어야 합니다.")
    if args.start_line < 1:
        raise ValueError("--start-line은 1 이상이어야 합니다.")

    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "환경변수 DEEPSEEK_API_KEY가 없습니다.\n"
            'PowerShell 예: $env:DEEPSEEK_API_KEY="sk-..."'
        )

    input_path = args.input.resolve()
    output_path = args.output.resolve()

    if input_path == output_path:
        raise ValueError("입력 파일과 출력 파일은 달라야 합니다.")

    input_rows = load_jsonl(input_path)

    if args.overwrite and output_path.exists():
        output_path.unlink()

    completed = load_and_validate_resume(output_path, input_rows)

    if completed == 0 and args.start_line > 1:
        completed = args.start_line - 1
        if completed >= len(input_rows):
            raise ValueError("--start-line이 전체 입력 줄 수보다 큽니다.")

    total = len(input_rows)
    if completed == total:
        print(f"이미 완료되어 있습니다: {completed}/{total}")
        return 0

    print(f"입력: {input_path}")
    print(f"출력: {output_path}")
    print(f"모델: {args.model}")
    print(f"진행: {completed}/{total}")
    print("입력 순서와 id가 검증된 결과만 기록합니다.")

    with requests.Session() as session:
        index = completed

        while index < total:
            end = min(index + args.batch_size, total)
            source_batch = input_rows[index:end]

            translated_items = translate_with_split(
                session=session,
                api_key=api_key,
                model=args.model,
                rows=source_batch,
                max_retries=args.max_retries,
                timeout=args.timeout,
                temperature=args.temperature,
            )

            completed_rows = []
            for source_row, translated in zip(source_batch, translated_items):
                completed_rows.append(
                    apply_translation(
                        source_row,
                        translated["example_en"].strip(),
                        translated["example_ko"].strip(),
                        translated["meaning_zh"].strip(),
                        translated["example_zh"].strip(),
                    )
                )

            append_rows(output_path, completed_rows)
            index = end

            percent = index / total * 100
            first_id = extract_view(source_batch[0]).id
            last_id = extract_view(source_batch[-1]).id
            print(
                f"\r완료: {index}/{total} ({percent:6.2f}%) "
                f"id {first_id!r} ~ {last_id!r}",
                end="",
                flush=True,
            )

    print("\n전체 번역 완료")
    print(f"결과 파일: {output_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\n사용자가 중단했습니다. 다음 실행 시 이어서 진행됩니다.", file=sys.stderr)
        raise SystemExit(130)
    except Exception as exc:
        print(f"\n오류: {exc}", file=sys.stderr)
        raise SystemExit(1)
