"""
HSK 4 단어 이미지 생성 스크립트
- flux-schnell watercolor 스타일
- deep-translator로 예문 중→영 번역
- 생성 후 DB image_path 업데이트
"""
import io
import os
import sys
import time
import urllib.request
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from dotenv import load_dotenv
import replicate
from translation_utils import GoogleTranslator
from sqlalchemy import create_engine, text

load_dotenv()

client = replicate.Client(api_token=os.getenv("REPLICATE_API_TOKEN"))
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://onetask:onetask@localhost/onetask")
engine = create_engine(DATABASE_URL)

OUTPUT_DIR = "test_output/hsk4"
os.makedirs(OUTPUT_DIR, exist_ok=True)

translator = GoogleTranslator(source="zh-CN", target="en")

SLEEP_SEC = 16  # rate limit: 6 req/min when credit < $5


def fetch_hsk4_words():
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT id, chinese, example_zh FROM words "
            "WHERE hsk_level = 4 AND example_zh IS NOT NULL "
            "AND (image_path IS NULL OR image_path = '') "
            "ORDER BY id"
        )).fetchall()
    return rows


def generate_image(word_id: int, chinese: str, example_zh: str) -> str | None:
    try:
        en_scene = translator.translate(example_zh)
        print(f"  번역: {example_zh} → {en_scene}")
    except Exception as e:
        print(f"  번역 실패: {e}")
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
        print(f"  저장: {path} ({size}KB)")
        return path
    except Exception as e:
        print(f"  이미지 생성 실패: {e}")
        return None


def update_image_path(word_id: int, image_path: str):
    with engine.connect() as conn:
        conn.execute(text(
            "UPDATE words SET image_path = :path WHERE id = :id"
        ), {"path": image_path, "id": word_id})
        conn.commit()


def run():
    words = fetch_hsk4_words()
    total = len(words)
    print(f"HSK 4 이미지 생성 시작: {total}개\n")

    for i, (word_id, chinese, example_zh) in enumerate(words, 1):
        print(f"[{i}/{total}] {chinese} (id={word_id})")
        image_path = generate_image(word_id, chinese, example_zh)
        if image_path:
            update_image_path(word_id, image_path)

        if i < total:
            print(f"  {SLEEP_SEC}초 대기...")
            time.sleep(SLEEP_SEC)

    print(f"\n완료. {OUTPUT_DIR}/ 폴더 확인해봐.")


if __name__ == "__main__":
    run()
