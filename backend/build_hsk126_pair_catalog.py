"""Build HSK1/2/6 example/pinyin pairs missing from the tracked SQL dump.

Run from the repository root after installing pypinyin:
    python backend/build_hsk126_pair_catalog.py
"""

import json
import re
from pathlib import Path

from pypinyin import Style, lazy_pinyin

from chinese_pronunciation_overrides import correct_pinyin


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = Path(__file__).resolve().parent / "data/hsk126_word_pairs.json"

# Sentence and Korean translation are reviewed together. The legacy sentences
# taught a synonym, a different reading, or split the taught word across words.
EXAMPLE_CORRECTIONS = {
    4773: ("没关系！我来做！", "괜찮아요! 제가 할게요!"),
    3892: ("他在狱中受罪多年，出狱后仍常做噩梦。", "그는 감옥에서 여러 해 고생했고, 출소 후에도 악몽을 자주 꾼다."),
    3247: ("他突然站起来的举动让大家都很惊讶。", "그가 갑자기 일어선 행동에 모두 놀랐다."),
    3382: ("他解释了迟到的原因，希望得到老师的谅解。", "그는 지각한 이유를 설명하며 선생님의 양해를 구했다."),
    2710: ("闻到腐烂的食物，他觉得恶心，差点吐了。", "상한 음식 냄새를 맡자 그는 메스꺼워서 거의 토할 뻔했다."),
    2812: ("他觉得能和家人一起吃饭就是福气。", "그는 가족과 함께 식사할 수 있는 것이 복이라고 생각한다."),
    2846: ("货船一早驶进港口，工人们开始卸货。", "화물선이 아침 일찍 항구에 들어오자 노동자들이 짐을 내리기 시작했다."),
    3239: ("学生向老师鞠躬，感谢老师的帮助。", "학생은 선생님께 허리를 숙여 인사하며 도움에 감사했다."),
    3435: ("家人把老人埋葬在家乡的山坡上。", "가족들은 노인을 고향의 산비탈에 묻었다."),
    4284: ("老板长期压榨工人，让他们加班却不给加班费。", "사장은 노동자들을 오랫동안 착취하며 야근을 시키고도 수당을 주지 않았다."),
    2523: ("他在大庭广众之下出洋相，脸一下子红了。", "그는 많은 사람 앞에서 망신을 당해 얼굴이 순식간에 빨개졌다."),
    2575: ("他因合同纠纷决定打官司，向法院提起诉讼。", "그는 계약 분쟁으로 소송을 하기로 하고 법원에 소송장을 냈다."),
    4868: ("这条路很长，走到尽头要半个小时。", "이 길은 길어서 끝까지 걸어가려면 30분이 걸린다."),
    3900: ("他数了数桌上的苹果，一共有五个。", "그는 탁자 위의 사과를 세어 보니 모두 다섯 개였다."),
    4175: ("两个方案的成本相差不大。", "두 방안의 비용 차이는 크지 않다."),
    4741: ("我买了一个苹果。", "나는 사과 한 개를 샀다."),
    4861: ("这张纸很白。", "이 종이는 아주 하얗다."),
    4944: ("这道题很难。", "이 문제는 어렵다."),
}

WORD_CORRECTIONS = {
    3541: ("欧洲", "ōu zhōu", None),
    2426: ("策略", "cè lüè", None),
    2710: ("恶心", "ě xīn", "메스껍다, 역겹다"),
    2995: ("哄", "hǒng", None),
    3008: ("忽略", "hū lüè", None),
    3426: ("掠夺", "lüè duó", None),
    3427: ("略微", "lüè wēi", None),
    3538: ("虐待", "nüè dài", None),
    3864: ("势力", "shì lì", None),
    3896: ("书记", "shū jì", None),
    3900: ("数", "shǔ", "세다, 헤아리다"),
    4236: ("兴高采烈", "xìng gāo cǎi liè", None),
    4493: ("战略", "zhàn lüè", None),
    4902: ("好吃", "hǎo chī", None),
    4948: ("便宜", "pián yi", None),
}

