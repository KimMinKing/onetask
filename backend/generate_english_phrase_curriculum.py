"""
Generate a 10-level English phrase curriculum.

The output is a deterministic CSV with 10,000 rows:
10 levels x 20 high-frequency expression frames x 50 variations.
Each row contains a usable expression chunk, an example sentence, Korean meaning,
and a short learning note.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path


OUT = Path(__file__).parent / "data" / "english_phrase_curriculum.csv"


@dataclass(frozen=True)
class Slot:
    en: str
    ko: str


COMMON_THINGS = [
    Slot("this", "이것"),
    Slot("that", "저것"),
    Slot("these ones", "이것들"),
    Slot("those ones", "저것들"),
    Slot("the same thing", "같은 것"),
    Slot("a different one", "다른 것"),
    Slot("the next one", "다음 것"),
    Slot("the last one", "마지막 것"),
    Slot("my schedule", "내 일정"),
    Slot("your idea", "네 생각"),
]

DAILY_ACTIONS = [
    Slot("check it", "그걸 확인하다"),
    Slot("try it", "그걸 해보다"),
    Slot("use it", "그걸 쓰다"),
    Slot("fix it", "그걸 고치다"),
    Slot("send it", "그걸 보내다"),
    Slot("bring it", "그걸 가져오다"),
    Slot("write it down", "그걸 적다"),
    Slot("look it up", "그걸 찾아보다"),
    Slot("think about it", "그걸 생각해보다"),
    Slot("talk about it", "그것에 대해 이야기하다"),
]

DAILY_EVENTS = [
    Slot("the meeting", "회의"),
    Slot("the call", "전화"),
    Slot("the message", "메시지"),
    Slot("the plan", "계획"),
    Slot("the lesson", "수업"),
    Slot("the problem", "문제"),
    Slot("the deadline", "마감"),
    Slot("the appointment", "약속"),
    Slot("the project", "프로젝트"),
    Slot("the interview", "면접"),
]

TIME_PHRASES = [
    Slot("today", "오늘"),
    Slot("tomorrow", "내일"),
    Slot("this morning", "오늘 아침"),
    Slot("this afternoon", "오늘 오후"),
    Slot("tonight", "오늘 밤"),
    Slot("this weekend", "이번 주말"),
    Slot("next week", "다음 주"),
    Slot("in a minute", "곧"),
    Slot("later", "나중에"),
    Slot("right now", "지금 당장"),
]

REASONS = [
    Slot("I'm busy", "바쁘다"),
    Slot("I'm not sure", "확실하지 않다"),
    Slot("it takes time", "시간이 걸린다"),
    Slot("it matters", "그게 중요하다"),
    Slot("it feels right", "맞는 느낌이다"),
    Slot("it seems useful", "유용해 보인다"),
    Slot("we need it", "우리가 그게 필요하다"),
    Slot("they asked for it", "그들이 그걸 요청했다"),
    Slot("the timing is bad", "타이밍이 좋지 않다"),
    Slot("the details changed", "세부 사항이 바뀌었다"),
]

PEOPLE = [
    Slot("I", "나는"),
    Slot("you", "너는"),
    Slot("we", "우리는"),
    Slot("they", "그들은"),
    Slot("my friend", "내 친구는"),
    Slot("my teacher", "내 선생님은"),
    Slot("my manager", "내 매니저는"),
    Slot("the customer", "고객은"),
    Slot("the team", "팀은"),
    Slot("everyone", "모두는"),
]

WORK_TOPICS = [
    Slot("the schedule", "일정"),
    Slot("the budget", "예산"),
    Slot("the customer request", "고객 요청"),
    Slot("the test result", "테스트 결과"),
    Slot("the current plan", "현재 계획"),
    Slot("the next step", "다음 단계"),
    Slot("the main issue", "핵심 문제"),
    Slot("the final decision", "최종 결정"),
    Slot("the product update", "제품 업데이트"),
    Slot("the team goal", "팀 목표"),
]

ABSTRACT_TOPICS = [
    Slot("the way it works", "그것이 작동하는 방식"),
    Slot("what happened", "무슨 일이 일어났는지"),
    Slot("what matters most", "가장 중요한 것"),
    Slot("how people feel", "사람들이 어떻게 느끼는지"),
    Slot("why it failed", "왜 실패했는지"),
    Slot("where it started", "어디서 시작됐는지"),
    Slot("whether it is worth it", "그게 가치 있는지"),
    Slot("how far we can go", "우리가 어디까지 갈 수 있는지"),
    Slot("what we should avoid", "우리가 피해야 할 것"),
    Slot("what makes it different", "그걸 다르게 만드는 것"),
]

ACADEMIC_TOPICS = [
    Slot("the underlying assumption", "기저 가정"),
    Slot("the available evidence", "이용 가능한 증거"),
    Slot("the broader context", "더 넓은 맥락"),
    Slot("the long-term impact", "장기적 영향"),
    Slot("the practical trade-off", "실용적 절충점"),
    Slot("the central argument", "중심 주장"),
    Slot("the likely outcome", "가능성 높은 결과"),
    Slot("the structural problem", "구조적 문제"),
    Slot("the historical pattern", "역사적 패턴"),
    Slot("the ethical concern", "윤리적 우려"),
]


LEVELS = [
    {
        "level": 1,
        "cefr": "A1",
        "title": "survival chunks",
        "frames": [
            ("asking", "I want to {a}", "{s_wants_to} {a}.", "{a_want_ko}", "want to + 동사"),
            ("asking", "Can I {a}?", "{s} asks, 'Can I {a}?'", "{a_can_i_ko}", "허락 요청"),
            ("asking", "Can you {a}?", "Can you {a} {t}?", "{a_request_ko}", "부탁"),
            ("need", "I need {n}", "I need {n} {t}.", "{n_ko}가 필요하다", "need + 명사"),
            ("need", "I need to {a}", "I need to {a} {t}.", "{a_need_ko}", "need to + 동사"),
            ("preference", "I like {n}", "I like {n} because {r}.", "{n_ko}를 좋아한다", "like + 명사"),
            ("preference", "I don't like {n}", "I don't like {n} when {r}.", "{n_ko}를 좋아하지 않는다", "don't like"),
            ("state", "I'm ready to {a}", "I'm ready to {a} now.", "{a_ready_ko}", "ready to"),
            ("state", "I'm going to {a}", "I'm going to {a} {t}.", "{a_plan_ko}", "be going to"),
            ("state", "I'm trying to {a}", "I'm trying to {a} today.", "{a_trying_ko}", "trying to"),
            ("choice", "this one", "I want this one, not that one.", "이것", "one으로 반복 피하기"),
            ("choice", "that one", "Can I see that one?", "저것", "that one"),
            ("choice", "these ones", "These ones are better.", "이것들", "these ones"),
            ("choice", "those ones", "I don't need those ones.", "저것들", "those ones"),
            ("time", "at {t}", "Let's do it {t}.", "{t_ko}에", "시간 부사"),
            ("reason", "because {r}", "I can't do it because {r}.", "{r_ko}라서", "because 절"),
            ("check", "Is it {adj}?", "Is it {adj} enough?", "{adj_ko}한가요?", "Is it + 형용사"),
            ("check", "It looks {adj}", "It looks {adj} to me.", "{adj_ko}해 보인다", "look + 형용사"),
            ("polite", "Please {a}", "Please {a} {t}.", "{a_please_ko}", "please"),
            ("thanks", "Thanks for {a_ing}", "Thanks for {a_ing} today.", "{a_ing_ko}해 줘서 고마워요", "thanks for -ing"),
        ],
    },
    {
        "level": 2,
        "cefr": "A2",
        "title": "daily conversation patterns",
        "frames": [
            ("plan", "I'm about to {a}", "I'm about to {a}, so wait a second.", "막 {a_ko}하려던 참이다", "about to"),
            ("plan", "I'm supposed to {a}", "I'm supposed to {a} {t}.", "{a_ko}하기로 되어 있다", "supposed to"),
            ("plan", "I have to {a}", "I have to {a} before {n}.", "{a_ko}해야 한다", "have to"),
            ("experience", "I've never {p}", "I've never {p} before.", "{p_ko}해 본 적 없다", "have never p.p."),
            ("experience", "Have you ever {p}?", "Have you ever {p} with them?", "{p_ko}해 본 적 있어요?", "Have you ever"),
            ("suggestion", "Why don't we {a}?", "Why don't we {a} {t}?", "우리 {a_ko}하는 게 어때?", "가벼운 제안"),
            ("suggestion", "Let's not {a}", "Let's not {a} today.", "{a_ko}하지 말자", "Let's not"),
            ("request", "Could you {a}?", "Could you {a} for me?", "{a_ko}해 주실 수 있나요?", "공손한 부탁"),
            ("request", "Do you mind if I {a}?", "Do you mind if I {a} now?", "제가 {a_ko}해도 괜찮나요?", "Do you mind if"),
            ("opinion", "I think {s} should {a}", "I think {s} should {a} soon.", "{s_ko} {a_ko}해야 한다고 생각한다", "should"),
            ("opinion", "I don't think {s} should {a}", "I don't think {s} should {a} yet.", "{s_ko} 아직 {a_ko}하면 안 된다고 생각한다", "negative think"),
            ("certainty", "I'm sure {s} can {a}", "I'm sure {s} can {a}.", "{s_ko} {a_ko}할 수 있다고 확신한다", "I'm sure"),
            ("certainty", "I'm not sure about {n}", "I'm not sure about {n}.", "{n_ko}에 대해 확실하지 않다", "not sure about"),
            ("problem", "Something is wrong with {n}", "Something is wrong with {n}.", "{n_ko}에 문제가 있다", "wrong with"),
            ("problem", "I ran out of {n}", "I ran out of {n} yesterday.", "{n_ko}가 다 떨어졌다", "run out of"),
            ("time", "It takes time to {a}", "It takes time to {a} properly.", "{a_ko}하는 데 시간이 걸린다", "It takes time"),
            ("time", "I don't have time to {a}", "I don't have time to {a} today.", "{a_ko}할 시간이 없다", "time to"),
            ("follow-up", "What do you mean by {n}?", "What do you mean by {n}?", "{n_ko}가 무슨 뜻이에요?", "mean by"),
            ("follow-up", "How about {n}?", "How about {n} instead?", "{n_ko}는 어때요?", "How about"),
            ("reaction", "That sounds {adj}", "That sounds {adj} to me.", "{adj_ko}하게 들린다", "sound + 형용사"),
        ],
    },
    {
        "level": 3,
        "cefr": "A2+",
        "title": "linking ideas",
        "frames": [
            ("contrast", "I like {n}, but I prefer {n2}", "I like {n}, but I prefer {n2}.", "{n_ko}도 좋지만 {n2_ko}가 더 좋다", "but"),
            ("contrast", "Even if {r}, I will {a}", "Even if {r}, I will {a}.", "{r_ko}라도 {a_ko}할 것이다", "Even if"),
            ("condition", "If {r}, we can {a}", "If {r}, we can {a}.", "{r_ko}라면 {a_ko}할 수 있다", "If"),
            ("condition", "Unless {r}, we can't {a}", "Unless {r}, we can't {a}.", "{r_ko}가 아니면 {a_ko}할 수 없다", "Unless"),
            ("sequence", "After we {a}, let's {a2}", "After we {a}, let's {a2}.", "{a_ko}한 뒤 {a2_ko}하자", "After"),
            ("sequence", "Before you {a}, check {n}", "Before you {a}, check {n}.", "{a_ko}하기 전에 {n_ko}를 확인해라", "Before"),
            ("reason", "That's why {s} should {a}", "That's why {s} should {a}.", "그래서 {s_ko} {a_ko}해야 한다", "That's why"),
            ("result", "It turned out to be {adj}", "It turned out to be {adj}.", "결국 {adj_ko}한 것으로 드러났다", "turn out"),
            ("comparison", "{n} is better than {n2}", "{n} is better than {n2}.", "{n_ko}가 {n2_ko}보다 낫다", "better than"),
            ("comparison", "{n} is not as {adj} as {n2}", "{n} is not as {adj} as {n2}.", "{n_ko}는 {n2_ko}만큼 {adj_ko}하지 않다", "as as"),
            ("clarify", "What I mean is {n}", "What I mean is {n}.", "내 말은 {n_ko}라는 것이다", "What I mean is"),
            ("clarify", "In other words, {s} should {a}", "In other words, {s} should {a}.", "다시 말해 {s_ko} {a_ko}해야 한다", "In other words"),
            ("example", "For example, {s} can {a}", "For example, {s} can {a}.", "예를 들어 {s_ko} {a_ko}할 수 있다", "For example"),
            ("addition", "On top of that, {s_needs} {n}", "On top of that, {s_needs} {n}.", "게다가 {s_ko} {n_ko}가 필요하다", "On top of that"),
            ("preference", "I'd rather {a} than {a2}", "I'd rather {a} than {a2}.", "{a2_ko}보다 {a_ko}하고 싶다", "would rather"),
            ("habit", "I tend to {a}", "I tend to {a} when {r}.", "나는 {a_ko}하는 편이다", "tend to"),
            ("habit", "{s_keeps} {a_ing}", "{s_keeps} {a_ing}.", "{s_ko} 계속 {a_ing_ko}한다", "keep -ing"),
            ("possibility", "It might be {adj}", "It might be {adj}, but I'm not sure.", "{adj_ko}할지도 모른다", "might"),
            ("possibility", "There might be {n}", "There might be {n} here.", "{n_ko}가 있을지도 모른다", "There might be"),
            ("limit", "As long as {r}, it's fine", "As long as {r}, it's fine.", "{r_ko}라면 괜찮다", "As long as"),
        ],
    },
    {
        "level": 4,
        "cefr": "B1",
        "title": "practical fluency",
        "frames": [
            ("decision", "I've decided to {a}", "I've decided to {a} {t}.", "{a_ko}하기로 결정했다", "decide to"),
            ("decision", "I'm thinking of {a_ing}", "I'm thinking of {a_ing} soon.", "{a_ing_ko}할까 생각 중이다", "think of -ing"),
            ("change", "I'm getting used to {a_ing}", "I'm getting used to {a_ing}.", "{a_ing_ko}하는 데 익숙해지고 있다", "get used to"),
            ("change", "I used to {a}", "I used to {a}, but not anymore.", "예전에는 {a_ko}하곤 했다", "used to"),
            ("concern", "I'm worried about {n}", "I'm worried about {n}.", "{n_ko}가 걱정된다", "worried about"),
            ("concern", "I'm afraid {s} can't {a}", "I'm afraid {s} can't {a}.", "안타깝지만 {s_ko} {a_ko}할 수 없다", "I'm afraid"),
            ("explain", "The point is to {a}", "The point is to {a}, not to {a2}.", "핵심은 {a_ko}하는 것이다", "The point is"),
            ("explain", "It depends on {n}", "It depends on {n}.", "{n_ko}에 달려 있다", "depend on"),
            ("permission", "You're allowed to {a}", "You're allowed to {a} here.", "{a_ko}해도 된다", "allowed to"),
            ("permission", "You're not supposed to {a}", "You're not supposed to {a} here.", "{a_ko}하면 안 된다", "not supposed to"),
            ("cause", "{n} led to {n2}", "{n} led to {n2}.", "{n_ko}가 {n2_ko}로 이어졌다", "lead to"),
            ("cause", "{n} has something to do with {n2}", "{n} has something to do with {n2}.", "{n_ko}는 {n2_ko}와 관련이 있다", "have to do with"),
            ("negotiation", "Can we move {n} to {t}?", "Can we move {n} to {t}?", "{n_ko}를 {t_ko}로 옮길 수 있을까요?", "move to"),
            ("negotiation", "Can we go over {n}?", "Can we go over {n} together?", "{n_ko}를 검토할 수 있을까요?", "go over"),
            ("priority", "We need to focus on {n}", "We need to focus on {n} first.", "{n_ko}에 집중해야 한다", "focus on"),
            ("priority", "{n} comes first", "{n} comes first right now.", "{n_ko}가 우선이다", "come first"),
            ("reaction", "I can see why {s} did that", "I can see why {s} did that.", "{s_ko} 왜 그랬는지 이해된다", "I can see why"),
            ("reaction", "That makes sense to me", "That makes sense to me now.", "그 말이 이해된다", "make sense"),
            ("mistake", "I should have {p}", "I should have {p} earlier.", "{p_ko}했어야 했다", "should have p.p."),
            ("mistake", "I shouldn't have {p}", "I shouldn't have {p} that way.", "{p_ko}하지 말았어야 했다", "shouldn't have"),
        ],
    },
    {
        "level": 5,
        "cefr": "B1+",
        "title": "work and problem solving",
        "frames": [
            ("meeting", "Let's walk through {w}", "Let's walk through {w} step by step.", "{w_ko}를 차근차근 살펴보자", "walk through"),
            ("meeting", "Let's make sure {s} can {a}", "Let's make sure {s} can {a}.", "{s_ko} {a_ko}할 수 있는지 확인하자", "make sure"),
            ("issue", "The issue is that {r}", "The issue is that {r}.", "문제는 {r_ko}라는 점이다", "The issue is"),
            ("issue", "What matters is {w}", "What matters is {w}.", "중요한 것은 {w_ko}다", "What matters is"),
            ("proposal", "It would be better to {a}", "It would be better to {a} first.", "먼저 {a_ko}하는 게 더 낫다", "would be better"),
            ("proposal", "We might want to {a}", "We might want to {a} before {w}.", "{w_ko} 전에 {a_ko}하는 게 좋을 수 있다", "might want to"),
            ("risk", "There's a risk of {n}", "There's a risk of {n} here.", "{n_ko}의 위험이 있다", "risk of"),
            ("risk", "We should avoid {a_ing}", "We should avoid {a_ing} if possible.", "가능하면 {a_ing_ko}하는 것을 피해야 한다", "avoid -ing"),
            ("status", "I'm working on {w}", "I'm working on {w} now.", "{w_ko}를 작업 중이다", "work on"),
            ("status", "I'm done with {w}", "I'm done with {w}.", "{w_ko}를 끝냈다", "done with"),
            ("follow-up", "I'll get back to you about {w}", "I'll get back to you about {w} later.", "{w_ko}에 대해 다시 연락하겠다", "get back to"),
            ("follow-up", "Please keep me posted on {w}", "Please keep me posted on {w}.", "{w_ko}에 대해 계속 알려 주세요", "keep me posted"),
            ("alignment", "We're on the same page about {w}", "We're on the same page about {w}.", "{w_ko}에 대해 같은 이해를 하고 있다", "same page"),
            ("alignment", "I want to clarify {w}", "I want to clarify {w} before we continue.", "{w_ko}를 명확히 하고 싶다", "clarify"),
            ("constraint", "We're running behind on {w}", "We're running behind on {w}.", "{w_ko}가 지연되고 있다", "run behind"),
            ("constraint", "We're short on {n}", "We're short on {n} this week.", "{n_ko}가 부족하다", "short on"),
            ("handoff", "I'll take care of {w}", "I'll take care of {w}.", "{w_ko}를 내가 처리하겠다", "take care of"),
            ("handoff", "Can you handle {w}?", "Can you handle {w} today?", "{w_ko}를 맡아줄 수 있나요?", "handle"),
            ("decision", "Let's go with {n}", "Let's go with {n} for now.", "일단 {n_ko}로 가자", "go with"),
            ("decision", "Let's put {w} on hold", "Let's put {w} on hold for now.", "{w_ko}를 보류하자", "put on hold"),
        ],
    },
    {
        "level": 6,
        "cefr": "B2",
        "title": "nuance and softening",
        "frames": [
            ("soften", "I was wondering if we could {a}", "I was wondering if we could {a}.", "혹시 우리가 {a_ko}할 수 있을까 해서요", "very polite request"),
            ("soften", "Would it be possible to {a}?", "Would it be possible to {a} {t}?", "{a_ko}하는 것이 가능할까요?", "polite possibility"),
            ("opinion", "From my point of view, {w} matters", "From my point of view, {w} matters most.", "내 관점에서는 {w_ko}가 중요하다", "point of view"),
            ("opinion", "The way I see it, {s} should {a}", "The way I see it, {s} should {a}.", "내가 보기엔 {s_ko} {a_ko}해야 한다", "The way I see it"),
            ("hedge", "It seems like {r}", "It seems like {r}, but I need to check.", "{r_ko}인 것 같다", "seems like"),
            ("hedge", "It looks as if {r}", "It looks as if {r}.", "{r_ko}처럼 보인다", "as if"),
            ("pushback", "I'm not convinced that {r}", "I'm not convinced that {r}.", "{r_ko}라는 점이 납득되지 않는다", "not convinced"),
            ("pushback", "I see your point, but {r}", "I see your point, but {r}.", "무슨 말인지는 알지만 {r_ko}", "soft disagreement"),
            ("tradeoff", "The trade-off is {w}", "The trade-off is {w}.", "절충점은 {w_ko}다", "trade-off"),
            ("tradeoff", "It's worth {a_ing}", "It's worth {a_ing} if we have time.", "{a_ing_ko}할 가치가 있다", "worth -ing"),
            ("priority", "I'd prioritize {w} over {w2}", "I'd prioritize {w} over {w2}.", "{w2_ko}보다 {w_ko}를 우선하겠다", "prioritize over"),
            ("priority", "We can't afford to {a}", "We can't afford to {a} right now.", "지금 {a_ko}할 여유가 없다", "can't afford to"),
            ("analysis", "What stands out is {w}", "What stands out is {w}.", "눈에 띄는 것은 {w_ko}다", "stand out"),
            ("analysis", "That explains why {r}", "That explains why {r}.", "그게 왜 {r_ko}인지 설명해 준다", "explain why"),
            ("repair", "Let me put it another way", "Let me put it another way: {w} comes first.", "다르게 말해보겠다", "rephrase"),
            ("repair", "What I'm trying to say is {w}", "What I'm trying to say is {w}.", "내가 말하려는 건 {w_ko}다", "trying to say"),
            ("expectation", "I expected {s} to {a}", "I expected {s} to {a} sooner.", "{s_ko} {a_ko}할 거라고 예상했다", "expect to"),
            ("expectation", "I didn't expect {s} to {a}", "I didn't expect {s} to {a} today.", "{s_ko} {a_ko}할 줄 몰랐다", "didn't expect"),
            ("context", "Given {w}, we should {a}", "Given {w}, we should {a}.", "{w_ko}를 고려하면 {a_ko}해야 한다", "Given"),
            ("context", "Considering {w}, it makes sense", "Considering {w}, it makes sense.", "{w_ko}를 고려하면 타당하다", "Considering"),
        ],
    },
    {
        "level": 7,
        "cefr": "B2+",
        "title": "argument and storytelling",
        "frames": [
            ("story", "What happened was that {r}", "What happened was that {r}.", "무슨 일이었냐면 {r_ko}였다", "story opener"),
            ("story", "The funny thing is that {r}", "The funny thing is that {r}.", "재미있는 점은 {r_ko}라는 것이다", "The funny thing is"),
            ("argument", "The reason I bring this up is {w}", "The reason I bring this up is {w}.", "이걸 꺼내는 이유는 {w_ko}다", "bring up"),
            ("argument", "This raises the question of {w}", "This raises the question of {w}.", "이것은 {w_ko}라는 질문을 제기한다", "raise the question"),
            ("cause", "This comes down to {w}", "This comes down to {w}.", "결국 {w_ko}의 문제다", "come down to"),
            ("cause", "This has less to do with {w} and more to do with {w2}", "This has less to do with {w} and more to do with {w2}.", "{w_ko}보다는 {w2_ko}와 더 관련 있다", "less/more to do with"),
            ("balance", "On the one hand, {r}", "On the one hand, {r}.", "한편으로는 {r_ko}", "On the one hand"),
            ("balance", "On the other hand, {r}", "On the other hand, {r}.", "다른 한편으로는 {r_ko}", "On the other hand"),
            ("concession", "Even though {r}, it still matters", "Even though {r}, it still matters.", "{r_ko}이긴 하지만 여전히 중요하다", "Even though"),
            ("concession", "That said, we should {a}", "That said, we should {a}.", "그렇지만 {a_ko}해야 한다", "That said"),
            ("evidence", "There's evidence that {r}", "There's evidence that {r}.", "{r_ko}라는 증거가 있다", "evidence that"),
            ("evidence", "The data suggests that {r}", "The data suggests that {r}.", "데이터는 {r_ko}임을 시사한다", "suggest that"),
            ("impact", "This could lead to {w}", "This could lead to {w}.", "이것은 {w_ko}로 이어질 수 있다", "could lead to"),
            ("impact", "This makes it harder to {a}", "This makes it harder to {a}.", "이것은 {a_ko}하기 더 어렵게 만든다", "make it harder"),
            ("framing", "It's not a matter of {w}", "It's not a matter of {w}.", "{w_ko}의 문제가 아니다", "matter of"),
            ("framing", "It's a question of whether {r}", "It's a question of whether {r}.", "{r_ko}인지의 문제다", "question of whether"),
            ("summary", "The bottom line is {w}", "The bottom line is {w}.", "핵심 결론은 {w_ko}다", "bottom line"),
            ("summary", "If I had to sum it up, {w} matters", "If I had to sum it up, {w} matters.", "요약하자면 {w_ko}가 중요하다", "sum up"),
            ("stance", "I would argue that {r}", "I would argue that {r}.", "{r_ko}라고 주장하겠다", "would argue"),
            ("stance", "It's hard to deny that {r}", "It's hard to deny that {r}.", "{r_ko}라는 점은 부정하기 어렵다", "hard to deny"),
        ],
    },
    {
        "level": 8,
        "cefr": "C1-",
        "title": "advanced discussion",
        "frames": [
            ("nuance", "There is a subtle difference between {w} and {w2}", "There is a subtle difference between {w} and {w2}.", "{w_ko}와 {w2_ko} 사이에는 미묘한 차이가 있다", "subtle difference"),
            ("nuance", "It's easy to confuse {w} with {w2}", "It's easy to confuse {w} with {w2}.", "{w_ko}를 {w2_ko}와 혼동하기 쉽다", "confuse with"),
            ("analysis", "This is partly due to {w}", "This is partly due to {w}.", "이는 부분적으로 {w_ko} 때문이다", "due to"),
            ("analysis", "This is closely tied to {w}", "This is closely tied to {w}.", "이는 {w_ko}와 밀접하게 연결되어 있다", "tied to"),
            ("constraint", "The challenge lies in {a_ing}", "The challenge lies in {a_ing}.", "어려움은 {a_ing_ko}하는 데 있다", "lie in"),
            ("constraint", "The problem is compounded by {w}", "The problem is compounded by {w}.", "문제는 {w_ko}로 인해 악화된다", "compounded by"),
            ("position", "I wouldn't go so far as to say {r}", "I wouldn't go so far as to say {r}.", "{r_ko}라고까지 말하진 않겠다", "not go so far as"),
            ("position", "It would be misleading to say {r}", "It would be misleading to say {r}.", "{r_ko}라고 말하면 오해의 소지가 있다", "misleading"),
            ("scope", "This applies not only to {w} but also to {w2}", "This applies not only to {w} but also to {w2}.", "이는 {w_ko}뿐 아니라 {w2_ko}에도 적용된다", "not only but also"),
            ("scope", "This only works under certain conditions", "This only works under certain conditions around {w}.", "이는 특정 조건에서만 작동한다", "under conditions"),
            ("implication", "The implication is that {r}", "The implication is that {r}.", "함의는 {r_ko}라는 것이다", "implication"),
            ("implication", "This points to a deeper issue: {w}", "This points to a deeper issue: {w}.", "이는 더 깊은 문제인 {w_ko}를 가리킨다", "point to"),
            ("critique", "This overlooks {w}", "This overlooks {w}.", "이는 {w_ko}를 간과한다", "overlook"),
            ("critique", "This fails to account for {w}", "This fails to account for {w}.", "이는 {w_ko}를 설명하지 못한다", "account for"),
            ("alternative", "A more realistic approach is to {a}", "A more realistic approach is to {a}.", "더 현실적인 접근은 {a_ko}하는 것이다", "approach"),
            ("alternative", "Rather than {a_ing}, we should {a2}", "Rather than {a_ing}, we should {a2}.", "{a_ing_ko}하기보다 {a2_ko}해야 한다", "Rather than"),
            ("emphasis", "What makes this difficult is {w}", "What makes this difficult is {w}.", "이걸 어렵게 만드는 것은 {w_ko}다", "What makes"),
            ("emphasis", "What often gets ignored is {w}", "What often gets ignored is {w}.", "자주 무시되는 것은 {w_ko}다", "What gets ignored"),
            ("transition", "That brings us back to {w}", "That brings us back to {w}.", "그것은 다시 {w_ko}로 돌아오게 한다", "bring back to"),
            ("transition", "This is where {w} becomes important", "This is where {w} becomes important.", "여기서 {w_ko}가 중요해진다", "This is where"),
        ],
    },
    {
        "level": 9,
        "cefr": "C1",
        "title": "professional precision",
        "frames": [
            ("strategy", "The most viable option is to {a}", "The most viable option is to {a}.", "가장 실행 가능한 선택지는 {a_ko}하는 것이다", "viable option"),
            ("strategy", "We need to strike a balance between {w} and {w2}", "We need to strike a balance between {w} and {w2}.", "{w_ko}와 {w2_ko} 사이의 균형을 잡아야 한다", "strike a balance"),
            ("risk", "This could undermine {w}", "This could undermine {w}.", "이는 {w_ko}를 약화시킬 수 있다", "undermine"),
            ("risk", "This could set a precedent for {w}", "This could set a precedent for {w}.", "이는 {w_ko}의 선례가 될 수 있다", "set a precedent"),
            ("governance", "We need a framework for {a_ing}", "We need a framework for {a_ing}.", "{a_ing_ko}하기 위한 체계가 필요하다", "framework for"),
            ("governance", "This calls for a more structured approach to {w}", "This calls for a more structured approach to {w}.", "{w_ko}에 대한 더 구조화된 접근이 필요하다", "call for"),
            ("evaluation", "The key metric is {w}", "The key metric is {w}.", "핵심 지표는 {w_ko}다", "key metric"),
            ("evaluation", "Success depends largely on {w}", "Success depends largely on {w}.", "성공은 대체로 {w_ko}에 달려 있다", "depends largely on"),
            ("stakeholder", "This affects stakeholders who rely on {w}", "This affects stakeholders who rely on {w}.", "이는 {w_ko}에 의존하는 이해관계자에게 영향을 준다", "stakeholders"),
            ("stakeholder", "We need to take into account {w}", "We need to take into account {w}.", "{w_ko}를 고려해야 한다", "take into account"),
            ("tradeoff", "The short-term gain may not justify {w}", "The short-term gain may not justify {w}.", "단기 이익이 {w_ko}를 정당화하지 못할 수 있다", "justify"),
            ("tradeoff", "The benefits have to be weighed against {w}", "The benefits have to be weighed against {w}.", "이점은 {w_ko}와 비교해 따져봐야 한다", "weigh against"),
            ("implementation", "The implementation hinges on {w}", "The implementation hinges on {w}.", "실행은 {w_ko}에 달려 있다", "hinge on"),
            ("implementation", "We need to phase in {w}", "We need to phase in {w} gradually.", "{w_ko}를 단계적으로 도입해야 한다", "phase in"),
            ("constraint", "This is constrained by {w}", "This is constrained by {w}.", "이는 {w_ko}에 의해 제약된다", "constrained by"),
            ("constraint", "This leaves little room for {w}", "This leaves little room for {w}.", "이는 {w_ko}의 여지를 거의 남기지 않는다", "leave room for"),
            ("recommendation", "I would recommend {a_ing}", "I would recommend {a_ing} first.", "먼저 {a_ing_ko}하는 것을 권하겠다", "recommend -ing"),
            ("recommendation", "It may be prudent to {a}", "It may be prudent to {a}.", "{a_ko}하는 것이 신중할 수 있다", "prudent"),
            ("summary", "The central takeaway is {w}", "The central takeaway is {w}.", "핵심 시사점은 {w_ko}다", "takeaway"),
            ("summary", "This should be treated as {w}", "This should be treated as {w}.", "이는 {w_ko}로 다뤄져야 한다", "treated as"),
        ],
    },
    {
        "level": 10,
        "cefr": "C1+",
        "title": "near-native rhetorical control",
        "frames": [
            ("rhetoric", "To put it bluntly, {r}", "To put it bluntly, {r}.", "직설적으로 말하면 {r_ko}", "bluntly"),
            ("rhetoric", "To be fair, {r}", "To be fair, {r}.", "공정하게 말하면 {r_ko}", "to be fair"),
            ("rhetoric", "If anything, {w} is the bigger concern", "If anything, {w} is the bigger concern.", "오히려 {w_ko}가 더 큰 우려다", "If anything"),
            ("rhetoric", "At the risk of oversimplifying, {r}", "At the risk of oversimplifying, {r}.", "단순화의 위험을 무릅쓰고 말하면 {r_ko}", "oversimplifying"),
            ("precision", "This is not merely {w}; it is {w2}", "This is not merely {w}; it is {w2}.", "이는 단순히 {w_ko}가 아니라 {w2_ko}다", "not merely"),
            ("precision", "The distinction matters because {r}", "The distinction matters because {r}.", "그 구분이 중요한 이유는 {r_ko}이기 때문이다", "distinction matters"),
            ("causality", "It's tempting to attribute this to {w}", "It's tempting to attribute this to {w}.", "이를 {w_ko} 탓으로 돌리고 싶어지기 쉽다", "attribute to"),
            ("causality", "A more plausible explanation is {w}", "A more plausible explanation is {w}.", "더 그럴듯한 설명은 {w_ko}다", "plausible explanation"),
            ("critique", "That argument rests on {w}", "That argument rests on {w}.", "그 주장은 {w_ko}에 기반한다", "rests on"),
            ("critique", "That argument falls apart when {r}", "That argument falls apart when {r}.", "{r_ko}일 때 그 주장은 무너진다", "fall apart"),
            ("synthesis", "Taken together, these suggest {r}", "Taken together, these suggest {r}.", "종합하면 이것들은 {r_ko}임을 시사한다", "taken together"),
            ("synthesis", "This fits into a broader pattern of {w}", "This fits into a broader pattern of {w}.", "이는 {w_ko}라는 더 넓은 패턴에 들어맞는다", "broader pattern"),
            ("anticipation", "One might object that {r}", "One might object that {r}.", "누군가는 {r_ko}라고 반박할 수 있다", "anticipating objections"),
            ("anticipation", "That objection is valid, but it misses {w}", "That objection is valid, but it misses {w}.", "그 반박은 타당하지만 {w_ko}를 놓친다", "valid but"),
            ("judgment", "The real test is whether {r}", "The real test is whether {r}.", "진짜 시험대는 {r_ko}인지 여부다", "real test"),
            ("judgment", "The question is not whether {r}, but how", "The question is not whether {r}, but how.", "문제는 {r_ko}인지가 아니라 어떻게냐이다", "not whether but how"),
            ("conclusion", "In practical terms, this means {w}", "In practical terms, this means {w}.", "실무적으로 이것은 {w_ko}를 의미한다", "practical terms"),
            ("conclusion", "In the long run, {w} will matter more", "In the long run, {w} will matter more.", "장기적으로 {w_ko}가 더 중요해질 것이다", "long run"),
            ("style", "I don't mean to overstate it, but {r}", "I don't mean to overstate it, but {r}.", "과장하려는 건 아니지만 {r_ko}", "overstate"),
            ("style", "That may sound counterintuitive, but {r}", "That may sound counterintuitive, but {r}.", "직관에 반하게 들릴 수 있지만 {r_ko}", "counterintuitive"),
        ],
    },
]


ADJECTIVES = [
    Slot("clear", "명확"),
    Slot("useful", "유용"),
    Slot("simple", "단순"),
    Slot("important", "중요"),
    Slot("possible", "가능"),
    Slot("different", "다름"),
    Slot("better", "더 좋음"),
    Slot("ready", "준비됨"),
    Slot("enough", "충분"),
    Slot("safe", "안전"),
]

TOPIC_MODIFIERS = [
    Slot("clear", "명확"),
    Slot("updated", "업데이트된"),
    Slot("final", "최종"),
    Slot("current", "현재"),
    Slot("main", "핵심"),
]


def modified_topic(modifier: Slot, topic: Slot) -> Slot:
    bare_topic = topic.en[4:] if topic.en.startswith("the ") else topic.en
    return Slot(f"the {modifier.en} {bare_topic}", f"{modifier.ko} {topic.ko}")


NOUN_POOL = (
    COMMON_THINGS
    + DAILY_EVENTS
    + [
        modified_topic(adj, topic)
        for adj in TOPIC_MODIFIERS
        for topic in DAILY_EVENTS[:10]
    ]
)

REASON_SUBJECTS = [
    ("I", "내가", False),
    ("you", "네가", False),
    ("we", "우리가", False),
    ("they", "그들이", False),
    ("the team", "팀이", True),
    ("the customer", "고객이", True),
    ("the plan", "계획이", True),
    ("the schedule", "일정이", True),
    ("the timing", "타이밍이", True),
    ("the result", "결과가", True),
]

REASON_PREDICATES = [
    ("need more time", "needs more time", "시간이 더 필요하다"),
    ("changed the details", "changed the details", "세부 사항을 바꿨다"),
    ("missed the point", "missed the point", "핵심을 놓쳤다"),
    ("asked for it", "asked for it", "그걸 요청했다"),
    ("can't confirm it yet", "can't confirm it yet", "아직 확인할 수 없다"),
    ("found a problem", "found a problem", "문제를 발견했다"),
    ("made progress", "made progress", "진전을 이뤘다"),
    ("ran into trouble", "ran into trouble", "문제에 부딪혔다"),
    ("need a clear answer", "needs a clear answer", "명확한 답이 필요하다"),
    ("remain uncertain", "remains uncertain", "아직 불확실하다"),
]

REASONS = [
    Slot(f"{subject_en} {singular_predicate if is_singular else plural_predicate}", f"{subject_ko} {predicate_ko}")
    for subject_en, subject_ko, is_singular in REASON_SUBJECTS
    for plural_predicate, singular_predicate, predicate_ko in REASON_PREDICATES
]

WORK_TOPICS = WORK_TOPICS + [
    modified_topic(adj, topic)
    for adj in TOPIC_MODIFIERS
    for topic in WORK_TOPICS[:10]
]

ABSTRACT_TOPICS = ABSTRACT_TOPICS + [
    modified_topic(adj, topic)
    for adj in TOPIC_MODIFIERS
    for topic in ABSTRACT_TOPICS[:10]
]

ACADEMIC_TOPICS = ACADEMIC_TOPICS + [
    modified_topic(adj, topic)
    for adj in TOPIC_MODIFIERS
    for topic in ACADEMIC_TOPICS[:10]
]


VERB_PAIRS = [
    ("check it", "그걸 확인하다", "그걸 확인하고", "checking it", "그걸 확인", "checked it", "그걸 확인"),
    ("try it", "그걸 해보다", "그걸 해보고", "trying it", "그걸 해보기", "tried it", "그걸 해봄"),
    ("use it", "그걸 사용하다", "그걸 사용하고", "using it", "그걸 사용", "used it", "그걸 사용"),
    ("fix it", "그걸 고치다", "그걸 고치고", "fixing it", "그걸 고치기", "fixed it", "그걸 고침"),
    ("send it", "그걸 보내다", "그걸 보내고", "sending it", "그걸 보내기", "sent it", "그걸 보냄"),
    ("bring it", "그걸 가져오다", "그걸 가져오고", "bringing it", "그걸 가져오기", "brought it", "그걸 가져옴"),
    ("write it down", "그걸 적다", "그걸 적고", "writing it down", "그걸 적기", "written it down", "그걸 적어둠"),
    ("look it up", "그걸 찾아보다", "그걸 찾아보고", "looking it up", "그걸 찾아보기", "looked it up", "그걸 찾아봄"),
    ("think about it", "그걸 생각해보다", "그걸 생각해보고", "thinking about it", "그걸 생각해보기", "thought about it", "그걸 생각해봄"),
    ("talk about it", "그것에 대해 이야기하다", "그것에 대해 이야기하고", "talking about it", "그것에 대해 이야기하기", "talked about it", "그것에 대해 이야기함"),
    ("take a look", "한번 보다", "한번 보고", "taking a look", "한번 보기", "taken a look", "한번 봄"),
    ("make a note", "메모하다", "메모하고", "making a note", "메모하기", "made a note", "메모함"),
    ("set it up", "그걸 설정하다", "그걸 설정하고", "setting it up", "그걸 설정하기", "set it up", "그걸 설정함"),
    ("figure it out", "그걸 알아내다", "그걸 알아내고", "figuring it out", "그걸 알아내기", "figured it out", "그걸 알아냄"),
    ("put it away", "그걸 치우다", "그걸 치우고", "putting it away", "그걸 치우기", "put it away", "그걸 치움"),
    ("pick it up", "그걸 집어 들다", "그걸 집어 들고", "picking it up", "그걸 집어 들기", "picked it up", "그걸 집어 듦"),
    ("drop it off", "그걸 맡겨 두다", "그걸 맡겨 두고", "dropping it off", "그걸 맡겨 두기", "dropped it off", "그걸 맡겨 둠"),
    ("call them back", "그들에게 다시 전화하다", "그들에게 다시 전화하고", "calling them back", "다시 전화하기", "called them back", "다시 전화함"),
    ("text them", "그들에게 문자하다", "그들에게 문자하고", "texting them", "문자하기", "texted them", "문자함"),
    ("email them", "그들에게 이메일하다", "그들에게 이메일하고", "emailing them", "이메일하기", "emailed them", "이메일함"),
    ("ask for help", "도움을 요청하다", "도움을 요청하고", "asking for help", "도움 요청하기", "asked for help", "도움을 요청함"),
    ("give it a try", "한번 시도해보다", "한번 시도해보고", "giving it a try", "한번 시도해보기", "given it a try", "한번 시도해봄"),
    ("take a break", "잠깐 쉬다", "잠깐 쉬고", "taking a break", "잠깐 쉬기", "taken a break", "잠깐 쉼"),
    ("get some rest", "좀 쉬다", "좀 쉬고", "getting some rest", "좀 쉬기", "gotten some rest", "좀 쉼"),
    ("make a decision", "결정하다", "결정하고", "making a decision", "결정하기", "made a decision", "결정함"),
    ("change my mind", "마음을 바꾸다", "마음을 바꾸고", "changing my mind", "마음 바꾸기", "changed my mind", "마음을 바꿈"),
    ("save some time", "시간을 절약하다", "시간을 절약하고", "saving some time", "시간 절약하기", "saved some time", "시간을 절약함"),
    ("spend more time", "시간을 더 쓰다", "시간을 더 쓰고", "spending more time", "시간 더 쓰기", "spent more time", "시간을 더 씀"),
    ("get ready", "준비하다", "준비하고", "getting ready", "준비하기", "gotten ready", "준비함"),
    ("get started", "시작하다", "시작하고", "getting started", "시작하기", "gotten started", "시작함"),
    ("come back later", "나중에 돌아오다", "나중에 돌아오고", "coming back later", "나중에 돌아오기", "come back later", "나중에 돌아옴"),
    ("stay here", "여기에 머물다", "여기에 머물고", "staying here", "여기에 머물기", "stayed here", "여기에 머묾"),
    ("move on", "다음으로 넘어가다", "다음으로 넘어가고", "moving on", "다음으로 넘어가기", "moved on", "다음으로 넘어감"),
    ("slow down", "속도를 늦추다", "속도를 늦추고", "slowing down", "속도 늦추기", "slowed down", "속도를 늦춤"),
    ("speed it up", "속도를 높이다", "속도를 높이고", "speeding it up", "속도 높이기", "sped it up", "속도를 높임"),
    ("keep going", "계속하다", "계속하고", "keeping going", "계속하기", "kept going", "계속함"),
    ("start over", "다시 시작하다", "다시 시작하고", "starting over", "다시 시작하기", "started over", "다시 시작함"),
    ("bring it up", "그걸 꺼내 말하다", "그걸 꺼내 말하고", "bringing it up", "그걸 꺼내 말하기", "brought it up", "그걸 꺼내 말함"),
    ("write back", "답장을 쓰다", "답장을 쓰고", "writing back", "답장 쓰기", "written back", "답장을 씀"),
    ("follow up", "후속 확인을 하다", "후속 확인을 하고", "following up", "후속 확인하기", "followed up", "후속 확인함"),
    ("show up early", "일찍 나타나다", "일찍 나타나고", "showing up early", "일찍 나타나기", "shown up early", "일찍 나타남"),
    ("leave early", "일찍 떠나다", "일찍 떠나고", "leaving early", "일찍 떠나기", "left early", "일찍 떠남"),
    ("stay late", "늦게까지 남다", "늦게까지 남고", "staying late", "늦게까지 남기", "stayed late", "늦게까지 남음"),
    ("pay attention", "주의를 기울이다", "주의를 기울이고", "paying attention", "주의 기울이기", "paid attention", "주의를 기울임"),
    ("make progress", "진전을 이루다", "진전을 이루고", "making progress", "진전 이루기", "made progress", "진전을 이룸"),
    ("deal with it", "그걸 처리하다", "그걸 처리하고", "dealing with it", "그걸 처리하기", "dealt with it", "그걸 처리함"),
    ("work it out", "그걸 해결하다", "그걸 해결하고", "working it out", "그걸 해결하기", "worked it out", "그걸 해결함"),
    ("sort it out", "그걸 정리하다", "그걸 정리하고", "sorting it out", "그걸 정리하기", "sorted it out", "그걸 정리함"),
    ("point it out", "그걸 지적하다", "그걸 지적하고", "pointing it out", "그걸 지적하기", "pointed it out", "그걸 지적함"),
    ("write it up", "그걸 문서로 작성하다", "그걸 문서로 작성하고", "writing it up", "문서로 작성하기", "written it up", "문서로 작성함"),
]


def slot_at(items: list[Slot], index: int, offset: int = 0) -> Slot:
    return items[(index + offset) % len(items)]


def row_context(i: int) -> dict[str, str]:
    verb, verb_ko, verb_conn_ko, verb_ing, verb_ing_ko, past, past_ko = VERB_PAIRS[i % len(VERB_PAIRS)]
    verb2, verb2_ko, verb2_conn_ko, verb2_ing, verb2_ing_ko, _, _ = VERB_PAIRS[(i + 3) % len(VERB_PAIRS)]
    noun = slot_at(NOUN_POOL, i)
    noun2 = slot_at(NOUN_POOL, i, 17)
    time = slot_at(TIME_PHRASES, i)
    reason = slot_at(REASONS, i)
    person = slot_at(PEOPLE, i)
    singular_subject = person.en not in {"I", "you", "we", "they"}
    work = slot_at(WORK_TOPICS, i)
    work2 = slot_at(WORK_TOPICS, i, 4)
    abstract = slot_at(ABSTRACT_TOPICS, i)
    abstract2 = slot_at(ABSTRACT_TOPICS, i, 3)
    academic = slot_at(ACADEMIC_TOPICS, i)
    academic2 = slot_at(ACADEMIC_TOPICS, i, 4)
    adj = slot_at(ADJECTIVES, i)

    return {
        "a": verb,
        "a_ko": verb_ko,
        "a_want_ko": f"{verb_conn_ko} 싶다",
        "a_can_i_ko": f"{verb_ko} 해도 될까요?",
        "a_request_ko": f"{verb_ko} 해 줄 수 있어요?",
        "a_need_ko": f"{verb_ko} 해야 한다",
        "a_ready_ko": f"{verb_ko} 할 준비가 됐다",
        "a_plan_ko": f"{verb_ko} 할 예정이다",
        "a_trying_ko": f"{verb_ko} 하려고 노력 중이다",
        "a_please_ko": f"{verb_ko} 해 주세요",
        "a2": verb2,
        "a2_ko": verb2_ko,
        "a2_conn_ko": verb2_conn_ko,
        "a_ing": verb_ing,
        "a_ing_ko": verb_ing_ko,
        "p": past,
        "p_ko": past_ko,
        "n": noun.en,
        "n_ko": noun.ko,
        "n2": noun2.en,
        "n2_ko": noun2.ko,
        "t": time.en,
        "t_ko": time.ko,
        "r": reason.en,
        "r_ko": reason.ko,
        "s": person.en,
        "s_ko": person.ko,
        "s_wants_to": f"{person.en} {'wants' if singular_subject else 'want'} to",
        "s_needs": f"{person.en} {'needs' if singular_subject else 'need'}",
        "s_keeps": f"{person.en} {'keeps' if singular_subject else 'keep'}",
        "w": work.en,
        "w_ko": work.ko,
        "w2": work2.en,
        "w2_ko": work2.ko,
        "adj": adj.en,
        "adj_ko": adj.ko,
        "academic": academic.en,
        "academic_ko": academic.ko,
        "academic2": academic2.en,
        "academic2_ko": academic2.ko,
        "abstract": abstract.en,
        "abstract_ko": abstract.ko,
        "abstract2": abstract2.en,
        "abstract2_ko": abstract2.ko,
    }


def render(template: str, context: dict[str, str], level: int) -> str:
    enriched = dict(context)
    if level >= 7:
        enriched["w"] = context["abstract"]
        enriched["w_ko"] = context["abstract_ko"]
        enriched["w2"] = context["abstract2"]
        enriched["w2_ko"] = context["abstract2_ko"]
    if level >= 9:
        enriched["w"] = context["academic"]
        enriched["w_ko"] = context["academic_ko"]
        enriched["w2"] = context["academic2"]
        enriched["w2_ko"] = context["academic2_ko"]
    return template.format(**enriched)


SITUATION_BY_FUNCTION = {
    "asking": "원하는 것, 허락, 부탁을 말할 때",
    "need": "필요한 것과 해야 할 일을 말할 때",
    "preference": "좋고 싫음을 말할 때",
    "state": "현재 상태나 예정된 행동을 말할 때",
    "choice": "여러 개 중 하나를 고르거나 가리킬 때",
    "time": "시간을 붙여 약속이나 행동을 말할 때",
    "reason": "이유를 붙여 설명할 때",
    "check": "상태를 확인하거나 판단할 때",
    "polite": "짧고 공손하게 부탁할 때",
    "thanks": "고마운 이유를 말할 때",
    "plan": "계획이나 예정된 일을 말할 때",
    "experience": "경험 여부를 말할 때",
    "suggestion": "상대에게 제안할 때",
    "request": "공손하게 요청하거나 허락을 구할 때",
    "opinion": "내 생각이나 판단을 말할 때",
    "certainty": "확신이나 불확실성을 말할 때",
    "problem": "문제나 부족한 점을 말할 때",
    "follow-up": "상대 말에 이어 질문하거나 확인할 때",
    "reaction": "상대 말이나 상황에 반응할 때",
    "contrast": "두 생각을 대비할 때",
    "condition": "조건을 붙여 말할 때",
    "sequence": "순서와 절차를 말할 때",
    "result": "결과나 드러난 사실을 말할 때",
    "comparison": "비교해서 말할 때",
    "clarify": "내 말을 다시 풀어 설명할 때",
    "example": "예시를 들 때",
    "addition": "추가 정보를 붙일 때",
    "habit": "반복되는 습관이나 경향을 말할 때",
    "possibility": "가능성을 조심스럽게 말할 때",
    "limit": "조건의 한계를 말할 때",
    "decision": "결정하거나 선택할 때",
    "change": "익숙해짐, 과거 습관, 변화를 말할 때",
    "concern": "걱정이나 우려를 말할 때",
    "explain": "핵심이나 의존 관계를 설명할 때",
    "permission": "허용 여부나 규칙을 말할 때",
    "cause": "원인과 관련성을 설명할 때",
    "negotiation": "일정 조정이나 검토를 요청할 때",
    "priority": "우선순위를 정할 때",
    "mistake": "후회나 실수를 말할 때",
    "meeting": "회의에서 내용을 훑거나 확인할 때",
    "issue": "문제의 핵심을 말할 때",
    "proposal": "더 나은 방안을 제안할 때",
    "risk": "위험과 피해야 할 일을 말할 때",
    "status": "진행 상태를 말할 때",
    "alignment": "서로 같은 이해인지 맞출 때",
    "constraint": "제약이나 부족함을 말할 때",
    "handoff": "업무를 맡기거나 넘길 때",
    "soften": "부드럽고 공손하게 말할 때",
    "hedge": "확신을 낮춰 조심스럽게 말할 때",
    "pushback": "상대 의견에 부드럽게 반대할 때",
    "tradeoff": "장단점과 절충점을 말할 때",
    "analysis": "눈에 띄는 점이나 원인을 분석할 때",
    "repair": "말을 다시 정리해 말할 때",
    "expectation": "예상과 실제 차이를 말할 때",
    "context": "맥락을 고려해 판단할 때",
    "story": "이야기를 시작하거나 흥미로운 점을 말할 때",
    "argument": "주장을 꺼내거나 질문을 제기할 때",
    "balance": "양쪽 관점을 균형 있게 말할 때",
    "concession": "인정하면서 반전 의견을 붙일 때",
    "evidence": "근거와 데이터를 말할 때",
    "impact": "영향과 결과를 설명할 때",
    "framing": "문제의 성격을 규정할 때",
    "summary": "핵심 결론을 요약할 때",
    "stance": "입장이나 주장을 분명히 말할 때",
    "nuance": "미묘한 차이를 설명할 때",
    "scope": "적용 범위와 조건을 말할 때",
    "implication": "함의와 더 깊은 문제를 말할 때",
    "critique": "한계나 빠진 점을 지적할 때",
    "alternative": "대안을 제시할 때",
    "emphasis": "특히 중요한 점을 강조할 때",
    "transition": "논점을 다음 주제로 연결할 때",
    "strategy": "전략적 선택지를 말할 때",
    "governance": "체계나 운영 방식을 말할 때",
    "evaluation": "평가 기준과 성공 조건을 말할 때",
    "stakeholder": "이해관계자와 고려 사항을 말할 때",
    "implementation": "실행 조건과 도입 방식을 말할 때",
    "recommendation": "신중한 추천을 할 때",
    "rhetoric": "말투를 조절해 강하게 또는 공정하게 말할 때",
    "precision": "정확한 구분과 정의가 필요할 때",
    "causality": "원인 설명의 타당성을 말할 때",
    "synthesis": "여러 근거를 종합할 때",
    "anticipation": "예상 반론을 다룰 때",
    "judgment": "판단 기준을 제시할 때",
    "conclusion": "실무적 결론이나 장기적 의미를 말할 때",
    "style": "강도를 조절하며 설득력 있게 말할 때",
}


def build_example_ko(meaning_ko: str, context: dict[str, str], level: int) -> str:
    if level <= 2:
        return f"이 예문은 '{meaning_ko}'라는 뜻으로 일상 대화에서 바로 쓴다."
    if level <= 4:
        return f"이 예문은 '{meaning_ko}'라는 뜻으로 이유, 조건, 계획을 붙여 자연스럽게 말한다."
    if level <= 6:
        return f"이 예문은 '{meaning_ko}'라는 뜻으로 회의나 업무 대화에서 공손하게 쓴다."
    if level <= 8:
        return f"이 예문은 '{meaning_ko}'라는 뜻으로 주장, 설명, 반박을 연결할 때 쓴다."
    return f"이 예문은 '{meaning_ko}'라는 뜻으로 전문적인 논의에서 정확하게 입장을 잡을 때 쓴다."


def build_dialogue(expression: str, meaning_ko: str, function: str, level: int) -> tuple[str, str]:
    expression_sentence = normalize_sentence(expression)
    if level <= 2:
        dialogue_en = f"A: {expression_sentence} / B: Sure, let's do that."
        dialogue_ko = f"A: {meaning_ko}. / B: 좋아요, 그렇게 해요."
    elif level <= 4:
        dialogue_en = f"A: {expression_sentence} / B: That makes sense. What should we do next?"
        dialogue_ko = f"A: {meaning_ko}. / B: 이해돼요. 다음엔 뭘 하면 될까요?"
    elif level <= 6:
        dialogue_en = f"A: {expression_sentence} / B: Good point. Let's discuss it before we decide."
        dialogue_ko = f"A: {meaning_ko}. / B: 좋은 지적이에요. 결정하기 전에 논의해 봅시다."
    elif level <= 8:
        dialogue_en = f"A: {expression_sentence} / B: I see the point, but we may need more evidence."
        dialogue_ko = f"A: {meaning_ko}. / B: 요지는 알겠지만 근거가 더 필요할 수 있어요."
    else:
        dialogue_en = f"A: {expression_sentence} / B: That's a strong framing. Let's test the assumption."
        dialogue_ko = f"A: {meaning_ko}. / B: 강한 문제 설정이네요. 그 가정을 검토해 봅시다."

    if function in {"request", "soften", "polite", "asking"}:
        dialogue_en = f"A: {expression_sentence} / B: Of course. Give me a moment."
        dialogue_ko = f"A: {meaning_ko}. / B: 물론이죠. 잠깐만요."
    elif function in {"pushback", "critique", "anticipation"}:
        dialogue_en = f"A: {expression_sentence} / B: Fair point. How would you revise it?"
        dialogue_ko = f"A: {meaning_ko}. / B: 타당한 지적이에요. 어떻게 수정하면 좋을까요?"

    return dialogue_en, dialogue_ko


def build_practice_prompt(meaning_ko: str, function: str) -> str:
    situation = SITUATION_BY_FUNCTION.get(function, "상황에 맞춰 표현을 말할 때")
    return f"{situation}, '{meaning_ko}'라는 뜻이 되도록 영어로 말해 보세요."


def sentence_case(text: str) -> str:
    return text[:1].upper() + text[1:] if text else text


def normalize_sentence(text: str) -> str:
    text = text.strip()
    return text if text.endswith(("?", ".", "!")) else f"{text}."


def strip_sentence_end(text: str) -> str:
    return text.rstrip(".?!")


def chunk_expression(expression: str) -> str:
    words = expression.split()
    if len(words) <= 3:
        return " / ".join(words)
    if len(words) <= 6:
        return " ".join(words[:2]) + " / " + " ".join(words[2:])
    return " ".join(words[:3]) + " / " + " ".join(words[3:6]) + " / " + " ".join(words[6:])


def build_cloze(expression: str) -> str:
    words = expression.split()
    if not words:
        return expression
    important_indices = [
        i for i, word in enumerate(words)
        if word.lower().strip(".,?!;:") in {
            "about", "to", "with", "for", "on", "in", "of", "up", "out", "over",
            "through", "between", "against", "rather", "unless", "whether", "because",
            "given", "considering", "despite", "although", "even", "should", "could",
            "would", "might", "supposed", "used", "worth", "make", "makes", "made",
        }
    ]
    if important_indices:
        idx = important_indices[0]
    elif len(words) >= 4:
        idx = 2
    else:
        idx = len(words) - 1
    answer = words[idx].strip(".,?!;:")
    words[idx] = "____"
    return f"{' '.join(words)} | answer: {answer}"


def build_reverse_prompt(meaning_ko: str, situation_ko: str) -> str:
    return f"{situation_ko}: '{meaning_ko}'를 영어 표현으로 떠올리기"


def build_memory_tip(expression: str, note_ko: str, function: str) -> str:
    base = strip_sentence_end(expression)
    if function in {"asking", "request", "soften", "polite"}:
        return f"입으로 먼저 '{base}'를 한 덩어리로 말하고, 뒤에 목적어만 바꿔 붙인다."
    if function in {"contrast", "condition", "reason", "concession"}:
        return f"연결어를 먼저 외운다: {note_ko}. 앞절과 뒷절을 나눠서 말한다."
    if function in {"meeting", "status", "handoff", "priority", "implementation"}:
        return f"업무 상황에서 바로 쓰는 틀이다. 핵심 동사구를 고정하고 주제만 바꾼다."
    if function in {"argument", "evidence", "critique", "synthesis", "precision", "rhetoric"}:
        return f"토론용 문장 시작 장치로 외운다. 첫 3단어를 자동으로 나오게 반복한다."
    return f"패턴 '{note_ko}'를 먼저 기억하고, 마지막 정보만 바꿔 말한다."


def build_confusion_note(function: str, note_ko: str) -> str:
    if function in {"experience", "mistake"}:
        return "시제와 p.p. 형태를 놓치기 쉽다. 뜻보다 먼저 동사 형태를 확인한다."
    if function in {"condition", "concession"}:
        return "한국어 어순대로 직역하지 말고 연결어 뒤에 완전한 문장을 둔다."
    if function in {"request", "soften", "polite"}:
        return "명령처럼 들리지 않게 Could/Would/Please의 공손함을 살린다."
    if function in {"critique", "pushback", "anticipation"}:
        return "반대 표현이지만 공격적으로 들리지 않게 앞뒤 완충 표현을 함께 외운다."
    if "to" in note_ko:
        return "to 뒤에는 동사원형이 온다."
    if "-ing" in note_ko:
        return "전치사나 특정 동사 뒤에는 -ing 형태가 온다."
    return "표현 전체를 한 덩어리로 외우고 단어별 직역을 피한다."


def build_tags(level_no: int, function: str, note_ko: str) -> str:
    tags = [f"L{level_no}", function]
    if level_no <= 2:
        tags.append("daily")
    elif level_no <= 4:
        tags.append("conversation")
    elif level_no <= 6:
        tags.append("work")
    elif level_no <= 8:
        tags.append("discussion")
    else:
        tags.append("professional")
    if "to" in note_ko:
        tags.append("to-infinitive")
    if "-ing" in note_ko:
        tags.append("gerund")
    return "|".join(tags)


def build_review_steps(expression: str, meaning_ko: str) -> str:
    chunked = chunk_expression(expression)
    return f"1 뜻 보기: {meaning_ko} -> 2 끊어 읽기: {chunked} -> 3 가리고 말하기 -> 4 내 상황으로 한 문장 바꾸기"


def generate_rows() -> list[dict[str, str | int]]:
    rows: list[dict[str, str | int]] = []
    row_id = 1
    for level in LEVELS:
        frames = level["frames"]
        assert len(frames) == 20
        for frame_index, (function, expression, example, meaning_ko, note_ko) in enumerate(frames, start=1):
            for variation in range(50):
                context = row_context(frame_index * 50 + variation)
                level_no = int(level["level"])
                expression_text = render(expression, context, level_no)
                example_en = sentence_case(render(example, context, level_no))
                meaning_text = render(meaning_ko, context, level_no)
                example_ko = build_example_ko(meaning_text, context, level_no)
                dialogue_en, dialogue_ko = build_dialogue(expression_text, meaning_text, function, level_no)
                situation = SITUATION_BY_FUNCTION.get(function, "상황에 맞춰 표현을 말할 때")
                rows.append({
                    "id": row_id,
                    "level": level["level"],
                    "cefr": level["cefr"],
                    "level_title": level["title"],
                    "function": function,
                    "pattern_no": frame_index,
                    "variation_no": variation + 1,
                    "expression": expression_text,
                    "meaning_ko": meaning_text,
                    "example_en": example_en,
                    "example_ko": example_ko,
                    "dialogue_en": dialogue_en,
                    "dialogue_ko": dialogue_ko,
                    "situation_ko": situation,
                    "note_ko": note_ko,
                    "memory_chunk": chunk_expression(expression_text),
                    "cloze_prompt": build_cloze(expression_text),
                    "reverse_prompt_ko": build_reverse_prompt(meaning_text, situation),
                    "memory_tip_ko": build_memory_tip(expression_text, note_ko, function),
                    "confusion_note_ko": build_confusion_note(function, note_ko),
                    "review_steps_ko": build_review_steps(expression_text, meaning_text),
                    "tags": build_tags(level_no, function, note_ko),
                    "practice_prompt_ko": build_practice_prompt(meaning_text, function),
                })
                row_id += 1
    return rows


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    rows = generate_rows()
    with OUT.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} rows to {OUT}")


if __name__ == "__main__":
    main()
