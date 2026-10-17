from pathlib import Path
from types import SimpleNamespace

from word_images import image_path_for, verified_image


def test_shifted_hsk4_image_is_matched_by_word_identity(tmp_path: Path):
    word = SimpleNamespace(id=393, hsk_level=4, chinese="底", pinyin="dǐ",
                           meaning="바닥, 밑", example_zh="行李箱放在床底下了。",
                           image_path="test_output/hsk4/word_393.webp")
    old_image = tmp_path / "hsk4" / "word_392.webp"
    old_image.parent.mkdir()
    old_image.write_bytes(b"verified old image")

    path, version = verified_image(word, tmp_path)
    assert path == "test_output/hsk4/word_392.webp"
    assert version

    word.example_zh = "다른 단어의 예문"
    assert verified_image(word, tmp_path) == (None, None)


def test_new_image_filename_tracks_content_and_cache_version(tmp_path: Path):
    word = SimpleNamespace(id=5000, hsk_level=5, chinese="学习", pinyin="xuéxí",
                           meaning="공부하다", example_zh="我学习中文。")
    word.image_path = image_path_for(word.hsk_level, word.id, word.chinese,
                                     word.pinyin, word.meaning, word.example_zh)
    image = tmp_path / word.image_path.removeprefix("test_output/")
    image.parent.mkdir()
    image.write_bytes(b"first")
    path, version = verified_image(word, tmp_path)
    assert path == word.image_path
    image.write_bytes(b"updated image content")
    assert verified_image(word, tmp_path)[1] != version

    word.meaning = "다른 뜻"
    assert verified_image(word, tmp_path) == (None, None)
