"""
영어 단어 예문 생성 스크립트
- Tatoeba 영어 문장 다운로드 → 단어 포함 문장 매칭
- translation_utils (GoogleTranslator 호환 래퍼) en->ko 번역
"""
import os, bz2, csv, urllib.request, time, re
from collections import defaultdict
from dotenv import load_dotenv
from translation_utils import GoogleTranslator
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

TATOEBA_URL = "https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2"
TATOEBA_BZ2 = "eng_sentences.tsv.bz2"
TATOEBA_TSV = "eng_sentences.tsv"

MAX_SENTENCE_LEN = 80
MIN_SENTENCE_LEN = 10

translator = GoogleTranslator(source="en", target="ko")


def download_tatoeba():
    if os.path.exists(TATOEBA_TSV):
        print("이미 존재: " + TATOEBA_TSV)
        return
    if not os.path.exists(TATOEBA_BZ2):
        print("다운로드 중: " + TATOEBA_URL)
        urllib.request.urlretrieve(TATOEBA_URL, TATOEBA_BZ2)
        print("다운로드 완료")
    print("압축 해제 중...")
    with bz2.open(TATOEBA_BZ2, "rt", encoding="utf-8") as f:
        lines = f.readlines()
    with open(TATOEBA_TSV, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("압축 해제 완료: " + str(len(lines)) + "줄")


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
    print("적합한 문장 " + str(len(sentences)) + "개 로드")
    return sentences


def build_index(sentences, words):
    print("인덱스 구축 중...")
    # 역방향 인덱스: 단어 소문자 → 원래 단어
    word_lower = {w.lower(): w for w in words}
    word_set = set(word_lower.keys())
    index = defaultdict(list)
    token_re = re.compile(r"[a-z']+")

    for i, sent in enumerate(sentences):
        if i % 500000 == 0 and i > 0:
            print(f"  {i//1000}k / {len(sentences)//1000}k 문장 처리...")
        sent_lower = sent.lower()
        tokens = set(token_re.findall(sent_lower))
        matches = tokens & word_set
        for lw in matches:
            orig = word_lower[lw]
            if len(index[orig]) < 5:
                # 단어 경계 재확인 (부분 매칭 방지)
                if re.search(r'\b' + re.escape(lw) + r'\b', sent_lower):
                    index[orig].append(sent)

    found = sum(1 for w in words if index[w])
    print("매칭: " + str(found) + "/" + str(len(words)) + "개 단어")
    return index


def translate(text_str):
    for _ in range(3):
        try:
            return translator.translate(text_str)
        except Exception as e:
            print("  번역 실패: " + str(e))
            time.sleep(2)
    return None


def run():
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT id, word FROM english_words "
            "WHERE (example_en IS NULL OR example_en = '') "
            "ORDER BY level, id"
        )).fetchall()

    if not rows:
        print("예문이 없는 단어 없음")
        return

    print("예문 생성 필요: " + str(len(rows)) + "개\n")
    words_list = [r[1] for r in rows]

    download_tatoeba()
    sentences = load_sentences()
    index = build_index(sentences, words_list)

    success = 0
    fail_count = 0

    for i, (word_id, word) in enumerate(rows, 1):
        matched = index.get(word, [])
        if not matched:
            fail_count += 1
            if i % 500 == 0:
                print("[" + str(i) + "/" + str(len(rows)) + "] 매칭 없음: " + word)
            continue

        sentence = sorted(matched, key=len)[0]
        ko = translate(sentence)
        if not ko:
            fail_count += 1
            continue

        try:
            print("[" + str(i) + "/" + str(len(rows)) + "] " + word + " -> " + sentence[:50])
        except UnicodeEncodeError:
            print("[" + str(i) + "/" + str(len(rows)) + "] " + word)
        with engine.connect() as conn:
            conn.execute(text(
                "UPDATE english_words SET example_en=:en, example_ko=:ko WHERE id=:id"
            ), {"en": sentence, "ko": ko, "id": word_id})
            conn.commit()
        success += 1

        if i % 20 == 0:
            time.sleep(0.2)

    print("\n완료: " + str(success) + "/" + str(len(rows)) + "개 성공, 매칭 없음: " + str(fail_count) + "개")


if __name__ == "__main__":
    run()
