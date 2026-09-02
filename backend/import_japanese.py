"""
JLPT N5~N1 단어 import 스크립트
- jamsinclair/open-anki-jlpt-decks CSV 다운로드
- 영어 뜻 → 한국어 GoogleTranslator 번역
- japanese_words 테이블에 삽입
"""
import io, sys, csv, time, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from dotenv import load_dotenv
from translation_utils import GoogleTranslator
from sqlalchemy import create_engine, text
import os

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
translator = GoogleTranslator(source="en", target="ko")

BASE_URL = "https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/{level}.csv"
LEVELS = ["n5", "n4", "n3", "n2", "n1"]


def download_level(level: str) -> list[dict]:
    url = BASE_URL.format(level=level)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        content = r.read().decode("utf-8")
    reader = csv.DictReader(content.splitlines())
    words = []
    for row in reader:
        expr = row.get("expression", "").strip()
        reading = row.get("reading", "").strip()
        meaning_en = row.get("meaning", "").strip()
        if not expr or not meaning_en:
            continue
        words.append({
            "expression": expr,
            "reading": reading or expr,
            "meaning_en": meaning_en,
            "jlpt_level": level.upper(),
        })
    return words


def translate_meaning(en: str) -> str:
    # 첫 번째 뜻만 (쉼표 앞부분), 너무 길면 자르기
    short = en.split(";")[0].split(",")[0].strip()
    short = short[:80]
    for _ in range(3):
        try:
            result = translator.translate(short)
            return result
        except Exception as e:
            print(f"  번역 실패: {e}")
            time.sleep(2)
    return en  # 실패 시 영어 원문 반환


def run():
    for level in LEVELS:
        print(f"\n=== JLPT {level.upper()} ===")
        words = download_level(level)
        print(f"  다운로드: {len(words)}개")

        # 이미 있는 단어 확인
        with engine.connect() as conn:
            existing = {r[0] for r in conn.execute(
                text("SELECT expression FROM japanese_words WHERE jlpt_level=:l"),
                {"l": level.upper()}
            ).fetchall()}

        new_words = [w for w in words if w["expression"] not in existing]
        if not new_words:
            print(f"  이미 모두 존재")
            continue

        print(f"  신규: {len(new_words)}개 번역 중...")
        inserted = 0
        for i, w in enumerate(new_words, 1):
            ko = translate_meaning(w["meaning_en"])
            with engine.connect() as conn:
                conn.execute(text(
                    "INSERT INTO japanese_words (expression, reading, meaning, jlpt_level) "
                    "VALUES (:e, :r, :m, :l)"
                ), {"e": w["expression"], "r": w["reading"], "m": ko, "l": w["jlpt_level"]})
                conn.commit()
            inserted += 1
            if i % 50 == 0:
                print(f"  [{i}/{len(new_words)}] {w['expression']} → {ko}")
            if i % 20 == 0:
                time.sleep(1)  # API 과부하 방지

        print(f"  완료: {inserted}개 삽입")

    # 최종 집계
    with engine.connect() as conn:
        for level in [l.upper() for l in LEVELS]:
            cnt = conn.execute(
                text("SELECT COUNT(*) FROM japanese_words WHERE jlpt_level=:l"),
                {"l": level}
            ).scalar()
            print(f"JLPT {level}: {cnt}개")


if __name__ == "__main__":
    run()
