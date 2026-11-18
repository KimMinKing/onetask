import json
from pathlib import Path
from types import SimpleNamespace

from chinese_word_view import canonical_pinyin, word_content
from models import Word
from routers.words import _word_with_card
from routers.search import _zh_word_with_card
from word_pair_migration import CATALOG, HSK35_CATALOG


def test_all_2200_catalog_pairs_override_stale_card_text():
    hsk4 = json.loads(Path(CATALOG).read_text(encoding="utf-8"))
    hsk35 = json.loads(Path(HSK35_CATALOG).read_text(encoding="utf-8"))
    for pair in hsk4 + hsk35:
        word = SimpleNamespace(
            id=pair["id"], hsk_level=pair.get("hsk_level", 4),
            chinese=pair["chinese"], pinyin=pair["pinyin"], meaning="old meaning",
            example_zh="old sentence", example_ko="old translation",
            example_pinyin="old pinyin",
        )
        content, stale = word_content(word)
        assert stale, pair["id"]
        assert content["example_zh"] == pair["example_zh"], pair["id"]
        assert content["example_pinyin"] == pair["example_pinyin"], pair["id"]
        assert content["example_ko"] == pair["example_ko"], pair["id"]
        assert content["meaning"] == (pair["meaning"] if word.hsk_level == 4 else word.meaning)


def test_wrong_word_identity_hides_old_example_instead_of_attaching_it_to_another_word():
    word = SimpleNamespace(id=751, hsk_level=4, chinese="别的词", pinyin="bié de cí",
                           meaning="other", example_zh="雨天路滑。", example_ko="비가 온다.",
                           example_pinyin="yǔ tiān lù huá。")
    content, stale = word_content(word)
    assert stale
    assert content["example_zh"] is None
    assert content["example_pinyin"] is None


def test_card_api_returns_corrected_tuo_pair_even_when_database_is_stale():
    word = Word(id=751, hsk_level=4, chinese="脱", pinyin="tuō", meaning="old",
                example_zh="雨天路滑，骑车要特别注意，很危险。",
                example_ko="old translation",
                example_pinyin="yǔ tiān lù huá，qí chē yào tè bié zhù yì，hěn wēi xiǎn。")
    payload = _word_with_card(word, None)
    assert payload["example_zh"] == "进门前请脱鞋，谢谢配合。"
    assert payload["example_pinyin"] == "jìn mén qián qǐng tuō xié ， xiè xiè pèi hé 。"
    assert payload["image_path"] is None
    search_payload = _zh_word_with_card(word, None)
    assert search_payload["example_zh"] == payload["example_zh"]
    assert search_payload["example_pinyin"] == payload["example_pinyin"]


def test_legacy_word_pinyin_is_corrected_in_card_and_search():
    pair = next(row for row in json.loads(Path(HSK35_CATALOG).read_text(encoding="utf-8"))
                if row["id"] == 1737)
    word = Word(id=1737, hsk_level=5, chinese="扇子", pinyin="shān zi",
                meaning="부채", example_zh="old", example_ko="old", example_pinyin="old")
    assert canonical_pinyin(word) == "shàn zi"
    assert _word_with_card(word, None)["pinyin"] == pair["pinyin"]
    assert _zh_word_with_card(word, None)["example_pinyin"] == pair["example_pinyin"]
