"""
일본어 예문 생성 스크립트
- Tatoeba 일본어 문장 다운로드 → 단어(expression) 포함 문장 매칭
- translation_utils (GoogleTranslator 호환 래퍼) ja→ko 번역
"""
import os, bz2, csv, urllib.request, time
from collections import defaultdict
from dotenv import load_dotenv
from translation_utils import GoogleTranslator
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

TATOEBA_URL = "https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences.tsv.bz2"
TATOEBA_BZ2 = "jpn_sentences.tsv.bz2"
TATOEBA_TSV = "jpn_sentences.tsv"

MAX_SENTENCE_LEN = 30
MIN_SENTENCE_LEN = 5

translator = GoogleTranslator(source="ja", target="ko")


def download_tatoeba():
    if os.path.exists(TATOEBA_TSV):
        print(f"이미 존재: {TATOEBA_TSV}")
        return
    if not os.path.exists(TATOEBA_BZ2):
        print(f"다운로드 중: {TATOEBA_URL}")
        urllib.request.urlretrieve(TATOEBA_URL, TATOEBA_BZ2)
        print("다운로드 완료")
    print("압축 해제 중...")
    with bz2.open(TATOEBA_BZ2, "rt", encoding="utf-8") as f:
        lines = f.readlines()
    with open(TATOEBA_TSV, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"압축 해제 완료: {len(lines)}줄")


def load_sentences():
    print("문장 로딩 중...")
    sentences = []
    with open(TATOEBA_TSV, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        for row in reader:
            if len(row) < 3:
                continue
            sent = row[2].strip()
            l = len(sent)
            if MIN_SENTENCE_LEN <= l <= MAX_SENTENCE_LEN:
                sentences.append(sent)
    print(f"적합한 문장 {len(sentences)}개 로드")
    return sentences


def build_index(sentences: list[str], words: list[str]) -> dict[str, list[str]]:
    print("인덱스 구축 중...")
    index: dict[str, list[str]] = defaultdict(list)
    for sent in sentences:
        for w in words:
            if w in sent:
                if len(index[w]) < 5:
                    index[w].append(sent)
    found = sum(1 for w in words if index[w])
    print(f"매칭: {found}/{len(words)}개 단어")
    return index


def translate(text_str: str) -> str | None:
    for _ in range(3):
        try:
            result = translator.translate(text_str)
            return result
        except Exception as e:
            print(f"  번역 실패: {e}")
            time.sleep(2)
    return None


def run():
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT id, expression FROM japanese_words "
            "WHERE example_jp IS NULL OR example_jp = '' "
            "ORDER BY jlpt_level, id"
        )).fetchall()

    if not rows:
        print("예문이 없는 단어 없음")
        return

    print(f"예문 생성 필요: {len(rows)}개\n")
    words_list = [r[1] for r in rows]

    download_tatoeba()
    sentences = load_sentences()
    index = build_index(sentences, words_list)

    success = 0
    fail_words = []

    for i, (word_id, expression) in enumerate(rows, 1):
        matched = index.get(expression, [])
        if not matched:
            fail_words.append(expression)
            if i % 100 == 0:
                print(f"[{i}/{len(rows)}] 매칭 없음: {expression}")
            continue

        candidates = sorted(matched, key=len)[:3]
        sentence = candidates[0]

        print(f"[{i}/{len(rows)}] {expression} → {sentence}", end="  ")
        ko = translate(sentence)
        if not ko:
            print("번역 실패")
            fail_words.append(expression)
            continue

        print(f"→ {ko}")
        with engine.connect() as conn:
            conn.execute(text(
                "UPDATE japanese_words SET example_jp=:jp, example_ko=:ko WHERE id=:id"
            ), {"jp": sentence, "ko": ko, "id": word_id})
            conn.commit()
        success += 1

        if i % 10 == 0:
            time.sleep(0.5)

    print(f"\n완료: {success}/{len(rows)}개 성공")
    if fail_words:
        print(f"매칭 없음: {len(fail_words)}개")


if __name__ == "__main__":
    run()
