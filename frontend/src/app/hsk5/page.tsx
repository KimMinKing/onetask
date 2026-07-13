"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type DailyPlan = {
  day: number;
  phase: string;
  focus: string;
  goal: string;
  tasks: string[];
  output: string;
};

type Progress = Record<number, boolean[]>;
type MistakeArea = "단어" | "문형" | "듣기" | "독해" | "쓰기" | "시간";
type Mistake = {
  id: string;
  area: MistakeArea;
  text: string;
  fix: string;
  createdAt: string;
  done: boolean;
};

const START_KEY = "hsk5_course_start";
const PROGRESS_KEY = "hsk5_course_progress";
const EXAM_DATE_KEY = "hsk5_exam_date";
const MISTAKES_KEY = "hsk5_mistakes";

const mistakeAreas: MistakeArea[] = ["단어", "문형", "듣기", "독해", "쓰기", "시간"];

const phases = [
  {
    title: "1주차",
    subtitle: "HSK4 압축 복구 + HSK5 진입",
    detail: "HSK4를 안 봤다는 전제를 깔고 기본 문형, 접속사, 독해 속도를 먼저 복구합니다.",
  },
  {
    title: "2주차",
    subtitle: "HSK5 어휘와 독해 체력",
    detail: "새 단어를 예문 단위로 묶고, 긴 지문에서 핵심 문장을 빨리 찾는 훈련을 합니다.",
  },
  {
    title: "3주차",
    subtitle: "듣기/쓰기 실전 전환",
    detail: "듣기는 선지 예측, 쓰기는 짧고 안전한 문장 조합으로 점수를 확보합니다.",
  },
  {
    title: "4주차",
    subtitle: "모의고사와 오답 회전",
    detail: "새로운 공부를 줄이고 틀린 유형, 시간 배분, 시험장 루틴을 고정합니다.",
  },
];

const scoreTargets = [
  { label: "듣기", target: "65+", tactic: "선지를 먼저 읽고 사람/장소/이유/결론만 잡기" },
  { label: "독해", target: "70+", tactic: "빈칸은 품사로 줄이고, 장문은 문제 위치부터 찾기" },
  { label: "쓰기", target: "65+", tactic: "짧고 정확한 문장 5~7개로 감점 줄이기" },
];

const diagnosticChecks = [
  "HSK4 접속사와 보어 문장을 보면 3초 안에 구조가 보인다.",
  "HSK5 단어를 봤을 때 뜻만이 아니라 함께 쓰는 동사/목적어가 떠오른다.",
  "듣기 문제에서 선지를 먼저 읽고 질문 유형을 예측한다.",
  "독해 장문을 전부 번역하지 않고 문제 근처 문장부터 확인한다.",
  "쓰기 2부에서 제시어를 넣은 5문장을 8분 안에 만든다.",
];

const dailyRoutine = [
  { time: "20분", label: "단어", detail: "due 복습 먼저, 신규는 예문까지" },
  { time: "35분", label: "독해", detail: "빈칸 15문항 또는 장문 3~4지문" },
  { time: "30분", label: "듣기", detail: "선지 예측 후 오답 스크립트 재청취" },
  { time: "25분", label: "쓰기", detail: "어순 배열 또는 80자 작문 1개" },
];

const writingTemplates = [
  {
    label: "그림 묘사",
    text: "这张图片里有一个人正在...。他/她看起来很...。我觉得这件事说明了...。",
  },
  {
    label: "이유 설명",
    text: "我认为...很重要。第一，...。第二，...。所以我们应该...。",
  },
  {
    label: "경험 서술",
    text: "我曾经有过一次...的经历。那时候我...。通过这件事，我明白了...。",
  },
  {
    label: "변화/추세",
    text: "随着社会的发展，...越来越...。这种变化给人们带来了...，也让我们需要...。",
  },
  {
    label: "마무리",
    text: "总之，...不仅...，而且...。如果我们能...，生活会变得更好。",
  },
];

const listeningDrills = [
  {
    title: "이유 파악",
    prompt: "他今天没来上课，是因为昨天晚上发烧了。",
    question: "왜 수업에 오지 않았는가?",
    answer: "어젯밤에 열이 났기 때문입니다.",
  },
  {
    title: "태도 파악",
    prompt: "虽然这个办法不太完美，但是目前看来已经是最合适的选择了。",
    question: "말하는 사람의 태도는?",
    answer: "완벽하진 않지만 현재 가장 적합한 선택이라고 봅니다.",
  },
  {
    title: "결론 파악",
    prompt: "这个城市的交通越来越方便，所以很多年轻人愿意搬到这里工作。",
    question: "젊은 사람들이 이 도시로 오는 이유는?",
    answer: "교통이 점점 편리해져서 이곳에서 일하려고 합니다.",
  },
  {
    title: "세부 정보",
    prompt: "会议原来安排在星期三下午，后来改到了星期五上午九点。",
    question: "회의는 언제로 바뀌었는가?",
    answer: "금요일 오전 9시입니다.",
  },
];

