"""Reviewed meanings and beginner examples for the A1 words in the legacy SQL.

The old import used one machine-selected Korean gloss per word. These entries
keep common meanings together and give a short sentence for the primary use.
"""

from sqlalchemy import bindparam, inspect, text


# word: (Korean meanings, English example, Korean translation)
BEGINNER_WORDS = {
    "and": ("그리고; ~와/과", "I have a pen and a book.", "나는 펜과 책이 있어."),
    "with": ("~와 함께; ~을 가지고", "I went with my friend.", "나는 친구와 함께 갔어."),
    "from": ("~에서; ~로부터", "I am from Korea.", "나는 한국 출신이야."),
    "this": ("이것; 이", "This is my bag.", "이것은 내 가방이야."),
    "his": ("그의; 그의 것", "This is his book.", "이것은 그의 책이야."),
    "not": ("~이 아니다; ~하지 않다", "I am not tired.", "나는 피곤하지 않아."),
    "which": ("어느; 어느 것", "Which book do you want?", "어느 책을 원해?"),
    "also": ("또한; ~도", "She also likes music.", "그녀도 음악을 좋아해."),
    "but": ("하지만; 그러나", "I am tired, but I can help.", "나는 피곤하지만 도울 수 있어."),
    "one": ("하나; 한 사람/개", "I have one key.", "나는 열쇠 하나가 있어."),
    "first": ("첫 번째의; 먼저", "This is my first day.", "오늘은 내 첫날이야."),
    "you": ("너; 당신; 너희", "You are my friend.", "너는 내 친구야."),
    "they": ("그들; 그것들", "They are at school.", "그들은 학교에 있어."),
    "all": ("모두; 모든", "All the doors are open.", "모든 문이 열려 있어."),
    "their": ("그들의", "Their house is near here.", "그들의 집은 여기 가까이에 있어."),
    "there": ("거기에; there is/are에서 ‘~이 있다’", "There is a book on the table.", "탁자 위에 책 한 권이 있어."),
    "people": ("사람들; 사람", "Many people are here.", "많은 사람이 여기 있어."),
    "other": ("다른; 다른 것", "Show me the other key.", "다른 열쇠를 보여 줘."),
    "two": ("둘; 두 개의", "I have two bags.", "나는 가방 두 개가 있어."),
    "her": ("그녀를/그녀에게; 그녀의", "I gave her a book.", "나는 그녀에게 책을 줬어."),
    "more": ("더; 더 많은", "I need more water.", "나는 물이 더 필요해."),
    "she": ("그녀는; 그녀가", "She is my friend.", "그녀는 내 친구야."),
    "about": ("~에 대해/관해; 약/대략; about to는 ‘막 ~하려고’", "Tell me about your day.", "네 하루에 대해 말해 줘."),
    "when": ("언제; ~할 때", "When do you leave?", "너는 언제 떠나?"),
    "time": ("시간; 때; 번", "What time is it?", "몇 시야?"),
    "only": ("오직; 단지; 유일한", "I only have one key.", "나는 열쇠가 하나밖에 없어."),
    "some": ("몇몇의; 약간의", "I need some water.", "나는 물이 좀 필요해."),
    "out": ("밖으로; 밖에", "Please go out.", "밖으로 나가 줘."),
    "most": ("대부분의; 가장 많은", "Most students are here.", "학생 대부분이 여기 있어."),
    "then": ("그때; 그러면; 그다음에", "Eat first, then rest.", "먼저 먹고 그다음에 쉬어."),
    "where": ("어디; 어디에", "Where is my bag?", "내 가방은 어디에 있어?"),
    "him": ("그를; 그에게", "I gave him the key.", "나는 그에게 열쇠를 줬어."),
    "them": ("그들을; 그들에게; 그것들을", "I can see them.", "나는 그들을 볼 수 있어."),
    "just": ("방금; 단지; 딱", "I just got home.", "나는 방금 집에 왔어."),
    "now": ("지금; 이제", "We can go now.", "이제 가도 돼."),
    "because": ("~때문에; 왜냐하면", "I stayed home because it rained.", "비가 와서 집에 있었어."),
    "very": ("매우; 아주", "This is very good.", "이건 아주 좋아."),
    "how": ("어떻게; 얼마나", "How do you make this?", "이건 어떻게 만들어?"),
    "back": ("뒤; 뒤로; 돌아와서", "Please come back.", "다시 돌아와 줘."),
    "way": ("길; 방법", "This is the way home.", "이쪽이 집에 가는 길이야."),
    "good": ("좋은; 잘하는", "This is a good idea.", "이건 좋은 생각이야."),
    "much": ("많은(셀 수 없는 것); 많이", "We do not have much time.", "우리에게 시간이 많지 않아."),
    "think": ("생각하다; ~라고 여기다", "I think you are right.", "나는 네 말이 맞다고 생각해."),
    "said": ("말했다(say의 과거형)", "She said hello.", "그녀가 인사했어."),
    "get": ("받다; 얻다; ~한 상태가 되다", "I got a letter.", "나는 편지를 받았어."),
    "our": ("우리의", "This is our room.", "여기는 우리 방이야."),
}

MARKER = "english_beginner_meanings_v1"


def apply_english_beginner_words(engine) -> int:
    inspector = inspect(engine)
    if not inspector.has_table("english_words") or not inspector.has_table("migration_markers"):
        return 0
    with engine.begin() as connection:
        if connection.execute(text("SELECT 1 FROM migration_markers WHERE name=:name"), {"name": MARKER}).first():
            return 0
        present = {row[0].lower() for row in connection.execute(text(
            "SELECT word FROM english_words WHERE lower(word) IN :words"
        ).bindparams(bindparam("words", expanding=True)),
            {"words": tuple(BEGINNER_WORDS)}).all()}
        if not present:
            return 0
        rows = [dict(word=word, meaning=values[0], example_en=values[1], example_ko=values[2])
                for word, values in BEGINNER_WORDS.items() if word in present]
        connection.execute(text("""
            UPDATE english_words SET meaning=:meaning, example_en=:example_en, example_ko=:example_ko
            WHERE lower(word)=:word
        """), rows)
        connection.execute(text("INSERT INTO migration_markers (name) VALUES (:name)"), {"name": MARKER})
    return len(rows)
