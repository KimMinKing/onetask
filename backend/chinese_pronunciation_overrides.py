"""Reviewed contextual pronunciations in the tracked HSK3/4/5 examples.

Each rule names the exact phrase containing the character whose reading changes.
The builder rejects a changed or ambiguous phrase so a future sentence edit cannot
silently inherit a pronunciation reviewed for another sentence.
"""

import re


ADVERBIAL_DI = {
    319: "高兴地", 390: "得意地", 418: "真实地", 649: "轻松地",
    676: "伤心地", 708: "热情地", 788: "兴奋地", 846: "真诚地",
    966: "不断地", 1119: "一滴一滴地", 1197: "疯狂地", 1209: "更好地",
    1216: "干脆地", 1329: "静静地", 1566: "辛勤地", 1570: "勇敢地",
    1577: "清楚地", 1582: "礼貌地", 1592: "一步一步地", 1647: "迫切地",
    1649: "期待地", 1668: "悄悄地", 1669: "悄悄地", 1703: "激情地",
    1736: "清楚地", 1766: "坚强地", 1816: "生气地", 1894: "勇敢地",
    1896: "甜甜地", 1920: "轻轻地", 1925: "无奈地", 2031: "高效地",
    2057: "紧紧地", 2105: "热情地",
}

COMPLEMENT_DE = {
    42: ("做得",), 86: ("擦得",), 95: ("刮得",), 108: ("开得",),
    123: ("做得",), 126: ("讲得",), 134: ("生活得",), 150: ("睡得",),
    186: ("吃得", "动得"), 189: ("说得",), 195: ("说得",),
    199: ("招待得",), 206: ("值得",), 229: ("说得",), 251: ("长得",),
    352: ("吵得",), 355: ("变得",), 370: ("打扮得",), 399: ("跳得",),
    405: ("进步得",), 413: ("发展得",), 441: ("开得",), 467: ("拍得",),
    495: ("玩得",), 500: ("激动得",), 535: ("紧张得",), 553: ("逗得",),
    554: ("讨论得",), 588: ("忙得",), 597: ("说得",), 607: ("设置得",),
    635: ("用得",), 732: ("弹得",), 756: ("保持得",), 761: ("写得",),
    790: ("睡得",), 830: ("逗得",), 836: ("经得起",), 857: ("增长得",),
    902: ("安排得",), 907: ("过得",), 918: ("准备得",), 937: ("背得",),
    959: ("表现得",), 966: ("弹得",), 1017: ("写得",), 1044: ("写得",),
    1161: ("冷得",), 1202: ("画得",), 1237: ("扎得",), 1256: ("唱得",),
    1317: ("挂得",), 1326: ("弄得",), 1347: ("办得",), 1379: ("煎得",),
    1400: ("开得",), 1437: ("觉得",), 1439: ("做得",), 1450: ("说得",),
    1462: ("涂得",), 1482: ("布置得",), 1483: ("装修得",),
    1555: ("运行得",), 1636: ("考得",), 1656: ("玩得",), 1692: ("玩得",),
    1715: ("安排得",), 1759: ("听得",), 1836: ("打扮得",),
    1867: ("表现得",), 1923: ("装饰得",), 1924: ("收拾得",),
    1935: ("处理得",), 1975: ("吹得",), 2018: ("疼得",), 2046: ("长得",),
    2051: ("拉得",), 2070: ("适应得",), 2157: ("表现得",),
    2171: ("布置得",), 2203: ("醉得",),
}

MUST_DEI = {770: "我得去", 1119: "得赶紧"}
ASPECT_ZHE = {1664: "守着", 1961: "象征着"}
ASPECT_LE = {
    867: "证明了", 1163: "发明了", 1422: "得到了", 1626: "批评了",
    1675: "带来了", 1868: "统一了", 1997: "吸引了",
    2001: "叙述了", 2100: "带来了",
}

# The final 儿 shares the preceding syllable in these conversational forms.
# Tone sandhi makes 一 in 一会儿 second tone.
ERHUA = {
    80: ("哪儿", "nǎ ér", "nǎr"),
    276: ("一会儿", "yī huì er", "yí huìr"),
    1060: ("一会儿", "yī huì er", "yí huìr"),
    1440: ("一会儿", "yī huì er", "yí huìr"),
    1743: ("一会儿", "yī huì er", "yí huìr"),
    1782: ("使劲儿", "shǐ jìn ér", "shǐ jìnr"),
    1974: ("一会儿", "yī huì er", "yí huìr"),
}