const dailyPlans: DailyPlan[] = [
  {
    day: 1,
    phase: "진단",
    focus: "현재 실력 확인",
    goal: "HSK4 공백과 HSK5 위험 영역을 분리한다.",
    tasks: ["HSK4 단어 120개 빠르게 훑기", "HSK5 단어 40개 학습", "듣기 20문항을 시간 재고 풀기", "틀린 문제를 원인 3종류로 표시"],
    output: "약점표: 단어 부족 / 문형 부족 / 속도 부족",
  },
  {
    day: 2,
    phase: "HSK4 보강",
    focus: "기본 접속사",
    goal: "因为, 虽然, 如果, 不但 같은 연결 표현을 문장 안에서 바로 읽는다.",
    tasks: ["HSK4 단어 150개 복습", "HSK5 단어 45개 학습", "접속사 예문 20개 소리 내어 읽기", "짧은 독해 3지문 시간 제한"],
    output: "접속사 10개로 직접 문장 만들기",
  },
  {
    day: 3,
    phase: "HSK4 보강",
    focus: "보어와 把/被",
    goal: "결과보어, 방향보어, 把/被 문장을 해석에서 멈추지 않는다.",
    tasks: ["HSK4 단어 150개 복습", "HSK5 단어 45개 학습", "보어 문장 20개 분석", "쓰기 1부 어순 배열 8문항"],
    output: "헷갈린 문형 5개를 예문으로 저장",
  },
  {
    day: 4,
    phase: "HSK4 보강",
    focus: "비교/정도/가능 표현",
    goal: "比, 没有, 越来越, 够, 得 같은 표현을 자동 처리한다.",
    tasks: ["HSK4 단어 150개 복습", "HSK5 단어 45개 학습", "비교문 20개 번역", "듣기 1부 20문항"],
    output: "비교문 패턴 6개 암기",
  },
  {
    day: 5,
    phase: "HSK4 보강",
    focus: "시간 순서와 경험",
    goal: "了, 过, 着, 正在, 已经의 역할을 빠르게 구분한다.",
    tasks: ["HSK4 단어 150개 복습", "HSK5 단어 50개 학습", "시제/상 예문 25개 읽기", "독해 빈칸 15문항"],
    output: "자주 틀린 조사/부사 목록",
  },
  {
    day: 6,
    phase: "HSK4 보강",
    focus: "HSK4 압축 점검",
    goal: "HSK4 핵심 단어와 문형을 HSK5 학습의 발판으로 만든다.",
    tasks: ["HSK4 전체 즐겨찾기/오답만 재복습", "HSK5 단어 50개 학습", "독해 45분 세트 절반 풀기", "쓰기 문장 배열 10문항"],
    output: "HSK4 잔여 약점 10개",
  },
  {
    day: 7,
    phase: "전환",
    focus: "미니 모의고사",
    goal: "HSK4 보강을 닫고 HSK5 실전 루틴으로 넘어간다.",
    tasks: ["듣기 25문항", "독해 25문항", "쓰기 1부 8문항", "오답 단어 40개를 즐겨찾기"],
    output: "1주차 점수와 2주차 목표",
  },
  {
    day: 8,
    phase: "HSK5 확장",
    focus: "추상 명사",
    goal: "态度, 经验, 影响 같은 추상어를 예문 단위로 익힌다.",
    tasks: ["HSK5 단어 60개 학습", "예문 20개 따라 읽기", "독해 빈칸 15문항", "듣기 복습 15분"],
    output: "추상 명사 20개 예문 저장",
  },
  {
    day: 9,
    phase: "HSK5 확장",
    focus: "동사 결합",
    goal: "提高, 解决, 适应, 证明 같은 시험형 동사를 문맥에서 잡는다.",
    tasks: ["HSK5 단어 60개 학습", "동사+목적어 묶음 30개 암기", "독해 2부 10문항", "쓰기 2부 그림 묘사 1개"],
    output: "동사 collocation 20개",
  },
  {
    day: 10,
    phase: "HSK5 확장",
    focus: "듣기 선지 예측",
    goal: "듣기 전에 사람, 장소, 이유, 결론을 예측한다.",
    tasks: ["HSK5 단어 55개 학습", "듣기 1부 20문항", "오답 스크립트 받아쓰기 5문장", "짧은 독해 3지문"],
    output: "듣기 오답 유형 3개",
  },
  {
    day: 11,
    phase: "HSK5 확장",
    focus: "긴 문장 끊어 읽기",
    goal: "수식어가 긴 문장에서 주어, 술어, 목적어를 먼저 찾는다.",
    tasks: ["HSK5 단어 60개 학습", "긴 문장 15개 구조 표시", "독해 3부 4지문", "쓰기 배열 8문항"],
    output: "끊어 읽기 표시한 문장 10개",
  },
  {
    day: 12,
    phase: "HSK5 확장",
    focus: "동의어/유의어",
    goal: "비슷한 뜻의 단어를 시험 선지에서 구분한다.",
    tasks: ["HSK5 단어 60개 학습", "유의어 세트 15개 정리", "독해 빈칸 15문항", "듣기 2부 15문항"],
    output: "유의어 표 15개",
  },
  {
    day: 13,
    phase: "HSK5 확장",
    focus: "쓰기 안전 문장",
    goal: "어려운 표현보다 정확한 짧은 문장으로 감점을 줄인다.",
    tasks: ["HSK5 단어 50개 학습", "쓰기 1부 10문항", "제시어 5개로 80자 글 1개", "첨삭 기준으로 자가 점검"],
    output: "80자 글 1개",
  },
  {
    day: 14,
    phase: "점검",
    focus: "2주차 미니 모의고사",
    goal: "단어량 증가가 실제 문제 점수로 이어지는지 확인한다.",
    tasks: ["듣기 45문항", "독해 45문항", "쓰기 10문항", "오답 단어 60개 즐겨찾기"],
    output: "목표 점수 대비 부족 영역 1개 선택",
  },
  {
    day: 15,
    phase: "실전 전환",
    focus: "듣기 1부 속도",
    goal: "짧은 대화에서 결론을 놓치지 않는다.",
    tasks: ["HSK5 단어 50개 학습", "듣기 1부 2세트", "오답 스크립트 쉐도잉 10분", "독해 빈칸 10문항"],
    output: "듣기 핵심 신호어 10개",
  },
  {
    day: 16,
    phase: "실전 전환",
    focus: "듣기 2부 정보 유지",
    goal: "긴 대화에서 숫자, 태도, 이유를 메모 없이 기억한다.",
    tasks: ["HSK5 단어 50개 학습", "듣기 2부 25문항", "틀린 지문 다시 듣기", "요약 문장 5개 작성"],
    output: "듣기 요약 5문장",
  },
  {
    day: 17,
    phase: "실전 전환",
    focus: "독해 빈칸",
    goal: "품사와 앞뒤 호응으로 답을 좁힌다.",
    tasks: ["HSK5 단어 55개 학습", "독해 1부 30문항", "오답 선지 품사 표시", "쓰기 배열 8문항"],
    output: "빈칸 오답 규칙 5개",
  },
  {
    day: 18,
    phase: "실전 전환",
    focus: "독해 장문",
    goal: "모든 문장을 번역하지 않고 문제 위치를 먼저 찾는다.",
    tasks: ["HSK5 단어 50개 학습", "독해 3부 8지문", "각 지문 제목 붙이기", "모르는 단어 30개만 추림"],
    output: "장문별 한 줄 요약",
  },
  {
    day: 19,
    phase: "실전 전환",
    focus: "쓰기 1부",
    goal: "어순 배열을 안정적인 점수원으로 만든다.",
    tasks: ["HSK5 단어 45개 학습", "쓰기 1부 24문항", "틀린 문장 10개 재작성", "문형별 오류 표시"],
    output: "틀린 어순 패턴 5개",
  },
  {
    day: 20,
    phase: "실전 전환",
    focus: "쓰기 2부",
    goal: "제시 단어와 그림을 5문장 안에 자연스럽게 넣는다.",
    tasks: ["HSK5 단어 45개 학습", "제시어 작문 2개", "그림 묘사 작문 1개", "문장 길이 줄여서 재작성"],
    output: "작문 3개",
  },
  {
    day: 21,
    phase: "점검",
    focus: "3주차 반쪽 모의고사",
    goal: "영역별 시간 초과 여부를 확인한다.",
    tasks: ["듣기 30분", "독해 45분", "쓰기 40분", "오답을 다음 3일 계획에 배치"],
    output: "시간 배분표",
  },
  {
    day: 22,
    phase: "모의고사",
    focus: "1회차 풀세트",
    goal: "125분 실전 체력을 만든다.",
    tasks: ["실전처럼 100문항 풀기", "채점만 하고 바로 쉬기", "오답은 저녁에 분류", "단어장 due 복습만 수행"],
    output: "1회차 점수와 체감 난도",
  },
  {
    day: 23,
    phase: "오답 회전",
    focus: "1회차 오답 복구",
    goal: "틀린 문제를 다시 틀리지 않을 형태로 바꾼다.",
    tasks: ["오답 단어 80개 복습", "듣기 오답 지문 5개 쉐도잉", "독해 오답 지문 재풀이", "쓰기 오답 문장 재작성"],
    output: "오답 재풀이 정답률",
  },
  {
    day: 24,
    phase: "모의고사",
    focus: "2회차 풀세트",
    goal: "첫 회보다 시간 배분을 개선한다.",
    tasks: ["실전처럼 100문항 풀기", "독해는 쉬운 지문 먼저 처리", "쓰기 2부 초안 3분 제한", "채점 후 약점 하나만 선택"],
    output: "2회차 점수와 시간 초과 구간",
  },
  {
    day: 25,
    phase: "오답 회전",
    focus: "2회차 오답 복구",
    goal: "반복되는 약점을 제거한다.",
    tasks: ["반복 오답 단어 80개 복습", "빈칸/장문 중 약한 유형 30문항", "작문 2개 재작성", "듣기 선지 예측 20문항"],
    output: "반복 오답 TOP 10",
  },
  {
    day: 26,
    phase: "모의고사",
    focus: "3회차 풀세트",
    goal: "합격선보다 20점 높은 여유 점수를 노린다.",
    tasks: ["실전처럼 100문항 풀기", "쉬운 문제에서 실수 금지", "채점 후 즉시 점수 기록", "단어장 due 복습"],
    output: "3회차 점수",
  },
  {
    day: 27,
    phase: "압축 정리",
    focus: "고빈도 오답",
    goal: "새 자료를 늘리지 않고 내 오답만 본다.",
    tasks: ["즐겨찾기 단어 전체 복습", "오답 문장 30개 소리 내어 읽기", "작문 템플릿 5개 암기", "듣기 쉐도잉 20분"],
    output: "시험 전 최종 오답노트",
  },
  {
    day: 28,
    phase: "최종 모의",
    focus: "4회차 풀세트",
    goal: "시험 당일 루틴 그대로 실행한다.",
    tasks: ["같은 시간대에 풀세트", "휴식/물/필기구 루틴 고정", "채점 후 큰 약점만 확인", "밤에는 단어장 due만"],
    output: "최종 예상 점수",
  },
  {
    day: 29,
    phase: "가볍게 유지",
    focus: "실수 방지",
    goal: "컨디션을 떨어뜨리지 않고 감각만 유지한다.",
    tasks: ["오답 단어 100개 가볍게 확인", "듣기 20문항", "쓰기 템플릿 3개", "독해 지문 2개만 풀기"],
    output: "시험장 체크리스트",
  },
  {
    day: 30,
    phase: "전날",
    focus: "컨디션 고정",
    goal: "새 공부를 멈추고 실수를 줄인다.",
    tasks: ["단어장 due 복습만 수행", "작문 시작 문장 5개 확인", "시험 시간표 확인", "일찍 자기"],
    output: "최종 루틴 완료",
  },
];

