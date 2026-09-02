"""
HSK 누락 이미지 재생성 스크립트 (HSK3~6 통합)

- DB에 image_path 있지만 실제 파일 없는 경우 + image_path 없는 경우 모두 처리
- 스타일: 선명한 디지털 일러스트 (파스텔 제거, 채도 높은 색감)
- 배치: 기본 100개씩 처리 (--limit N으로 조정)

사용법:
  python regen_missing_images.py              # 기본 (100개)
  python regen_missing_images.py --level 4    # HSK4만
  python regen_missing_images.py --limit 50   # 50개만
  python regen_missing_images.py --dry-run    # 목록만 확인
"""
import io, os, sys, time, argparse, urllib.request
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from dotenv import load_dotenv
import replicate
from translation_utils import GoogleTranslator
from sqlalchemy import create_engine, text

load_dotenv()

client = replicate.Client(api_token=os.getenv("REPLICATE_API_TOKEN"))
engine = create_engine(os.getenv("DATABASE_URL", "postgresql://tradediary:tradediary@localhost:5432/onetask"))

FOLDERS = {3: "test_output/hsk3", 4: "test_output/hsk4", 5: "test_output/hsk5", 6: "test_output/hsk6"}
SLEEP_SEC = 17  # ~3.5 req/min (보수적 rate limit)

tr_zh = GoogleTranslator(source="zh-CN", target="en")
tr_ko = GoogleTranslator(source="ko", target="en")


def fetch_missing(level: int | None, limit: int) -> list[tuple]:
    """이미지 파일이 없는 단어 목록 반환"""
    levels = [level] if level else [3, 4, 5, 6]
    results = []

    with engine.connect() as conn:
        for lvl in levels:
            folder = FOLDERS[lvl]
            rows = conn.execute(text("""
                SELECT id, chinese, meaning, example_zh
                FROM words WHERE hsk_level = :l
                AND example_zh IS NOT NULL
                ORDER BY id
            """), {"l": lvl}).fetchall()

            for r in rows:
                img_path = f"{folder}/word_{r[0]}.webp"
                if not Path(img_path).exists():
                    results.append((lvl, r[0], r[1], r[2], r[3], img_path))

    results.sort(key=lambda x: (x[0], x[1]))  # level, id 순
    return results[:limit]


def make_prompt(chinese: str, meaning: str, example_zh: str) -> str:
    """이미지 생성 프롬프트 구성 (선명한 디지털 일러스트 스타일)"""
    # 뜻(한→영) 번역
    try:
        meaning_en = tr_ko.translate(meaning.split(";")[0].split(",")[0].strip()[:40])
    except Exception:
        meaning_en = ""

    # 예문(중→영) 번역
    try:
        scene_en = tr_zh.translate(example_zh[:100])
    except Exception:
        scene_en = ""

    parts = [p for p in [meaning_en, scene_en] if p]
    subject = ", ".join(parts) if parts else f"concept of {chinese}"

    # 파스텔 제거, 선명한 색감의 일러스트 스타일
    prompt = (
        f"flat vector illustration, {subject}, "
        f"bold clean outlines, vibrant saturated colors, "
        f"modern storybook art, white background, simple composition"
    )
    return prompt


def generate_image(word_id: int, lvl: int, chinese: str, meaning: str,
                   example_zh: str, out_path: str) -> bool:
    prompt = make_prompt(chinese, meaning, example_zh)
    print(f"  프롬프트: {prompt[:90]}", flush=True)

    try:
        output = client.run(
            "black-forest-labs/flux-schnell",
            input={
                "prompt": prompt,
                "aspect_ratio": "1:1",
                "output_format": "webp",
                "num_inference_steps": 4,
            }
        )
        url = str(output[0]) if isinstance(output, list) else str(output)
        os.makedirs(Path(out_path).parent, exist_ok=True)
        urllib.request.urlretrieve(url, out_path)
        size = Path(out_path).stat().st_size // 1024
        print(f"  저장: {out_path} ({size}KB)", flush=True)
        return True
    except Exception as e:
        print(f"  이미지 생성 실패: {e}", flush=True)
        return False


def update_db(word_id: int, img_path: str):
    with engine.connect() as conn:
        conn.execute(text("UPDATE words SET image_path = :p WHERE id = :id"),
                     {"p": img_path, "id": word_id})
        conn.commit()


def run(level: int | None, limit: int, dry_run: bool):
    missing = fetch_missing(level, limit)

    # 레벨별 집계
    from collections import Counter
    by_level = Counter(r[0] for r in missing)
    print(f"누락 이미지: {len(missing)}개")
    for lvl in sorted(by_level):
        print(f"  HSK{lvl}: {by_level[lvl]}개")
    print()

    if dry_run:
        print("=== DRY RUN: 처음 20개 목록 ===")
        for r in missing[:20]:
            lvl, wid, ch, meaning, ex, path = r
            print(f"  HSK{lvl} id={wid:5d} {ch:8s} | {meaning[:15]:15s} | {ex[:40]}")
        return

    success = 0
    for i, (lvl, wid, chinese, meaning, example_zh, out_path) in enumerate(missing, 1):
        print(f"[{i}/{len(missing)}] HSK{lvl} {chinese} (id={wid})", flush=True)
        ok = generate_image(wid, lvl, chinese, meaning, example_zh, out_path)
        if ok:
            update_db(wid, out_path)
            success += 1

        if i < len(missing):
            time.sleep(SLEEP_SEC)

    print(f"\n완료: {success}/{len(missing)}개 생성")

    # 잔여 누락 개수
    remaining = fetch_missing(level, 9999)
    print(f"남은 누락: {len(remaining)}개")
    if remaining:
        print("→ python regen_missing_images.py 다시 실행하면 계속됩니다")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--level", type=int, choices=[3, 4, 5, 6],
                        help="특정 HSK 레벨만 처리")
    parser.add_argument("--limit", type=int, default=100,
                        help="최대 처리 개수 (기본 100)")
    parser.add_argument("--dry-run", action="store_true",
                        help="목록만 확인 (생성 안 함)")
    args = parser.parse_args()
    run(level=args.level, limit=args.limit, dry_run=args.dry_run)