# The lexical word is pronounced with the tones recorded in the vocabulary
# field even when pypinyin assigns a standalone-character tone in the sentence.
TARGET_READING_IDS = {
    34, 53, 63, 67, 77, 94, 102, 103, 127, 174, 176, 188, 195, 211,
    212, 230, 249, 258, 265, 287, 291, 292, 294,
    365, 370, 401, 445, 480, 492, 496, 558, 568, 573, 585, 590,
    601, 602, 628, 639, 647, 663, 666, 675, 688, 703, 730, 759,
    779, 870, 888,
    962, 973, 1016, 1042, 1082, 1087, 1088, 1089, 1101, 1113,
    1123, 1130, 1140, 1163, 1228, 1255, 1256, 1269, 1279, 1287,
    1312, 1326, 1396, 1409, 1415, 1427, 1445, 1469, 1470, 1517,
    1527, 1528, 1548, 1559, 1569, 1571, 1589, 1671, 1713, 1737,
    1744, 1814, 1836, 1877, 1906, 1909, 1939, 2022, 2054, 2085, 2153,
}

# These two vocabulary fields, rather than their examples, had incorrect tones.
WORD_PINYIN_CORRECTIONS = {
    445: ("刚刚", "gāng gāng"), 639: ("起来", "qǐ lai"),
    666: ("任务", "rèn wù"), 1675: ("侵略", "qīn lüè"),
    1737: ("扇子", "shàn zi"), 1762: ("省略", "shěng lüè"),
    1782: ("使劲儿", "shǐ jìnr"), 1571: ("面积", "miàn jī"),
    1909: ("位置", "wèi zhì"),
}
WORD_SOURCE_PINYIN = {
    445: "gāng gang", 639: "qi lai", 666: "rèn wu",
    1675: "qīn lvè", 1737: "shān zi", 1762: "shěng lvè",
    1782: "shǐ jìn ér", 1571: "miàn ji", 1909: "wèi zhi",
}

# Other catalog words appearing inside a different card's sentence. The source
# converter consistently used standalone character tones for these phrases.
# 一 and 不 sandhi is deliberately absent: those change with the next tone.
CROSS_WORD_READINGS = {
    "起来": "qǐ lai", "还是": "hái shi", "困难": "kùn nan",
    "地方": "dì fang", "别人": "bié ren", "清楚": "qīng chu",
    "消息": "xiāo xi", "故事": "gù shi", "味道": "wèi dao",
    "知识": "zhī shi", "照片": "zhào piàn", "舒服": "shū fu",
    "过去": "guò qu", "忍不住": "rěn bu zhù", "任务": "rèn wù",
    "爷爷": "yé ye", "麻烦": "má fan", "合同": "hé tong",
    "热闹": "rè nao", "肚子": "dù zi", "奶奶": "nǎi nai",
    "照顾": "zhào gu", "刚刚": "gāng gāng", "为了": "wèi le",
    "态度": "tài du", "行李箱": "xíng li xiāng",
    "聪明": "cōng ming", "头发": "tóu fa", "下载": "xià zǎi",
    "了解": "liǎo jiě", "处理": "chǔ lǐ", "好处": "hǎo chu",
    "面积": "miàn jī", "位置": "wèi zhì", "道理": "dào li",
    "教训": "jiào xun", "马虎": "mǎ hu", "力量": "lì liang",
    "成为": "chéng wéi", "都会": "dōu huì",
    "适应": "shì yìng", "参加": "cān jiā", "打招呼": "dǎ zhāo hu",
    "月亮": "yuè liang", "师傅": "shī fu", "说不定": "shuō bu dìng",
    "讲究": "jiǎng jiu", "不好意思": "bù hǎo yì si",
    "应付": "yìng fu", "逻辑": "luó ji", "脾气": "pí qi",
    "要是": "yào shi", "调整": "tiáo zhěng", "豆腐": "dòu fu",
    "光滑": "guāng hua", "打扮": "dǎ ban", "收拾": "shōu shi",
    "粮食": "liáng shi", "明白": "míng bai", "厉害": "lì hai",
    "运气": "yùn qi", "戒指": "jiè zhi", "大方": "dà fang",
    "耽误": "dān wu", "泄露": "xiè lòu", "玻璃": "bō li",
    "周到": "zhōu dao", "帐篷": "zhàng peng", "行为": "xíng wéi",
    "同事": "tóng shì", "发展": "fā zhǎn", "过分": "guò fèn",
    "干净": "gān jìng", "散发": "sàn fā", "长辈": "zhǎng bèi",
    "相关": "xiāng guān", "答应": "dā ying", "电子": "diàn zǐ",
    "个体": "gè tǐ", "扎实": "zhā shi", "迷惑": "mí huo",
    "委屈": "wěi qu", "规矩": "guī ju",
    "疏忽": "shū hu", "发现": "fā xiàn", "宽敞": "kuān chang",
    "姑娘": "gū niang", "叔叔": "shū shu", "分裂": "fēn liè",
    "关系": "guān xì", "没关系": "méi guān xi",
    "护士": "hù shi",
}

