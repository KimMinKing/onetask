"""
HSK 5 단어 이미지 생성 스크립트 (300개씩 실행)
사용법:
  python gen_hsk5_images.py     # 이미지 없는 단어 중 처음 300개
  python gen_hsk5_images.py     # 그 다음 300개 (반복)
  ...

※ 실행할 때마다 아직 이미지 없는 단어 중 처음 300개를 가져옵니다.
   완료된 건 자동으로 제외되므로 그냥 반복 실행하면 됩니다.
"""
import os, sys, time, urllib.request
from pathlib import Path

from dotenv import load_dotenv
import replicate
from translation_utils import GoogleTranslator
from sqlalchemy import create_engine, text

load_dotenv()

client = replicate.Client(api_token=os.getenv("REPLICATE_API_TOKEN"))
engine = create_engine(os.getenv("DATABASE_URL"))

OUTPUT_DIR = "test_output/hsk5"
os.makedirs(OUTPUT_DIR, exist_ok=True)

translator = GoogleTranslator(source="zh-CN", target="en")
SLEEP_SEC = 16  # rate limit: ~6 req/min (credit < $5)
BATCH = 300


def fetch_words():
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT id, chinese, example_zh FROM words "
            "WHERE hsk_level = 5 AND example_zh IS NOT NULL "
            "AND (image_path IS NULL OR image_path = '') "
            "ORDER BY id "
            "LIMIT :lim"
        ), {"lim": BATCH}).fetchall()
    return rows


def generate_image(word_id: int, chinese: str, example_zh: str) -> str | None:
    try:
        en_scene = translator.translate(example_zh)
        print(f"  번역: {example_zh[:30]} → {en_scene[:40]}", flush=True)
    except Exception as e:
        print(f"  번역 실패: {e}", flush=True)
        en_scene = f"a scene depicting {chinese}"

    prompt = f"watercolor painting style, {en_scene}, soft brushstrokes, pastel tones"
    filename = f"word_{word_id}.webp"
    path = os.path.join(OUTPUT_DIR, filename)

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
    print(f"HSK 5 이미지 생성: {total}개\n", flush=True)

    success = 0
    for i, (word_id, chinese, example_zh) in enumerate(words, 1):
        print(f"[{i}/{total}] {chinese} (id={word_id})", flush=True)
        path = generate_image(word_id, chinese, example_zh)
        if path:
            update_image_path(word_id, path)
            success += 1
        if i < total:
            time.sleep(SLEEP_SEC)

    # 남은 개수 표시
    with engine.connect() as conn:
        remaining = conn.execute(text(
            "SELECT COUNT(*) FROM words WHERE hsk_level=5 AND (image_path IS NULL OR image_path='')"
        )).scalar()
    print(f"\n완료: {success}/{total}개 생성. 아직 남은 단어: {remaining}개")
    if remaining > 0:
        print("→ python gen_hsk5_images.py 다시 실행하면 계속됩니다")


if __name__ == "__main__":
    run()
