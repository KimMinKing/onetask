"""Build the reviewed HSK4 word/meaning/example/pinyin catalog from repository sources.

Run from the repository root after `pip install pypinyin`:
    python backend/build_hsk4_pair_catalog.py

The original SQL updates used shifted word IDs. Pair each example with the word it
actually teaches, then recover the example's pinyin by its exact Chinese sentence
from the original dump. The explicitly written rows cover duplicates and sentences
whose target word is absent or only a substring of another word.
"""

import json
import re
import unicodedata
from pathlib import Path

from pypinyin import Style, lazy_pinyin


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = Path(__file__).resolve().parent / "data" / "hsk4_word_pairs.json"
SOURCE = (ROOT / "backend/hsk4_data.sql", ROOT / "backend/hsk4_data_fix.sql")

# Word ID: meaning, Chinese example, Korean example. These entries were checked
# individually because automatic sentence matching could not identify the target.
MANUAL = {
    409: ("그리고, ~이면서", "她聪明而勤奋。", "그녀는 똑똑하고 부지런해."),
    729: ("대 (기계 양사)", "桌上有一台电脑。", "책상 위에 컴퓨터 한 대가 있어."),
    764: ("없다, ~이 없다", "这里空无一人。", "여기에는 아무도 없어."),
    814: ("잎", "树上的叶子变黄了。", "나무의 잎이 노랗게 변했어."),
    825: ("딱딱하다", "这块面包太硬了。", "이 빵은 너무 딱딱해."),
    358: ("놀라다", "听到这个消息我很吃惊。", "이 소식을 듣고 나는 매우 놀랐어."),
    392: ("기다리다", "我在门口等你。", "문 앞에서 너를 기다릴게."),
    403: ("맞다, 옳다", "你的答案是对的。", "네 답은 맞아."),
    404: ("~에게, ~에 대해", "老师对我们很好。", "선생님은 우리에게 잘해 주셔."),
    440: ("감동하다", "这个故事让我很感动。", "이 이야기는 나를 아주 감동시켰어."),
    472: ("지나가다, 건너다", "过马路时要小心。", "길을 건널 때 조심해야 해."),
    473: ("~한 적이 있다", "我去过北京。", "나는 베이징에 가 본 적이 있어."),
    519: ("살을 빼다, 다이어트하다", "他每天跑步减肥。", "그는 살을 빼려고 매일 달려."),
    523: ("낮추다", "请把声音降低一点。", "소리를 조금 낮춰 주세요."),
    587: ("둘 (두 사람)", "我们俩一起去。", "우리 둘이 함께 가자."),
    594: ("남기다", "请把地址留给我。", "주소를 나에게 남겨 줘."),
    659: ("하지만, 그런데", "他很累，却没有停下来。", "그는 매우 피곤했지만 멈추지 않았어."),
    671: ("부드럽다", "这张床很软。", "이 침대는 매우 푹신해."),
    789: ("괜찮다, 가능하다", "这样做行吗？", "이렇게 해도 될까?"),
    813: ("쪽, 페이지", "请看第五页。", "5쪽을 봐 주세요."),
    816: ("~으로, ~을 가지고", "我们以这种方法解决问题。", "우리는 이 방법으로 문제를 해결해."),
    817: ("억 (1억)", "这个城市有一亿人口。", "이 도시에는 인구가 1억 명 있어."),
    824: ("이기다", "我们队赢了比赛。", "우리 팀이 경기에서 이겼어."),
    831: ("~에 의해, ~이 담당하다", "这件事由我负责。", "이 일은 내가 담당해."),
    839: ("~와, ~과", "他与朋友一起学习。", "그는 친구와 함께 공부해."),
    868: ("~의, 그것", "这是其中之一。", "이것은 그중 하나야."),
    875: ("가리키다", "他指着门说话。", "그는 문을 가리키며 말했어."),
    881: ("중국어", "我正在学中文。", "나는 지금 중국어를 배우고 있어."),
    885: ("돼지", "农场里有一头猪。", "농장에 돼지 한 마리가 있어."),
    908: ("산·건물 등을 세는 양사, 좌석", "窗外那座山看起来特别美。", "창밖의 저 산은 정말 아름다워 보여."),
}