# Explicitly reviewed target readings that the character converter gets wrong
# in these sentences. 一/不 tone sandhi and ordinary erhua are handled below.
TARGET_READING_CORRECTIONS = {
    2212, 2232, 2235, 2258, 2302, 2311, 2351, 2475, 2522, 2560,
    2575, 2578, 2587, 2606, 2696, 2708, 2787, 2806, 2812, 2879,
    2982, 2993, 2995, 3226, 3318, 3319, 3324, 3333, 3342, 3464,
    3491, 3522, 3539, 3571, 3601, 3607, 3613, 3695, 3737, 3770,
    3846, 3864, 3896, 3899, 3900, 3913, 3950, 3965, 3992, 4042,
    4046, 4048, 4175, 4205, 4236, 4392, 4431, 4458, 4480, 4502,
    4571, 4639, 4655, 4713, 4729, 4732, 4734, 4769, 4773, 4777,
    4787, 4788, 4796, 4803, 4806, 4824, 4828, 4833, 4835, 4868,
    4891, 4892, 4902, 4917, 4948, 4968, 4977, 4979, 4998,
}

ERHUA_READINGS = {
    2583: ("大伙儿", "dà huǒr"), 3503: ("墨水儿", "mò shuǐr"),
    3511: ("纳闷儿", "nà mènr"), 3957: ("摊儿", "tānr"),
    4060: ("玩意儿", "wán yìr"), 4173: ("馅儿", "xiànr"),
    4216: ("心眼儿", "xīn yǎnr"), 4779: ("哪儿", "nǎr"),
    4839: ("一点儿", "yì diǎnr"),
}

ADVERBIAL_DI = {
    2310: "不停地", 2338: "辩证地", 2384: "不时地", 2389: "不择手段地",
    2412: "残忍地", 2443: "猖狂地", 2557: "细心地", 2559: "从容不迫地",
    2630: "生气地", 2704: "整齐地", 2735: "有力地", 2740: "勇敢地",
    2781: "依依不舍地", 2906: "整齐地", 2925: "缓缓地", 3086: "急切地",
    3117: "坚定地", 3222: "兢兢业业地", 3276: "平等地", 3317: "轻松地",
    3358: "理直气壮地", 3368: "力所能及地", 3388: "零星地",
    3412: "紧紧地", 3414: "缓缓地", 3423: "络绎不绝地",
    3501: "莫名其妙地", 3502: "默默地", 3603: "迫不及待地",
    3652: "千方百计地", 3712: "全力以赴地", 3804: "痛苦地",
    3860: "清楚地", 3927: "肆无忌惮地", 3959: "坦白地",
    4046: "紧张地", 4065: "惋惜地", 4073: "威风凛凛地",
    4108: "无耻地", 4114: "无可奈何地", 4120: "无忧无虑地",
    4169: "更好地", 4194: "小心翼翼地", 4204: "礼貌地",
    4217: "辛勤地", 4236: "兴高采烈地", 4237: "兴致勃勃地",
    4305: "精彩地", 4324: "咬牙切齿地", 4362: "一如既往地",
    4481: "紧张地", 4487: "斩钉截铁地", 4534: "争先恐后地",
    4592: "如一日地", 4593: "忠实地", 4618: "不停地",
    4622: "慢慢地", 4677: "自发地", 4841: "好心地",
}

COMPLEMENT_DE = {
    2214: "写得", 2292: "背诵得", 2392: "规划得", 2393: "布置得",
    2438: "馋得", 2442: "害怕得", 2455: "变得", 2521: "听得",
    2538: "喘得", 2707: "冷得", 3052: "变得", 3152: "变得",
    3191: "听得", 3409: "举办得", 3429: "变得", 3448: "长得",
    3686: "变得", 3756: "溶解得", 3849: "过得", 3877: "发展得",
    3894: "写得", 4043: "处理得", 4164: "打理得", 4165: "衔接得",
    4182: "传得", 4214: "舍得", 4320: "摇晃得", 4445: "熨得",
    4511: "组织得", 4525: "表现得", 4567: "变得", 4723: "说得",
    4809: "重得", 4865: "重得", 4926: "惊得",
}