function loadProgress(): Progress {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProgress(progress: Progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function loadMistakes(): Mistake[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(MISTAKES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveMistakes(mistakes: Mistake[]) {
  localStorage.setItem(MISTAKES_KEY, JSON.stringify(mistakes));
}

function getStartDate(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(START_KEY);
}

function getExamDate(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(EXAM_DATE_KEY);
}

function getCourseDay(startDate: string | null) {
  if (!startDate) return 1;
  const start = new Date(`${startDate}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
  return Math.min(Math.max(diff, 1), 30);
}

function getDaysUntil(date: string | null) {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function speakChinese(text: string) {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "zh-CN";
  utter.rate = 0.85;
  window.speechSynthesis.speak(utter);
}

export default function Hsk5CoursePage() {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress>({});
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [mistakeArea, setMistakeArea] = useState<MistakeArea>("단어");
  const [mistakeText, setMistakeText] = useState("");
  const [mistakeFix, setMistakeFix] = useState("");
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [activeListening, setActiveListening] = useState(0);
  const [showListeningAnswer, setShowListeningAnswer] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    const savedStart = getStartDate();
    const savedExamDate = getExamDate();
    setStartDate(savedStart);
    setExamDate(savedExamDate);
    setProgress(loadProgress());
    setMistakes(loadMistakes());
    setSelectedDay(getCourseDay(savedStart));
  }, []);

  const completedTasks = useMemo(
    () => Object.values(progress).flat().filter(Boolean).length,
    [progress]
  );
  const totalTasks = dailyPlans.reduce((sum, day) => sum + day.tasks.length, 0);
  const currentDay = getCourseDay(startDate);
  const todayPlan = dailyPlans[currentDay - 1];
  const todayChecked = progress[todayPlan.day] || [];
  const day = dailyPlans[selectedDay - 1];
  const checked = progress[day.day] || [];
  const completedDays = dailyPlans.filter((plan) => {
    const checks = progress[plan.day] || [];
    return checks.length === plan.tasks.length && checks.every(Boolean);
  }).length;
  const dday = getDaysUntil(examDate);

  const startToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(START_KEY, today);
    setStartDate(today);
    setSelectedDay(1);
  };

  const updateExamDate = (value: string) => {
    const next = value || null;
    setExamDate(next);
    if (next) localStorage.setItem(EXAM_DATE_KEY, next);
    else localStorage.removeItem(EXAM_DATE_KEY);
  };

  const togglePlanTask = (planDay: number, taskIndex: number) => {
    const plan = dailyPlans[planDay - 1];
    const next = { ...progress };
    const dayProgress = [...(next[plan.day] || Array(plan.tasks.length).fill(false))];
    dayProgress[taskIndex] = !dayProgress[taskIndex];
    next[plan.day] = dayProgress;
    setProgress(next);
    saveProgress(next);
  };

  const toggleTask = (taskIndex: number) => togglePlanTask(day.day, taskIndex);

  const addMistake = () => {
    const text = mistakeText.trim();
    const fix = mistakeFix.trim();
    if (!text || !fix) return;
    const next = [
      {
        id: `${Date.now()}`,
        area: mistakeArea,
        text,
        fix,
        createdAt: new Date().toISOString(),
        done: false,
      },
      ...mistakes,
    ];
    setMistakes(next);
    saveMistakes(next);
    setMistakeText("");
    setMistakeFix("");
  };

  const toggleMistake = (id: string) => {
    const next = mistakes.map((mistake) =>
      mistake.id === id ? { ...mistake, done: !mistake.done } : mistake
    );
    setMistakes(next);
    saveMistakes(next);
  };

  const removeMistake = (id: string) => {
    const next = mistakes.filter((mistake) => mistake.id !== id);
    setMistakes(next);
    saveMistakes(next);
  };

  const copyTemplate = (label: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTemplate(label);
      setTimeout(() => setCopiedTemplate(null), 1200);
    });
  };

  const listening = listeningDrills[activeListening];

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      <div className="px-5 pt-10 pb-5 bg-dark-300 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-dark-200 hover:bg-dark-100 text-stone-500 hover:text-stone-200 transition-colors"
            aria-label="뒤로가기"
          >
            ←
          </button>
          <div>
            <p className="text-xs text-jeok-400 font-semibold">HSK5 한 달 코스</p>
            <h1 className="text-2xl font-bold text-stone-100">HSK4 공백을 메우고 HSK5 합격권으로</h1>
          </div>
        </div>
        <p className="text-sm text-stone-500 mt-4 leading-relaxed">
          HSK5는 듣기, 독해, 쓰기 100문항 실전 시험입니다. 이 코스는 HSK4를 보지 않았다는 전제로
          초반 7일을 HSK4 핵심 복구에 쓰고, 이후 HSK5 어휘와 실전 문제로 전환합니다.
        </p>
      </div>

      <div className="px-4 py-4 space-y-4 overflow-y-auto">
        <section className="grid grid-cols-2 gap-2">
          <div className="bg-dark-200 border border-white/5 rounded-xl px-3 py-3">
            <p className="text-xs text-stone-600">현재</p>
            <p className="text-xl font-bold text-stone-100">{currentDay}일차</p>
          </div>
          <div className="bg-dark-200 border border-white/5 rounded-xl px-3 py-3">
            <p className="text-xs text-stone-600">완료일</p>
            <p className="text-xl font-bold text-stone-100">{completedDays}/30</p>
          </div>
          <div className="bg-dark-200 border border-white/5 rounded-xl px-3 py-3">
            <p className="text-xs text-stone-600">체크</p>
            <p className="text-xl font-bold text-stone-100">{completedTasks}/{totalTasks}</p>
          </div>
          <div className="bg-dark-200 border border-white/5 rounded-xl px-3 py-3">
            <p className="text-xs text-stone-600">시험까지</p>
            <p className="text-xl font-bold text-stone-100">
              {dday === null ? "미정" : dday >= 0 ? `D-${dday}` : `+${Math.abs(dday)}일`}
            </p>
          </div>
        </section>

        <section className="bg-dark-200 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-stone-100">오늘부터 30일 카운트</p>
              <p className="text-xs text-stone-600 mt-1">
                {startDate ? `${startDate} 시작 · 오늘은 ${currentDay}일차` : "시작일을 누르면 오늘 기준으로 진행일을 계산합니다."}
              </p>
            </div>
            <button
              onClick={startToday}
              className="shrink-0 px-4 py-2 rounded-xl bg-jeok-600 hover:bg-jeok-500 text-white text-sm font-bold transition-colors"
            >
              {startDate ? "오늘로 재시작" : "오늘 시작"}
            </button>
          </div>
          <div className="h-2 bg-dark-100 rounded-full overflow-hidden mt-4">
            <div
              className="h-full bg-jeok-500 rounded-full transition-all"
              style={{ width: `${Math.round((completedTasks / totalTasks) * 100)}%` }}
            />
          </div>
        </section>

        <section className="bg-dark-200 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-stone-100">시험일 설정</p>
              <p className="text-xs text-stone-600 mt-1">
                실제 시험일을 넣어두면 D-day를 보면서 30일 코스를 조정할 수 있습니다.
              </p>
            </div>
            <input
              type="date"
              value={examDate ?? ""}
              onChange={(e) => updateExamDate(e.target.value)}
              className="shrink-0 bg-dark-100 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 outline-none focus:border-jeok-600"
            />
          </div>
        </section>

        <section className="bg-dark-200 border border-white/5 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-jeok-400 font-bold">오늘 할 일 자동 생성</p>
              <h2 className="text-lg font-bold text-stone-100 mt-1">{todayPlan.day}일차 · {todayPlan.focus}</h2>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">{todayPlan.goal}</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-stone-400 bg-dark-100 rounded-full px-3 py-1">
              {todayChecked.filter(Boolean).length}/{todayPlan.tasks.length}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {todayPlan.tasks.map((task, index) => (
              <button
                key={task}
                onClick={() => togglePlanTask(todayPlan.day, index)}
                className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl border transition-colors ${
                  todayChecked[index]
                    ? "bg-green-900/20 border-green-900 text-green-200"
                    : "bg-dark-100 border-white/5 text-stone-300 hover:border-jeok-800"
                }`}
              >
                <span className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs ${
                  todayChecked[index] ? "border-green-600 bg-green-700 text-white" : "border-stone-700 text-transparent"
                }`}>
                  ✓
                </span>
                <span className="text-sm leading-relaxed">{task}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Link
              href="/words?hsk=5"
              className="bg-jeok-600 hover:bg-jeok-500 text-white rounded-xl px-4 py-3 text-center text-sm font-bold transition-colors"
            >
              HSK5 단어 집중
            </Link>
            <button
              onClick={() => setSelectedDay(todayPlan.day)}
              className="bg-dark-100 hover:bg-dark-300 border border-white/5 text-stone-200 rounded-xl px-4 py-3 text-sm font-bold transition-colors"
            >
              상세 플랜 열기
            </button>
          </div>
        </section>

        <section className="bg-dark-200 border border-white/5 rounded-2xl p-4">
          <p className="text-sm font-bold text-stone-100">목표 점수 운영</p>
          <p className="text-xs text-stone-600 mt-1">총점 300점 기준으로 안정권을 만들기 위해, 한 달 코스에서는 200점 이상을 실전 목표로 잡습니다.</p>
          <div className="mt-3 space-y-2">
            {scoreTargets.map((target) => (
              <div key={target.label} className="bg-dark-100 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-stone-200">{target.label}</p>
                  <span className="text-xs font-bold text-jeok-400">{target.target}</span>
                </div>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">{target.tactic}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-dark-200 border border-white/5 rounded-2xl p-4">
          <p className="text-sm font-bold text-stone-100">HSK4 공백 진단</p>
          <p className="text-xs text-stone-600 mt-1">아래 항목이 막히면 해당 날짜 플랜의 HSK4 보강 파트를 건너뛰지 마세요.</p>
          <div className="mt-3 space-y-2">
            {diagnosticChecks.map((check, index) => (
              <div key={check} className="flex items-start gap-3 bg-dark-100 rounded-xl px-4 py-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-jeok-900 text-jeok-300 text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <p className="text-xs text-stone-300 leading-relaxed">{check}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          {dailyRoutine.map((item) => (
            <div key={item.label} className="bg-dark-200 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-stone-100">{item.label}</p>
                <span className="text-xs font-bold text-jeok-400">{item.time}</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed mt-2">{item.detail}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-2 gap-2">
          {phases.map((phase) => (
            <div key={phase.title} className="bg-dark-200 border border-white/5 rounded-xl p-4">
              <p className="text-xs font-bold text-jeok-400">{phase.title}</p>
              <p className="text-sm font-bold text-stone-100 mt-1">{phase.subtitle}</p>
              <p className="text-xs text-stone-600 leading-relaxed mt-2">{phase.detail}</p>
            </div>
          ))}
        </section>

        <section className="bg-dark-200 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-stone-600">일차 선택</p>
              <p className="text-sm text-stone-300">오늘 할 분량을 열고 체크하세요.</p>
            </div>
            <button
              onClick={() => setSelectedDay(currentDay)}
              className="px-3 py-2 rounded-lg bg-dark-100 text-xs text-stone-300 hover:text-white transition-colors"
            >
              오늘 보기
            </button>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {dailyPlans.map((plan) => {
              const checks = progress[plan.day] || [];
              const done = checks.length === plan.tasks.length && checks.every(Boolean);
              return (
                <button
                  key={plan.day}
                  onClick={() => setSelectedDay(plan.day)}
                  className={`aspect-square rounded-lg text-xs font-bold transition-colors ${
                    selectedDay === plan.day
                      ? "bg-jeok-600 text-white"
                      : done
                      ? "bg-green-900/50 text-green-300"
                      : plan.day === currentDay
                      ? "bg-jeok-900/50 text-jeok-300"
                      : "bg-dark-100 text-stone-600 hover:text-stone-300"
                  }`}
                >
                  {plan.day}
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-dark-200 border border-white/5 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-xs text-jeok-400 font-bold">{day.day}일차 · {day.phase}</p>
              <h2 className="text-xl font-bold text-stone-100 mt-1">{day.focus}</h2>
              <p className="text-sm text-stone-500 mt-2 leading-relaxed">{day.goal}</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-stone-400 bg-dark-100 rounded-full px-3 py-1">
              {checked.filter(Boolean).length}/{day.tasks.length}
            </span>
          </div>

          <div className="space-y-2">
            {day.tasks.map((task, index) => (
              <button
                key={task}
                onClick={() => toggleTask(index)}
                className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl border transition-colors ${
                  checked[index]
                    ? "bg-green-900/20 border-green-900 text-green-200"
                    : "bg-dark-100 border-white/5 text-stone-300 hover:border-jeok-800"
                }`}
              >
                <span className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs ${
                  checked[index] ? "border-green-600 bg-green-700 text-white" : "border-stone-700 text-transparent"
                }`}>
                  ✓
                </span>
                <span className="text-sm leading-relaxed">{task}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-stone-600">오늘 남길 결과물</p>
            <p className="text-sm text-stone-300 mt-1">{day.output}</p>
          </div>
        </section>

        <section className="bg-dark-200 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-stone-100">HSK5 오답노트</p>
              <p className="text-xs text-stone-600 mt-1">틀린 이유와 다음 행동을 같이 적어두면 마지막 주에 그대로 회전할 수 있습니다.</p>
            </div>
            <span className="text-xs font-bold text-jeok-400 bg-jeok-950 rounded-full px-3 py-1">
              {mistakes.filter((mistake) => !mistake.done).length}개 남음
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <select
              value={mistakeArea}
              onChange={(e) => setMistakeArea(e.target.value as MistakeArea)}
              className="w-full bg-dark-100 border border-stone-700 rounded-xl px-3 py-3 text-sm text-stone-200 outline-none focus:border-jeok-600"
            >
              {mistakeAreas.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
            <textarea
              value={mistakeText}
              onChange={(e) => setMistakeText(e.target.value)}
              placeholder="틀린 문제, 헷갈린 단어, 막힌 문장을 적기"
              rows={2}
              className="w-full bg-dark-100 border border-stone-700 rounded-xl px-3 py-3 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-jeok-600 resize-none"
            />
            <textarea
              value={mistakeFix}
              onChange={(e) => setMistakeFix(e.target.value)}
              placeholder="다음에는 어떻게 고칠지 적기"
              rows={2}
              className="w-full bg-dark-100 border border-stone-700 rounded-xl px-3 py-3 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-jeok-600 resize-none"
            />
            <button
              onClick={addMistake}
              className="w-full bg-jeok-600 hover:bg-jeok-500 text-white rounded-xl px-4 py-3 text-sm font-bold transition-colors"
            >
              오답 추가
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {mistakes.length === 0 ? (
              <p className="text-xs text-stone-600 bg-dark-100 rounded-xl px-4 py-3">아직 저장된 오답이 없습니다.</p>
            ) : (
              mistakes.map((mistake) => (
                <div key={mistake.id} className="bg-dark-100 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-jeok-400">{mistake.area}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleMistake(mistake.id)}
                        className={`text-xs font-bold ${mistake.done ? "text-green-400" : "text-stone-500 hover:text-stone-300"}`}
                      >
                        {mistake.done ? "복구됨" : "미복구"}
                      </button>
                      <button
                        onClick={() => removeMistake(mistake.id)}
                        className="text-xs text-stone-700 hover:text-jeok-400 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <p className={`text-sm mt-2 leading-relaxed ${mistake.done ? "text-stone-600 line-through" : "text-stone-200"}`}>
                    {mistake.text}
                  </p>
                  <p className="text-xs text-stone-500 mt-2 leading-relaxed">수정: {mistake.fix}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-dark-200 border border-white/5 rounded-2xl p-4">
          <p className="text-sm font-bold text-stone-100">쓰기 템플릿 저장소</p>
          <p className="text-xs text-stone-600 mt-1">쓰기 2부는 완벽한 문장보다 안전하게 조립되는 문장을 반복합니다.</p>
          <div className="mt-3 space-y-2">
            {writingTemplates.map((template) => (
              <div key={template.label} className="bg-dark-100 border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-stone-200">{template.label}</p>
                  <button
                    onClick={() => copyTemplate(template.label, template.text)}
                    className="shrink-0 text-xs font-bold text-jeok-400 hover:text-jeok-300 transition-colors"
                  >
                    {copiedTemplate === template.label ? "복사됨" : "복사"}
                  </button>
                </div>
                <p className="text-sm text-stone-400 mt-2 leading-relaxed" style={{ fontFamily: "'LXGW WenKai', serif" }}>
                  {template.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-dark-200 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-stone-100">듣기 훈련 모드</p>
              <p className="text-xs text-stone-600 mt-1">문장을 먼저 듣고 질문을 확인한 뒤, 정답을 열어 핵심 정보를 비교합니다.</p>
            </div>
            <span className="text-xs font-bold text-stone-400 bg-dark-100 rounded-full px-3 py-1">
              {activeListening + 1}/{listeningDrills.length}
            </span>
          </div>
          <div className="mt-4 bg-dark-100 border border-white/5 rounded-xl p-4">
            <p className="text-xs font-bold text-jeok-400">{listening.title}</p>
            <p className="text-lg text-stone-100 mt-2 leading-relaxed" style={{ fontFamily: "'LXGW WenKai', serif" }}>
              {showListeningAnswer ? listening.prompt : "먼저 문장을 듣고 핵심 정보를 예측하세요."}
            </p>
            <p className="text-sm text-stone-400 mt-3">{listening.question}</p>
            {showListeningAnswer && (
              <p className="text-sm text-green-300 mt-2 leading-relaxed">정답: {listening.answer}</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <button
              onClick={() => speakChinese(listening.prompt)}
              className="bg-jeok-600 hover:bg-jeok-500 text-white rounded-xl px-3 py-3 text-xs font-bold transition-colors"
            >
              문장 듣기
            </button>
            <button
              onClick={() => setShowListeningAnswer((value) => !value)}
              className="bg-dark-100 hover:bg-dark-300 border border-white/5 text-stone-200 rounded-xl px-3 py-3 text-xs font-bold transition-colors"
            >
              {showListeningAnswer ? "정답 닫기" : "정답 보기"}
            </button>
            <button
              onClick={() => {
                setActiveListening((value) => (value + 1) % listeningDrills.length);
                setShowListeningAnswer(false);
              }}
              className="bg-dark-100 hover:bg-dark-300 border border-white/5 text-stone-200 rounded-xl px-3 py-3 text-xs font-bold transition-colors"
            >
              다음 문제
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <Link
            href="/words?hsk=5"
            className="bg-jeok-600 hover:bg-jeok-500 text-white rounded-2xl px-4 py-4 text-center font-bold transition-colors"
          >
            HSK5 단어 집중
          </Link>
          <Link
            href="/stats"
            className="bg-dark-200 hover:bg-dark-100 border border-white/5 text-stone-200 rounded-2xl px-4 py-4 text-center font-bold transition-colors"
          >
            학습 통계 보기
          </Link>
        </section>

        <section className="bg-dark-300 border border-white/5 rounded-2xl p-4 mb-4">
          <p className="text-sm font-bold text-stone-100">운영 원칙</p>
          <ul className="mt-3 space-y-2 text-xs text-stone-500 leading-relaxed">
            <li>매일 단어장은 due 복습을 먼저 끝내고 신규 단어를 봅니다.</li>
            <li>HSK4 공백은 오래 끌지 않습니다. 7일 뒤부터는 HSK5 문제 적응이 우선입니다.</li>
            <li>쓰기 2부는 어려운 문장보다 정확한 5~7문장 구성이 더 안정적입니다.</li>
            <li>마지막 주는 새 단어보다 오답 단어, 듣기 스크립트, 작문 템플릿을 반복합니다.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