def parse_dump() -> tuple[list[dict], dict[str, str]]:
    lines = (ROOT / "onetask_dump.sql").read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(lines) if line.startswith("COPY public.words (")) + 1
    words: list[dict] = []
    sentence_pinyin: dict[str, str] = {}
    for line in lines[start:]:
        if line == r"\.":
            break
        fields = line.split("\t")
        if fields[4] != r"\N" and fields[9] != r"\N":
            previous = sentence_pinyin.setdefault(fields[4], fields[9])
            if previous != fields[9]:
                raise ValueError(f"Conflicting pinyin for example: {fields[4]}")
        if fields[8] == "4":
            words.append({"id": int(fields[0]), "chinese": fields[1], "pinyin": fields[2]})
    return words, sentence_pinyin


def parse_source() -> list[dict]:
    pattern = re.compile(
        r"UPDATE words SET meaning='((?:''|[^'])*)',\s*example_zh='((?:''|[^'])*)',"
        r"\s*example_ko='((?:''|[^'])*)'\s+WHERE id=(\d+);"
    )
    updates = []
    for path in SOURCE:
        for meaning, chinese, korean, source_id in pattern.findall(path.read_text(encoding="utf-8")):
            updates.append({"source_id": int(source_id), "meaning": meaning.replace("''", "'"),
                            "example_zh": chinese.replace("''", "'"), "example_ko": korean.replace("''", "'")})
    return updates


def sentence_to_pinyin(sentence: str) -> str:
    # Only the hand-written exceptions use generated pinyin. Original examples
    # keep the pinyin recorded for that exact sentence in the dump.
    return " ".join(lazy_pinyin(sentence, style=Style.TONE, errors="default"))


def base_syllables(value: str) -> list[str]:
    # Compare letters without tone marks; tone sandhi and neutral tones need
    # human review, while a different sentence changes the syllable sequence.
    decomposed = unicodedata.normalize("NFD", value).lower().replace("u:", "ü")
    plain = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.findall(r"[a-zü]+", plain)


def build_catalog() -> list[dict]:
    words, sentence_pinyin = parse_dump()
    updates = parse_source()
    if len(words) != 601 or len(updates) != 601:
        raise ValueError("HSK4 source count changed; review the matching rules before rebuilding")

    # Longer target words are more specific. Within that group the source's old
    # ID should be near the word's current ID, although it was shifted.
    candidates = sorted(
        (-len(word["chinese"]), abs(word["id"] - update["source_id"]), word_index, update_index)
        for word_index, word in enumerate(words)
        for update_index, update in enumerate(updates)
        if word["chinese"] in update["example_zh"] and word["id"] not in MANUAL
    )
    chosen: dict[int, dict] = {}
    used_updates: set[int] = set()
    for _specificity, distance, word_index, update_index in candidates:
        if distance > 20 or word_index in chosen or update_index in used_updates:
            continue
        chosen[word_index] = updates[update_index]
        used_updates.add(update_index)

    output = []
    for word_index, word in enumerate(words):
        if word["id"] in MANUAL:
            meaning, example_zh, example_ko = MANUAL[word["id"]]
            example_pinyin = sentence_to_pinyin(example_zh)
        else:
            update = chosen.get(word_index)
            if not update:
                raise ValueError(f"Unreviewed HSK4 word: {word['id']} {word['chinese']}")
            meaning, example_zh, example_ko = (update[key] for key in ("meaning", "example_zh", "example_ko"))
            example_pinyin = sentence_pinyin.get(example_zh)
            if not example_pinyin:
                example_pinyin = sentence_to_pinyin(example_zh)
        if word["chinese"] not in example_zh:
            raise ValueError(f"Example does not contain target word: {word['id']} {word['chinese']}")
        if word["id"] == 584:
            # 得 is the complement marker (de), 害 is neutral here, 一 changes
            # tone before 样. The old sentence-level transcription missed all three.
            example_pinyin = "tā zhōng wén shuō de tài lì hai le，gēn mǔ yǔ zhě yí yàng liú lì。"
        if base_syllables(sentence_to_pinyin(example_zh)) != base_syllables(example_pinyin):
            raise ValueError(f"Example/pinyin syllables differ: {word['id']} {word['chinese']}")
        output.append({**word, "meaning": meaning, "example_zh": example_zh,
                       "example_ko": example_ko, "example_pinyin": example_pinyin})
    return sorted(output, key=lambda row: row["id"])


if __name__ == "__main__":
    catalog = build_catalog()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(catalog)} HSK4 word/example/pinyin pairs to {OUTPUT}")