ASPECT_ZHE = {3123: "监视着", 3328: "扮演着", 3461: "眯着"}
ASPECT_LE = {
    2221: "暗示了", 2412: "对待了", 2472: "陈述了", 3125: "代表了",
    3243: "造成了", 3465: "吸引了", 4051: "歪曲了", 4232: "救治了",
    4254: "写明了", 4516: "查明了", 4657: "吸引了",
}


def _replace_reviewed_char(word_id: int, sentence: str, pinyin: str,
                           phrase: str, character: str, reading: str) -> str:
    if sentence.count(phrase) != 1 or phrase.count(character) != 1:
        raise ValueError(f"Reviewed particle phrase changed: {word_id} {phrase}")
    position = sentence.index(phrase) + phrase.index(character)
    index = len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", sentence[:position]))
    matches = list(re.finditer(r"[^\W\d_]+", pinyin))
    if index >= len(matches):
        raise ValueError(f"Reviewed particle alignment changed: {word_id}")
    match = matches[index]
    return pinyin[:match.start()] + reading + pinyin[match.end():]


def _word_syllables(word_id: int, word: str, pinyin: str) -> list[str]:
    tokens = re.findall(r"[^\W\d_]+", pinyin.lower())
    if len(tokens) == len(word):
        return tokens
    if word_id == 3522:  # 嗯: the source uses en, the converter uses ń.
        return ["en"]
    plain_syllables = lazy_pinyin(word, style=Style.NORMAL)
    joined = "".join(tokens)
    if sum(map(len, plain_syllables)) != len(joined):
        raise ValueError(f"Cannot split word pinyin into syllables: {word_id} {word}")
    result = []
    start = 0
    for syllable in plain_syllables:
        result.append(joined[start:start + len(syllable)])
        start += len(syllable)
    return result


def _replace_target_reading(row: dict, pinyin: str) -> str:
    word_id = row["id"]
    if word_id not in TARGET_READING_CORRECTIONS:
        return pinyin
    sentence, word = row["example_zh"], row["chinese"]
    units = re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", sentence)
    tokens = re.findall(r"[^\W\d_]+", pinyin)
    expected = _word_syllables(word_id, word, row["pinyin"])
    if len(units) != len(tokens) or len(expected) != len(word):
        raise ValueError(f"Target reading cannot be aligned: {word_id}")
    for match in re.finditer(re.escape(word), sentence):
        index = len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", sentence[:match.start()]))
        tokens[index:index + len(word)] = expected
    matches = list(re.finditer(r"[^\W\d_]+", pinyin))
    for match, replacement in reversed(list(zip(matches, tokens))):
        pinyin = pinyin[:match.start()] + replacement + pinyin[match.end():]
    return pinyin


def _apply_tone_sandhi(sentence: str, pinyin: str) -> str:
    """Write the spoken tones of 一 and 不 before the next syllable."""
    units = re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", sentence)
    matches = list(re.finditer(r"[^\W\d_]+", pinyin))
    if len(units) != len(matches):
        raise ValueError("Tone sandhi requires one token per written unit")
    tokens = [match.group() for match in matches]
    for i, char in enumerate(units[:-1]):
        if char == "一" and tokens[i] in ("yī", "yí", "yì"):
            if i and units[i - 1] in ("第", "唯", "统"):
                tokens[i] = "yī"
                continue
            if units[i + 1] in ("月", "日", "号"):
                continue
            fourth = any(char in "àèìòùǜ" for char in tokens[i + 1])
            tokens[i] = "yí" if fourth else "yì"
        elif char == "不" and tokens[i] in ("bù", "bú"):
            tokens[i] = "bú" if any(char in "àèìòùǜ" for char in tokens[i + 1]) else "bù"
    for match, replacement in reversed(list(zip(matches, tokens))):
        pinyin = pinyin[:match.start()] + replacement + pinyin[match.end():]
    return pinyin


