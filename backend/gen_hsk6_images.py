"""
HSK 6 단어 이미지 생성 스크립트 (300개씩 실행)
- Claude Haiku로 예문 → 시각적 장면 묘사 생성
- flux-schnell watercolor 스타일

사용법:
  python gen_hsk6_images.py     # 이미지 없는 단어 중 처음 300개
  python gen_hsk6_images.py     # 반복 실행으로 나머지 처리
"""
import os, time, urllib.request
from pathlib import Path

from dotenv import load_dotenv
import replicate
from translation_utils import GoogleTranslator
from sqlalchemy import create_engine, text

load_dotenv()

rep    = replicate.Client(api_token=os.getenv("REPLICATE_API_TOKEN"))
engine = create_engine(os.getenv("DATABASE_URL"))

OUTPUT_DIR = "test_output/hsk6"
os.makedirs(OUTPUT_DIR, exist_ok=True)

BATCH     = 300
SLEEP_SEC = 16

tr_zh = GoogleTranslator(source="zh-CN", target="en")
tr_ko = GoogleTranslator(source="ko",    target="en")


def fetch_words():
    with engine.connect() as conn:
        return conn.execute(text(
            "SELECT id, chinese, meaning, example_zh FROM words "
            "WHERE hsk_level = 6 AND example_zh IS NOT NULL "
            "AND (image_path IS NULL OR image_path = '') "
            "ORDER BY id LIMIT :lim"
        ), {"lim": BATCH}).fetchall()


def make_prompt(meaning: str, example_zh: str) -> str:
    """뜻(한→영) + 예문(중→영) 조합으로 이미지 프롬프트 생성"""
    try:
        meaning_en = tr_ko.translate(meaning.split(";")[0].strip()[:40])
    except Exception:
        meaning_en = ""
    try:
        example_en = tr_zh.translate(example_zh)
    except Exception:
        example_en = ""
    parts = [p for p in [meaning_en, example_en] if p]
    return ", ".join(parts)


def generate_image(word_id: int, chinese: str, scene: str) -> str | None:
    prompt = f"watercolor painting style, {scene}, soft brushstrokes, pastel tones"
    path = os.path.join(OUTPUT_DIR, f"word_{word_id}.webp")
    try:
        output = rep.run(
            "black-forest-labs/flux-schnell",
            input={"prompt": prompt, "aspect_ratio": "1:1", "output_format": "webp", "num_inference_steps": 4}
        )
        url = str(output[0]) if isinstance(output, list) else str(output)
        urllib.request.urlretrieve(url, path)
        size = Path(path).stat().st_size // 1024
        print(f"  저장: {path} ({size}KB)", flush=True)
        return path
    except Exception as e:
        print(f"  이미지 생성 실패: {e}", flush=True)
        return None


def update_image_path(word_id: int, image_path: str):
    with engine.connect() as conn:
        conn.execute(text("UPDATE words SET image_path = :p WHERE id = :id"), {"p": image_path, "id": word_id})
        conn.commit()


def run():
    words = fetch_words()
    total = len(words)
    if total == 0:
        print("이미지 생성할 단어 없음 (모두 완료됐거나 예문 없음)", flush=True)
        return

    print(f"HSK 6 이미지 생성: {total}개\n", flush=True)
    success = 0

    for i, (word_id, chinese, meaning, example_zh) in enumerate(words, 1):
        print(f"[{i}/{total}] {chinese} — {meaning[:20]}", flush=True)

        scene = make_prompt(meaning, example_zh)
        print(f"  프롬프트: {scene[:80]}", flush=True)

        path = generate_image(word_id, chinese, scene)
        if path:
            update_image_path(word_id, path)
            success += 1

        if i < total:
            time.sleep(SLEEP_SEC)

    with engine.connect() as conn:
        remaining = conn.execute(text(
            "SELECT COUNT(*) FROM words WHERE hsk_level=6 AND (image_path IS NULL OR image_path='')"
        )).scalar()

    print(f"\n완료: {success}/{total}개 생성. 남은 단어: {remaining}개")
    if remaining > 0:
        print("→ python gen_hsk6_images.py 다시 실행하면 계속됩니다")


if __name__ == "__main__":
    run()