REVIEWED_IDS = (set(ADVERBIAL_DI) | set(COMPLEMENT_DE) | set(MUST_DEI)
                | set(ASPECT_ZHE) | set(ASPECT_LE) | set(ERHUA) | TARGET_READING_IDS)


def correct_target_reading(word_id: int, sentence: str, pinyin: str,
                           word: str, word_pinyin: str) -> str:
    """Replace the one taught word's reading with its reviewed lexical reading."""
    if word_id not in TARGET_READING_IDS:
        return pinyin
    if sentence.count(word) != 1:
        raise ValueError(f"Target-reading review sentence changed: {word_id} {word}")
    units = re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", sentence)
    matches = list(re.finditer(r"[^\W\d_]+", pinyin))
    want = re.findall(r"[^\W\d_]+", word_pinyin)
    if len(units) != len(matches) or len(want) != len(word):
        raise ValueError(f"Target-reading review alignment changed: {word_id}")
    index = len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", sentence[:sentence.index(word)]))
    result = pinyin
    for i in reversed(range(len(want))):
        match = matches[index + i]
        result = result[:match.start()] + want[i].lower() + result[match.end():]
    return result


def correct_pinyin(word_id: int, sentence: str, pinyin: str) -> str:
    """Apply only reviewed contextual readings, preserving all other syllables."""
    if word_id not in REVIEWED_IDS and not any(phrase in sentence for phrase in CROSS_WORD_READINGS):
        return pinyin
    units = re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", sentence)
    tokens = re.findall(r"[^\W\d_]+", pinyin)
    if len(units) != len(tokens):
        raise ValueError(f"Cannot align example pinyin: {word_id}")

    def change(phrase: str, character: str, reading: str) -> None:
        if sentence.count(phrase) != 1 or phrase.count(character) != 1:
            raise ValueError(f"Pronunciation review phrase changed: {word_id} {phrase}")
        offset = sentence.index(phrase) + phrase.index(character)
        index = len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", sentence[:offset]))
        if units[index] != character:
            raise ValueError(f"Pronunciation review alignment changed: {word_id} {phrase}")
        tokens[index] = reading

    for phrase, reading in CROSS_WORD_READINGS.items():
        if phrase not in sentence:
            continue
        syllables = re.findall(r"[^\W\d_]+", reading)
        if len(syllables) != len(phrase):
            raise ValueError(f"Cross-word pronunciation length changed: {phrase}")
        for match in re.finditer(re.escape(phrase), sentence):
            if phrase == "为了" and sentence[max(0, match.start() - 1):match.end()] == "成为了":
                continue
            if word_id == 1422 and phrase == "了解":  # 得到了 + 解放
                continue
            if phrase == "地方" and sentence[match.start():match.end() + 1] == "地方言":
                continue  # 各地 + 方言
            if phrase == "好处" and sentence[max(0, match.start() - 2):match.end()] == "恰到好处":
                continue
            index = len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z]+", sentence[:match.start()]))
            if units[index:index + len(phrase)] != list(phrase):
                raise ValueError(f"Cross-word pronunciation alignment changed: {word_id} {phrase}")
            tokens[index:index + len(phrase)] = syllables

    if word_id in ADVERBIAL_DI:
        change(ADVERBIAL_DI[word_id], "地", "de")
    for phrase in COMPLEMENT_DE.get(word_id, ()):
        change(phrase, "得", "de")
    if word_id in MUST_DEI:
        change(MUST_DEI[word_id], "得", "děi")
    if word_id in ASPECT_ZHE:
        change(ASPECT_ZHE[word_id], "着", "zhe")
    if word_id in ASPECT_LE:
        change(ASPECT_LE[word_id], "了", "le")
    corrected = " ".join(tokens)
    if word_id in ERHUA:
        phrase, before, after = ERHUA[word_id]
        if sentence.count(phrase) != 1 or corrected.count(before) != 1:
            raise ValueError(f"Erhua review phrase changed: {word_id} {phrase}")
        corrected = corrected.replace(before, after, 1)
    # Preserve punctuation and word spacing in the source transcription.
    original = pinyin
    old_tokens = list(re.finditer(r"[^\W\d_]+", original))
    if len(old_tokens) != len(tokens):
        raise ValueError(f"Pronunciation token count changed: {word_id}")
    for match, replacement in reversed(list(zip(old_tokens, tokens))):
        original = original[:match.start()] + replacement + original[match.end():]
    if word_id in ERHUA:
        phrase, before, after = ERHUA[word_id]
        if original.count(before) != 1:
            raise ValueError(f"Erhua source reading changed: {word_id} {phrase}")
        original = original.replace(before, after, 1)
    return original