def build_catalog() -> list[dict]:
    lines = (ROOT / "onetask_dump.sql").read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(lines) if line.startswith("COPY public.words (")) + 1
    pairs = {}
    for line in lines[start:]:
        if line == r"\.":
            break
        fields = line.split("\t")
        if fields[8] not in ("1", "2", "6"):
            continue
        word_id = int(fields[0])
        pairs[word_id] = {
            "id": word_id, "hsk_level": int(fields[8]),
            "chinese": fields[1], "pinyin": fields[2], "meaning": fields[3],
            "example_zh": fields[4], "example_ko": fields[5],
        }
    if len(pairs) != 2797:
        raise ValueError(f"Expected 2797 HSK1/2/6 words; got {len(pairs)}")
    for word_id, (sentence, translation) in EXAMPLE_CORRECTIONS.items():
        row = pairs[word_id]
        row.update(example_zh=sentence, example_ko=translation)
    for word_id, (word, pinyin, meaning) in WORD_CORRECTIONS.items():
        row = pairs[word_id]
        if row["chinese"] != word:
            raise ValueError(f"Word identity changed: {word_id}")
        if row["pinyin"] != pinyin:
            row["source_pinyin"] = row["pinyin"]
        row["pinyin"] = pinyin
        if meaning is not None:
            row["meaning"] = meaning
    for row in pairs.values():
        sentence = row["example_zh"]
        if not sentence or row["chinese"] not in sentence:
            raise ValueError(f"Example does not teach its word: {row['id']} {row['chinese']}")
        generated = " ".join(lazy_pinyin(sentence, style=Style.TONE, errors="default"))
        generated = correct_pinyin(row["id"], sentence, generated)
        generated = _replace_target_reading(row, generated)
        for rules, character, reading in (
            (ADVERBIAL_DI, "地", "de"), (COMPLEMENT_DE, "得", "de"),
            (ASPECT_ZHE, "着", "zhe"), (ASPECT_LE, "了", "le"),
        ):
            if row["id"] in rules:
                generated = _replace_reviewed_char(row["id"], sentence, generated,
                                                   rules[row["id"]], character, reading)
        generated = _apply_tone_sandhi(sentence, generated)
        if row["id"] == 4717:  # 不客气: bú before kè; 气 is neutral.
            generated = generated.replace("bú kè qì", "bú kè qi")
        if row["id"] in ERHUA_READINGS:
            phrase, merged = ERHUA_READINGS[row["id"]]
            if sentence.count(phrase) != 1:
                raise ValueError(f"Erhua sentence changed: {row['id']}")
            start = sentence.index(phrase)
            index = len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", sentence[:start]))
            matches = list(re.finditer(r"[^\W\d_]+", generated))
            if len(matches) != len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", sentence)):
                raise ValueError(f"Erhua alignment changed: {row['id']}")
            first, last = matches[index], matches[index + len(phrase) - 1]
            generated = generated[:first.start()] + merged + generated[last.end():]
        row["example_pinyin"] = generated
        units = re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", sentence)
        tokens = re.findall(r"[^\W\d_]+", row["example_pinyin"])
        if len(units) - (1 if row["id"] in ERHUA_READINGS else 0) != len(tokens):
            raise ValueError(f"Example/pinyin alignment changed: {row['id']}")
    return [pairs[word_id] for word_id in sorted(pairs)]


if __name__ == "__main__":
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(build_catalog(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote 2797 HSK1/2/6 word/example/pinyin pairs to {OUTPUT}")
