"""Reviewed meanings and beginner examples for the A1 words in the legacy SQL.

The old import used one machine-selected Korean gloss per word. These entries
keep common meanings together and give a short sentence for the primary use.
"""

from pathlib import Path

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


def _load_a2_words() -> dict[str, str]:
    catalog = Path(__file__).resolve().parent / "data" / "english_a2_reviewed.tsv"
    entries = {}
    for line in catalog.read_text(encoding="utf-8").splitlines():
        word, meaning = line.split("\t", 1)
        if not word or not meaning or word in entries:
            raise ValueError(f"Invalid reviewed English entry: {word!r}")
        entries[word] = meaning
    return entries


A2_WORDS = _load_a2_words()
A2_EXAMPLES = {
    "page": ("Please turn to page five.", "5쪽을 펴 주세요."),
    "article": ("I read an article about birds.", "나는 새에 관한 글을 읽었어."),
    "made": ("She made a small box.", "그녀는 작은 상자를 만들었어."),
    "state": ("The water is in a liquid state.", "그 물은 액체 상태야."),
    "used": ("This is a used book.", "이것은 중고 책이야."),
    "march": ("My birthday is in March.", "내 생일은 3월이야."),
    "use": ("You can use my pen.", "내 펜을 써도 돼."),
    "part": ("This is my favorite part.", "이 부분이 내가 가장 좋아하는 부분이야."),
    "work": ("I work at a school.", "나는 학교에서 일해."),
    "since": ("I have lived here since May.", "나는 5월부터 여기에 살았어."),
    "however": ("I was tired. However, I kept walking.", "나는 피곤했어. 하지만 계속 걸었어."),
    "title": ("What is the title of this book?", "이 책 제목이 뭐야?"),
    "number": ("What is your phone number?", "네 전화번호가 뭐야?"),
    "area": ("This area is quiet.", "이 지역은 조용해."),
    "left": ("Turn left at the bank.", "은행에서 왼쪽으로 돌아."),
    "general": ("In general, cats like to sleep.", "일반적으로 고양이는 자는 것을 좋아해."),
    "set": ("Set the cup on the table.", "컵을 탁자 위에 놓아 줘."),
    "light": ("This bag is light.", "이 가방은 가벼워."),
    "present": ("This is a present for you.", "이것은 너에게 주는 선물이야."),
    "run": ("I run every morning.", "나는 매일 아침 달려."),
    "free": ("The tickets are free.", "표는 무료야."),
    "order": ("I ordered a bowl of soup.", "나는 수프 한 그릇을 주문했어."),
    "right": ("Turn right at the next street.", "다음 길에서 오른쪽으로 돌아."),
    "second": ("This is my second try.", "이것은 내 두 번째 시도야."),
    "bill": ("Please bring me the bill.", "계산서를 가져다주세요."),
    "account": ("I opened a bank account.", "나는 은행 계좌를 열었어."),
    "bank": ("I put my money in the bank.", "나는 돈을 은행에 넣었어."),
    "found": ("I found my lost key.", "나는 잃어버린 열쇠를 찾았어."),
    "full": ("The cup is full of water.", "컵에 물이 가득 차 있어."),
    "close": ("Please close the door.", "문을 닫아 줘."),
    "race": ("She won the race.", "그녀는 경주에서 이겼어."),
    "sound": ("That sounds good.", "그거 좋게 들려."),
    "mean": ("What does this word mean?", "이 단어는 무슨 뜻이야?"),
    "current": ("What is your current address?", "지금 주소가 뭐야?"),
    "case": ("In this case, we should wait.", "이 경우에는 기다려야 해."),
    "lead": ("Please lead the way.", "길을 안내해 줘."),
    "note": ("I wrote a short note.", "나는 짧은 메모를 썼어."),
    "cover": ("Cover the pot with a lid.", "냄비를 뚜껑으로 덮어."),
    "date": ("What is the date today?", "오늘 날짜가 며칠이야?"),
    "fine": ("I feel fine now.", "나는 이제 괜찮아."),
    "charge": ("I need to charge my phone.", "휴대전화를 충전해야 해."),
    "save": ("Save your work before you leave.", "나가기 전에 작업을 저장해."),
    "waiting": ("I am waiting for you.", "나는 너를 기다리고 있어."),
}
REVIEWED_WORDS = frozenset(BEGINNER_WORDS) | frozenset(A2_WORDS)
REVIEW_MARKER = "english_reviewed_a1_a2_v2"


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


def apply_english_reviewed_words(engine) -> int:
    """Reconcile reviewed meanings on startup, including after a legacy SQL rerun."""
    inspector = inspect(engine)
    if not inspector.has_table("english_words") or not inspector.has_table("migration_markers"):
        return 0
    expected = {
        **{word: values for word, values in BEGINNER_WORDS.items()},
        **{word: (meaning, *(A2_EXAMPLES.get(word) or (None, None))) for word, meaning in A2_WORDS.items()},
    }
    columns = {column["name"] for column in inspector.get_columns("english_words")}
    has_zh = {"meaning_zh", "example_zh"} <= columns
    query = text("""
        SELECT word, meaning, example_en, example_ko
        FROM english_words WHERE lower(word) IN :words
    """).bindparams(bindparam("words", expanding=True))
    with engine.begin() as connection:
        marker = connection.execute(
            text("SELECT 1 FROM migration_markers WHERE name=:name"), {"name": REVIEW_MARKER}
        ).first()
        updates = []
        for word, meaning, example_en, example_ko in connection.execute(
            query, {"words": tuple(expected)}
        ):
            canonical = expected[word.lower()]
            if (meaning, example_en, example_ko) != canonical or (has_zh and not marker):
                updates.append(dict(word=word, meaning=canonical[0], example_en=canonical[1], example_ko=canonical[2]))
        if updates:
            clear_zh = ", meaning_zh=NULL, example_zh=NULL" if has_zh else ""
            connection.execute(text(f"""
                UPDATE english_words
                SET meaning=:meaning, example_en=:example_en, example_ko=:example_ko{clear_zh}
                WHERE word=:word
            """), updates)
        if not marker:
            connection.execute(
                text("INSERT INTO migration_markers (name) VALUES (:name)"), {"name": REVIEW_MARKER}
            )
    return len(updates)
