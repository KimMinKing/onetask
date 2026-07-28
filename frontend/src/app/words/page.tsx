"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { api, Word, EnglishWord, JapaneseWord } from "@/lib/api";

type Lang = "zh" | "en" | "ja";
type UiLanguage = "ko" | "zh";
type Mode = "lang-select" | "select" | "home" | "review" | "browse" | "today" | "daily" | "favorites" | "fav-review" | "fav-browse";
type Phase = "question" | "answer";

const STATE_LABEL: Record<UiLanguage, Record<number, string>> = {
  ko: { 0: "신규", 1: "학습중", 2: "복습", 3: "다시학습" },
  zh: { 0: "新词", 1: "学习中", 2: "复习", 3: "重新学习" },
};
const STATE_COLOR: Record<number, string> = {
  0: "text-stone-500", 1: "text-yellow-500", 2: "text-jeok-400", 3: "text-orange-400",
};

const UI_TEXT = {
  ko: {
    words: "단어장",
    todayStudy: "오늘의 학습",
    todayChinese: "오늘의 중국어",
    todayEnglish: "오늘의 영어",
    todayJapanese: "오늘의 일본어",
    loading: "불러오는 중...",
    noDaily: "오늘 할 것 없음 ✓",
    ready: (count: number) => `${count}개 준비됨`,
    levelStudy: "레벨별 공부",
    chineseLevel: "중국어 레벨 선택",
    englishLevel: "영어 레벨 선택",
    japaneseLevel: "일본어 레벨 선택",
    hskRange: "HSK 1~6급",
    enRange: "A1~C1 · 15,868개",
    jaRange: "JLPT N5~N1 · 8,131개",
    favorites: "즐겨찾기",
    chineseFavorites: "중국어 즐겨찾기",
    englishFavorites: "영어 즐겨찾기",
    japaneseFavorites: "일본어 즐겨찾기",
    noFavorites: "즐겨찾기 없음",
    count: (count: number) => `${count}개`,
    chinese: "중국어",
    english: "영어",
    japanese: "일본어",
    chooseLevel: "레벨을 선택하세요",
    allWords: "전체 단어",
    studiedToday: "오늘 공부한 단어",
    reviewFavorites: "플래시카드 복습",
    browseList: "목록으로 보기",
    reviewStart: "오늘 복습 시작",
    reviewDone: "오늘 복습 완료 🎉",
    openToday: "오늘 공부한 단어",
    openWords: "단어 목록 보기",
    back: "← 돌아가기",
    searchZh: "한자 · 병음 · 뜻 검색...",
    searchEn: "영어 단어 · 뜻 검색...",
    searchJa: "표기 · 읽기 · 뜻 검색...",
    reviewCount: (count: number) => `· 복습 ${count}회`,
    lapseCount: (count: number) => `· 틀림 ${count}회`,
    flip: "뒤집기",
    knew: "알았음",
    missed: "몰랐음",
    swipeHint: "← 스와이프 몰랐음 · 알았음 스와이프 →",
    tapMeaning: "탭해서 뜻 보기 →",
    tapBack: "탭해서 뒤집기 →",
    sessionDone: "세션 완료",
    doneSub: "오늘도 수고했어",
    accuracy: "정답률",
    done: "완료",
    dueNow: "지금",
    dueMinutes: (mins: number) => `${mins}분 후`,
    dueHours: (hrs: number) => `${hrs}시간 후`,
    dueDays: (days: number) => `${days}일 후`,
    levelDesc: {
      basic: "기초",
      beginner: "초급",
      lowIntermediate: "초중급",
      lowerIntermediate: "중하급",
      intermediate: "중급",
      upperIntermediate: "중고급",
      advanced: "고급",
    },
  },
  zh: {
    words: "单词本",
    todayStudy: "今日学习",
    todayChinese: "今日中文",
    todayEnglish: "今日英语",
    todayJapanese: "今日日语",
    loading: "加载中...",
    noDaily: "今天没有待学内容 ✓",
    ready: (count: number) => `已准备 ${count} 个`,
    levelStudy: "按级别学习",
    chineseLevel: "选择中文级别",
    englishLevel: "选择英语级别",
    japaneseLevel: "选择日语级别",
    hskRange: "HSK 1~6 级",
    enRange: "A1~C1 · 15,868 个",
    jaRange: "JLPT N5~N1 · 8,131 个",
    favorites: "收藏",
    chineseFavorites: "中文收藏",
    englishFavorites: "英语收藏",
    japaneseFavorites: "日语收藏",
    noFavorites: "暂无收藏",
    count: (count: number) => `${count} 个`,
    chinese: "中文",
    english: "英语",
    japanese: "日语",
    chooseLevel: "请选择级别",
    allWords: "全部单词",
    studiedToday: "今天学过的单词",
    reviewFavorites: "复习收藏卡片",
    browseList: "查看列表",
    reviewStart: "开始今日复习",
    reviewDone: "今日复习完成 🎉",
    openToday: "今天学过的单词",
    openWords: "查看单词列表",
    back: "← 返回",
    searchZh: "搜索汉字 · 拼音 · 含义...",
    searchEn: "搜索英文单词 · 中文含义...",
    searchJa: "搜索写法 · 读音 · 中文含义...",
    reviewCount: (count: number) => `· 复习 ${count} 次`,
    lapseCount: (count: number) => `· 错误 ${count} 次`,
    flip: "翻开",
    knew: "认识",
    missed: "不认识",
    swipeHint: "← 左滑不认识 · 右滑认识 →",
    tapMeaning: "点击查看含义 →",
    tapBack: "点击翻面 →",
    sessionDone: "学习完成",
    doneSub: "今天也完成了一轮学习",
    accuracy: "正确率",
    done: "完成",
    dueNow: "现在",
    dueMinutes: (mins: number) => `${mins} 分钟后`,
    dueHours: (hrs: number) => `${hrs} 小时后`,
    dueDays: (days: number) => `${days} 天后`,
    levelDesc: {
      basic: "基础",
      beginner: "初级",
      lowIntermediate: "初中级",
      lowerIntermediate: "中下级",
      intermediate: "中级",
      upperIntermediate: "中高级",
      advanced: "高级",
    },
  },
} as const;

const HSK_LEVEL_KEYS = ["beginner", "beginner", "lowIntermediate", "intermediate", "upperIntermediate", "advanced"] as const;
const EN_LEVEL_KEYS = ["basic", "beginner", "lowerIntermediate", "intermediate", "advanced"] as const;
const JA_LEVEL_KEYS = ["beginner", "lowIntermediate", "intermediate", "upperIntermediate", "advanced"] as const;

const HSK_LEVELS = [
  { value: 1, label: "HSK 1", locked: false, descKey: HSK_LEVEL_KEYS[0] },
  { value: 2, label: "HSK 2", locked: false, descKey: HSK_LEVEL_KEYS[1] },
  { value: 3, label: "HSK 3", locked: false, descKey: HSK_LEVEL_KEYS[2] },
  { value: 4, label: "HSK 4", locked: false, descKey: HSK_LEVEL_KEYS[3] },
  { value: 5, label: "HSK 5", locked: false, descKey: HSK_LEVEL_KEYS[4] },
  { value: 6, label: "HSK 6", locked: false, descKey: HSK_LEVEL_KEYS[5] },
];

const EN_LEVELS = [
  { value: "A1", label: "A1", descKey: EN_LEVEL_KEYS[0] },
  { value: "A2", label: "A2", descKey: EN_LEVEL_KEYS[1] },
  { value: "B1", label: "B1", descKey: EN_LEVEL_KEYS[2] },
  { value: "B2", label: "B2", descKey: EN_LEVEL_KEYS[3] },
  { value: "C1", label: "C1", descKey: EN_LEVEL_KEYS[4] },
];

const JA_LEVELS = [
  { value: "N5", label: "JLPT N5", descKey: JA_LEVEL_KEYS[0] },
  { value: "N4", label: "JLPT N4", descKey: JA_LEVEL_KEYS[1] },
  { value: "N3", label: "JLPT N3", descKey: JA_LEVEL_KEYS[2] },
  { value: "N2", label: "JLPT N2", descKey: JA_LEVEL_KEYS[3] },
  { value: "N1", label: "JLPT N1", descKey: JA_LEVEL_KEYS[4] },
];

function formatDue(due: string, uiLanguage: UiLanguage): string {
  const t = UI_TEXT[uiLanguage];
  const diff = new Date(due).getTime() - Date.now();
  const mins = Math.round(diff / 60000);
  if (mins <= 0) return t.dueNow;
  if (mins < 60) return t.dueMinutes(mins);
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return t.dueHours(hrs);
  return t.dueDays(Math.round(hrs / 24));
}

/* ══════════════════════════════════════════════════════════════
   메인 페이지
══════════════════════════════════════════════════════════════ */
export default function WordsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("lang-select");
  const [selectedLang, setSelectedLang] = useState<Lang>("zh");
  const [selectedZhLevel, setSelectedZhLevel] = useState<number>(3);
  const [selectedEnLevel, setSelectedEnLevel] = useState<string>("B1");
  const [selectedJaLevel, setSelectedJaLevel] = useState<string>("N5");
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("ko");
  const [stats, setStats] = useState({ total: 0, reviewed: 0, new: 0, due: 0, today: 0 });
  const [zhWords, setZhWords] = useState<Word[]>([]);
  const [enWords, setEnWords] = useState<EnglishWord[]>([]);
  const [jaWords, setJaWords] = useState<JapaneseWord[]>([]);
  const [dueZhWords, setDueZhWords] = useState<Word[]>([]);
  const [dueEnWords, setDueEnWords] = useState<EnglishWord[]>([]);
  const [dueJaWords, setDueJaWords] = useState<JapaneseWord[]>([]);
  const [todayZhWords, setTodayZhWords] = useState<Word[]>([]);
  const [todayEnWords, setTodayEnWords] = useState<EnglishWord[]>([]);
  const [todayJaWords, setTodayJaWords] = useState<JapaneseWord[]>([]);
  const [dailyZhWords, setDailyZhWords] = useState<Word[]>([]);
  const [dailyEnWords, setDailyEnWords] = useState<EnglishWord[]>([]);
  const [dailyJaWords, setDailyJaWords] = useState<JapaneseWord[]>([]);
  const [dailyZhCount, setDailyZhCount] = useState<number | null>(null);
  const [dailyEnCount, setDailyEnCount] = useState<number | null>(null);
  const [dailyJaCount, setDailyJaCount] = useState<number | null>(null);
  const [favZhWords, setFavZhWords] = useState<Word[]>([]);
  const [favEnWords, setFavEnWords] = useState<EnglishWord[]>([]);
  const [favJaWords, setFavJaWords] = useState<JapaneseWord[]>([]);
  const [favZhCount, setFavZhCount] = useState<number | null>(null);
  const [favEnCount, setFavEnCount] = useState<number | null>(null);
  const [favJaCount, setFavJaCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const translatedListKeys = useRef<Set<string>>(new Set());
  const t = UI_TEXT[uiLanguage];

  const reloadZh = useCallback(async (level: number) => {
    setLoading(true);
    const [s, w] = await Promise.all([api.words.stats(level), api.words.list(level)]);
    setStats(s);
    setZhWords(w);
    setLoading(false);
  }, []);

  const reloadEn = useCallback(async (level: string) => {
    setLoading(true);
    const [s, w] = await Promise.all([api.englishWords.stats(level), api.englishWords.list(level)]);
    setStats(s);
    setEnWords(w);
    setLoading(false);
  }, []);

  const reloadJa = useCallback(async (level: string) => {
    setLoading(true);
    const [s, w] = await Promise.all([api.japaneseWords.stats(level), api.japaneseWords.list(level)]);
    setStats(s);
    setJaWords(w);
    setLoading(false);
  }, []);

  // 첫 진입 시 오늘 할당량 + 즐겨찾기 개수 미리 조회
  useEffect(() => {
    api.words.daily().then((w) => setDailyZhCount(w.length)).catch(() => setDailyZhCount(0));
    api.englishWords.daily().then((w) => setDailyEnCount(w.length)).catch(() => setDailyEnCount(0));
    api.japaneseWords.daily().then((w) => setDailyJaCount(w.length)).catch(() => setDailyJaCount(0));
    api.words.favorites().then((w) => setFavZhCount(w.length)).catch(() => setFavZhCount(0));
    api.englishWords.favorites().then((w) => setFavEnCount(w.length)).catch(() => setFavEnCount(0));
    api.japaneseWords.favorites().then((w) => setFavJaCount(w.length)).catch(() => setFavJaCount(0));
    api.settings.get().then((s) => setUiLanguage(s.ui_language === "zh" ? "zh" : "ko")).catch(() => {});

    const handleSettingsUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ ui_language?: string }>).detail;
      setUiLanguage(detail?.ui_language === "zh" ? "zh" : "ko");
    };
    window.addEventListener("onetask-settings-updated", handleSettingsUpdate);
    return () => window.removeEventListener("onetask-settings-updated", handleSettingsUpdate);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hskLevel = Number(params.get("hsk"));
    if (hskLevel >= 1 && hskLevel <= 6) {
      setSelectedLang("zh");
      setSelectedZhLevel(hskLevel);
      setMode("home");
      reloadZh(hskLevel);
    }
  }, [reloadZh]);

  useEffect(() => {
    if (uiLanguage !== "zh" || mode !== "browse") return;

    if (selectedLang === "en") {
      const key = `en:${selectedEnLevel}`;
      if (translatedListKeys.current.has(key)) return;
      translatedListKeys.current.add(key);
      api.englishWords.translateMissingZh(selectedEnLevel, 2000)
        .then(() => api.englishWords.list(selectedEnLevel))
        .then(setEnWords)
        .catch(() => {});
    }

    if (selectedLang === "ja") {
      const key = `ja:${selectedJaLevel}`;
      if (translatedListKeys.current.has(key)) return;
      translatedListKeys.current.add(key);
      api.japaneseWords.translateMissingZh(selectedJaLevel, 2000)
        .then(() => api.japaneseWords.list(selectedJaLevel))
        .then(setJaWords)
        .catch(() => {});
    }
  }, [mode, selectedLang, selectedEnLevel, selectedJaLevel, uiLanguage]);

  const startFavZh = async () => {
    setLoading(true);
    const words = await api.words.favorites();
    setFavZhWords(words);
    setSelectedLang("zh");
    setLoading(false);
    setMode("favorites");
  };
  const startFavEn = async () => {
    setLoading(true);
    const words = await api.englishWords.favorites();
    setFavEnWords(words);
    setSelectedLang("en");
    setLoading(false);
    setMode("favorites");
  };
  const startFavJa = async () => {
    setLoading(true);
    const words = await api.japaneseWords.favorites();
    setFavJaWords(words);
    setSelectedLang("ja");
    setLoading(false);
    setMode("favorites");
  };

  const startDailyZh = async () => {
    setLoading(true);
    const words = await api.words.daily();
    setDailyZhWords(words);
    setSelectedLang("zh");
    setLoading(false);
    setMode("daily");
  };

  const startDailyEn = async () => {
    setLoading(true);
    const words = await api.englishWords.daily();
    setDailyEnWords(words);
    setSelectedLang("en");
    setLoading(false);
    setMode("daily");
  };

  const startDailyJa = async () => {
    setLoading(true);
    const words = await api.japaneseWords.daily();
    setDailyJaWords(words);
    setSelectedLang("ja");
    setLoading(false);
    setMode("daily");
  };

  const refreshFavoriteCounts = () => {
    api.words.favorites().then((w) => setFavZhCount(w.length)).catch(() => {});
    api.englishWords.favorites().then((w) => setFavEnCount(w.length)).catch(() => {});
    api.japaneseWords.favorites().then((w) => setFavJaCount(w.length)).catch(() => {});
  };

  const selectLang = (lang: Lang) => {
    setSelectedLang(lang);
    setMode("select");
  };

  const selectZhLevel = (level: number) => {
    setSelectedZhLevel(level);
    setMode("home");
    reloadZh(level);
  };

  const selectEnLevel = (level: string) => {
    setSelectedEnLevel(level);
    setMode("home");
    reloadEn(level);
  };

  const selectJaLevel = (level: string) => {
    setSelectedJaLevel(level);
    setMode("home");
    reloadJa(level);
  };

  const startReview = async () => {
    if (selectedLang === "zh") {
      const due = await api.words.due(selectedZhLevel);
      setDueZhWords(due);
    } else if (selectedLang === "ja") {
      const due = await api.japaneseWords.due(selectedJaLevel);
      setDueJaWords(due);
    } else {
      const due = await api.englishWords.due(selectedEnLevel);
      setDueEnWords(due);
    }
    setMode("review");
  };

  const openToday = async () => {
    if (selectedLang === "zh") {
      const words = await api.words.today(selectedZhLevel);
      setTodayZhWords(words);
    } else if (selectedLang === "ja") {
      const words = await api.japaneseWords.today(selectedJaLevel);
      setTodayJaWords(words);
    } else {
      const words = await api.englishWords.today(selectedEnLevel);
      setTodayEnWords(words);
    }
    setMode("today");
  };

  const onReviewDone = () => {
    if (selectedLang === "zh") reloadZh(selectedZhLevel);
    else if (selectedLang === "ja") reloadJa(selectedJaLevel);
    else reloadEn(selectedEnLevel);
    setMode("home");
  };

  /* ── 메인 화면 ── */
  if (mode === "lang-select") {
    return (
      <div className="flex flex-col min-h-dvh bg-dark-400">
        <div className="px-6 pt-10 pb-6 bg-dark-300 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="w-8 h-8 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-all">
              ←
            </button>
            <h1 className="text-2xl font-bold text-stone-100">{t.words}</h1>
          </div>
        </div>

        <div className="flex-1 px-4 py-6 flex flex-col gap-4">
          {/* 오늘의 학습 섹션 */}
          <p className="text-xs text-stone-600 font-medium px-1">{t.todayStudy}</p>

          <button onClick={startDailyZh} disabled={loading || dailyZhCount === 0}
            className="flex items-center gap-4 px-5 py-5 rounded-2xl border bg-dark-200 border-white/5 hover:border-jeok-700 hover:bg-dark-100 active:scale-[0.98] transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed">
            <div className="w-12 h-12 rounded-xl bg-jeok-900 flex items-center justify-center text-xl font-bold text-jeok-300" style={{ fontFamily: "'LXGW WenKai', serif" }}>
              中
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-stone-100">{t.todayChinese}</p>
              <p className="text-xs mt-0.5 text-stone-500">
                {dailyZhCount === null ? t.loading : dailyZhCount === 0 ? t.noDaily : t.ready(dailyZhCount)}
              </p>
            </div>
            {dailyZhCount !== null && dailyZhCount > 0 && (
              <span className="text-xs font-bold text-jeok-400 bg-jeok-900 px-2.5 py-1 rounded-full">{dailyZhCount}</span>
            )}
          </button>

          <button onClick={startDailyEn} disabled={loading || dailyEnCount === 0}
            className="flex items-center gap-4 px-5 py-5 rounded-2xl border bg-dark-200 border-white/5 hover:border-jeok-700 hover:bg-dark-100 active:scale-[0.98] transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed">
            <div className="w-12 h-12 rounded-xl bg-jeok-900 flex items-center justify-center text-xl font-bold text-jeok-300" style={{ fontFamily: "'Outfit', sans-serif" }}>
              En
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-stone-100">{t.todayEnglish}</p>
              <p className="text-xs mt-0.5 text-stone-500">
                {dailyEnCount === null ? t.loading : dailyEnCount === 0 ? t.noDaily : t.ready(dailyEnCount)}
              </p>
            </div>
            {dailyEnCount !== null && dailyEnCount > 0 && (
              <span className="text-xs font-bold text-jeok-400 bg-jeok-900 px-2.5 py-1 rounded-full">{dailyEnCount}</span>
            )}
          </button>

          <button onClick={startDailyJa} disabled={loading || dailyJaCount === 0}
            className="flex items-center gap-4 px-5 py-5 rounded-2xl border bg-dark-200 border-white/5 hover:border-jeok-700 hover:bg-dark-100 active:scale-[0.98] transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed">
            <div className="w-12 h-12 rounded-xl bg-jeok-900 flex items-center justify-center text-xl font-bold text-jeok-300">
              日
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-stone-100">{t.todayJapanese}</p>
              <p className="text-xs mt-0.5 text-stone-500">
                {dailyJaCount === null ? t.loading : dailyJaCount === 0 ? t.noDaily : t.ready(dailyJaCount)}
              </p>
            </div>
            {dailyJaCount !== null && dailyJaCount > 0 && (
              <span className="text-xs font-bold text-jeok-400 bg-jeok-900 px-2.5 py-1 rounded-full">{dailyJaCount}</span>
            )}
          </button>

          {/* 레벨별 공부 */}
          <p className="text-xs text-stone-600 font-medium px-1 mt-2">{t.levelStudy}</p>

          <button onClick={() => selectLang("zh")}
            className="flex items-center gap-4 px-5 py-4 rounded-2xl border bg-dark-200 border-white/5 hover:border-stone-700 hover:bg-dark-100 active:scale-[0.98] transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-lg font-bold text-stone-500" style={{ fontFamily: "'LXGW WenKai', serif" }}>
              中
            </div>
            <div className="flex-1">
              <p className="text-sm text-stone-300">{t.chineseLevel}</p>
              <p className="text-xs mt-0.5 text-stone-600">{t.hskRange}</p>
            </div>
            <span className="text-stone-700 text-sm">→</span>
          </button>

          <button onClick={() => selectLang("en")}
            className="flex items-center gap-4 px-5 py-4 rounded-2xl border bg-dark-200 border-white/5 hover:border-stone-700 hover:bg-dark-100 active:scale-[0.98] transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-lg font-bold text-stone-500" style={{ fontFamily: "'Outfit', sans-serif" }}>
              En
            </div>
            <div className="flex-1">
              <p className="text-sm text-stone-300">{t.englishLevel}</p>
              <p className="text-xs mt-0.5 text-stone-600">{t.enRange}</p>
            </div>
            <span className="text-stone-700 text-sm">→</span>
          </button>

          <button onClick={() => selectLang("ja")}
            className="flex items-center gap-4 px-5 py-4 rounded-2xl border bg-dark-200 border-white/5 hover:border-stone-700 hover:bg-dark-100 active:scale-[0.98] transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-lg font-bold text-stone-500">
              日
            </div>
            <div className="flex-1">
              <p className="text-sm text-stone-300">{t.japaneseLevel}</p>
              <p className="text-xs mt-0.5 text-stone-600">{t.jaRange}</p>
            </div>
            <span className="text-stone-700 text-sm">→</span>
          </button>

          {/* 즐겨찾기 */}
          <p className="text-xs text-stone-600 font-medium px-1 mt-2">{t.favorites}</p>

          {[
            { icon: "中", label: t.chineseFavorites, count: favZhCount, onClick: startFavZh, font: "'LXGW WenKai', serif" },
            { icon: "En", label: t.englishFavorites, count: favEnCount, onClick: startFavEn, font: "'Outfit', sans-serif" },
            { icon: "日", label: t.japaneseFavorites, count: favJaCount, onClick: startFavJa, font: "inherit" },
          ].map(({ icon, label, count, onClick, font }) => (
            <button key={label} onClick={onClick} disabled={loading || count === 0}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl border bg-dark-200 border-white/5 hover:border-yellow-800 hover:bg-dark-100 active:scale-[0.98] transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed">
              <div className="w-10 h-10 rounded-xl bg-yellow-900/30 flex items-center justify-center text-lg font-bold text-yellow-500/80" style={{ fontFamily: font }}>
                {icon}
              </div>
              <div className="flex-1">
                <p className="text-sm text-stone-300">{label}</p>
                <p className="text-xs mt-0.5 text-stone-600">
                  {count === null ? t.loading : count === 0 ? t.noFavorites : t.count(count)}
                </p>
              </div>
              {count !== null && count > 0 && (
                <span className="text-xs font-bold text-yellow-500 bg-yellow-900/30 px-2.5 py-1 rounded-full">★ {count}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── 레벨 선택 화면 ── */
  if (mode === "select") {
    if (selectedLang === "zh") {
      return (
        <div className="flex flex-col min-h-dvh bg-dark-400">
          <div className="px-6 pt-10 pb-6 bg-dark-300 border-b border-white/5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMode("lang-select")}
                className="w-8 h-8 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-all"
              >
                ←
              </button>
              <h1 className="text-2xl font-bold text-stone-100">{t.chinese}</h1>
            </div>
            <p className="text-stone-500 text-sm mt-3">{t.chooseLevel}</p>
          </div>
          <div className="flex-1 px-4 py-6 flex flex-col gap-3">
            {HSK_LEVELS.map(({ value, label, locked, descKey }) => (
              <button
                key={value}
                onClick={() => !locked && selectZhLevel(value)}
                disabled={locked}
                className={`flex items-center gap-4 px-5 py-5 rounded-2xl border transition-all text-left
                  ${locked
                    ? "bg-dark-300 border-white/5 opacity-40 cursor-not-allowed"
                    : "bg-dark-200 border-white/5 hover:border-jeok-700 hover:bg-dark-100 active:scale-[0.98]"
                  }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg
                  ${locked ? "bg-dark-200 text-stone-600" : "bg-jeok-900 text-jeok-400"}`}>
                  {value}
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-base ${locked ? "text-stone-600" : "text-stone-100"}`}>{label}</p>
                  <p className={`text-xs mt-0.5 ${locked ? "text-stone-700" : "text-stone-500"}`}>{t.levelDesc[descKey]}</p>
                </div>
                {locked
                  ? <span className="text-stone-700 text-lg">🔒</span>
                  : <span className="text-stone-600 text-sm">→</span>
                }
              </button>
            ))}
          </div>
        </div>
      );
    }

    /* 영어 레벨 선택 */
    if (selectedLang === "en") return (
      <div className="flex flex-col min-h-dvh bg-dark-400">
        <div className="px-6 pt-10 pb-6 bg-dark-300 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode("lang-select")}
              className="w-8 h-8 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-all"
            >
              ←
            </button>
            <h1 className="text-2xl font-bold text-stone-100">{t.english}</h1>
          </div>
          <p className="text-stone-500 text-sm mt-3">{t.chooseLevel}</p>
        </div>
        <div className="flex-1 px-4 py-6 flex flex-col gap-3">
          {EN_LEVELS.map(({ value, label, descKey }) => (
            <button
              key={value}
              onClick={() => selectEnLevel(value)}
              className="flex items-center gap-4 px-5 py-5 rounded-2xl border bg-dark-200 border-white/5 hover:border-jeok-700 hover:bg-dark-100 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-jeok-900 flex items-center justify-center font-bold text-base text-jeok-400" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {label}
              </div>
              <div className="flex-1">
                <p className="font-bold text-base text-stone-100">{label}</p>
                <p className="text-xs mt-0.5 text-stone-500">{t.levelDesc[descKey]}</p>
              </div>
              <span className="text-stone-600 text-sm">→</span>
            </button>
          ))}
        </div>
      </div>
    );

    /* 일본어 레벨 선택 */
    return (
      <div className="flex flex-col min-h-dvh bg-dark-400">
        <div className="px-6 pt-10 pb-6 bg-dark-300 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode("lang-select")}
              className="w-8 h-8 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-all"
            >
              ←
            </button>
            <h1 className="text-2xl font-bold text-stone-100">{t.japanese}</h1>
          </div>
          <p className="text-stone-500 text-sm mt-3">{t.chooseLevel}</p>
        </div>
        <div className="flex-1 px-4 py-6 flex flex-col gap-3">
          {JA_LEVELS.map(({ value, label, descKey }) => (
            <button
              key={value}
              onClick={() => selectJaLevel(value)}
              className="flex items-center gap-4 px-5 py-5 rounded-2xl border bg-dark-200 border-white/5 hover:border-jeok-700 hover:bg-dark-100 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-jeok-900 flex items-center justify-center font-bold text-base text-jeok-400">
                {value}
              </div>
              <div className="flex-1">
                <p className="font-bold text-base text-stone-100">{label}</p>
                <p className="text-xs mt-0.5 text-stone-500">{t.levelDesc[descKey]}</p>
              </div>
              <span className="text-stone-600 text-sm">→</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── 오늘의 학습 ── */
  if (mode === "daily") {
    if (selectedLang === "zh") {
      return <ZhReviewSession words={dailyZhWords} uiLanguage={uiLanguage} onDone={() => {
        api.words.daily().then((w) => setDailyZhCount(w.length)).catch(() => {});
        setMode("lang-select");
      }} onBack={() => setMode("lang-select")} onFavoriteChange={refreshFavoriteCounts} />;
    }
    if (selectedLang === "ja") {
      return <JaReviewSession words={dailyJaWords} uiLanguage={uiLanguage} onDone={() => {
        api.japaneseWords.daily().then((w) => setDailyJaCount(w.length)).catch(() => {});
        setMode("lang-select");
      }} onBack={() => setMode("lang-select")} />;
    }
    return <EnReviewSession words={dailyEnWords} uiLanguage={uiLanguage} onDone={() => {
      api.englishWords.daily().then((w) => setDailyEnCount(w.length)).catch(() => {});
      setMode("lang-select");
    }} onBack={() => setMode("lang-select")} />;
  }

  /* ── 복습/탐색 화면 위임 ── */
  if (mode === "review") {
    if (selectedLang === "zh") {
      return <ZhReviewSession words={dueZhWords} uiLanguage={uiLanguage} onDone={onReviewDone} onBack={() => setMode("home")} onFavoriteChange={refreshFavoriteCounts} />;
    }
    if (selectedLang === "ja") {
      return <JaReviewSession words={dueJaWords} uiLanguage={uiLanguage} onDone={onReviewDone} onBack={() => setMode("home")} />;
    }
    return <EnReviewSession words={dueEnWords} uiLanguage={uiLanguage} onDone={onReviewDone} onBack={() => setMode("home")} />;
  }
  if (mode === "browse") {
    if (selectedLang === "zh") {
      return <ZhBrowseMode words={zhWords} uiLanguage={uiLanguage} onBack={() => setMode("home")} />;
    }
    if (selectedLang === "ja") {
      return <JaBrowseMode words={jaWords} uiLanguage={uiLanguage} onBack={() => setMode("home")} />;
    }
    return <EnBrowseMode words={enWords} uiLanguage={uiLanguage} onBack={() => setMode("home")} />;
  }
  if (mode === "today") {
    if (selectedLang === "zh") {
      return <ZhBrowseMode words={todayZhWords} uiLanguage={uiLanguage} title={t.studiedToday} onBack={() => setMode("home")} />;
    }
    if (selectedLang === "ja") {
      return <JaBrowseMode words={todayJaWords} uiLanguage={uiLanguage} title={t.studiedToday} onBack={() => setMode("home")} />;
    }
    return <EnBrowseMode words={todayEnWords} uiLanguage={uiLanguage} title={t.studiedToday} onBack={() => setMode("home")} />;
  }
  if (mode === "fav-browse") {
    if (selectedLang === "zh") return <ZhBrowseMode words={favZhWords} uiLanguage={uiLanguage} title={`★ ${t.favorites}`} onBack={() => setMode("favorites")} />;
    if (selectedLang === "ja") return <JaBrowseMode words={favJaWords} uiLanguage={uiLanguage} title={`★ ${t.favorites}`} onBack={() => setMode("favorites")} />;
    return <EnBrowseMode words={favEnWords} uiLanguage={uiLanguage} title={`★ ${t.favorites}`} onBack={() => setMode("favorites")} />;
  }
  if (mode === "fav-review") {
    const onDone = () => setMode("favorites");
    if (selectedLang === "zh") return <ZhReviewSession words={favZhWords} uiLanguage={uiLanguage} onDone={onDone} onBack={onDone} onFavoriteChange={refreshFavoriteCounts} />;
    if (selectedLang === "ja") return <JaReviewSession words={favJaWords} uiLanguage={uiLanguage} onDone={onDone} onBack={onDone} />;
    return <EnReviewSession words={favEnWords} uiLanguage={uiLanguage} onDone={onDone} onBack={onDone} />;
  }
  if (mode === "favorites") {
    const favWords = selectedLang === "zh" ? favZhWords : selectedLang === "ja" ? favJaWords : favEnWords;
    const langLabel = selectedLang === "zh" ? t.chinese : selectedLang === "ja" ? t.japanese : t.english;
    const onBack = () => {
      api.words.favorites().then((w) => setFavZhCount(w.length)).catch(() => {});
      api.englishWords.favorites().then((w) => setFavEnCount(w.length)).catch(() => {});
      api.japaneseWords.favorites().then((w) => setFavJaCount(w.length)).catch(() => {});
      setMode("lang-select");
    };
    return (
      <div className="flex flex-col min-h-dvh bg-dark-400">
        <div className="px-6 pt-10 pb-5 bg-dark-300 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="w-8 h-8 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-all">
              ←
            </button>
            <div>
              <h1 className="text-xl font-bold text-yellow-400">★ {t.favorites}</h1>
              <p className="text-xs text-stone-600 mt-0.5">{langLabel} · {t.count(favWords.length)}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 px-4 py-5 flex flex-col gap-3">
          <button onClick={() => setMode("fav-review")} disabled={favWords.length === 0}
            className="w-full py-6 rounded-2xl font-bold text-lg transition-all duration-200 shadow-lg
              bg-yellow-700 hover:bg-yellow-600 text-white shadow-yellow-900/40
              disabled:bg-dark-200 disabled:text-stone-600 disabled:shadow-none disabled:border disabled:border-white/5">
            {t.reviewFavorites}
          </button>
          <button onClick={() => setMode("fav-browse")}
            className="w-full py-4 bg-dark-200 hover:bg-dark-100 border border-white/5 text-stone-400 hover:text-stone-200 rounded-2xl font-medium text-sm transition-all">
            {t.browseList}
          </button>
        </div>
      </div>
    );
  }

  /* ── 레벨 홈 화면 ── */
  const levelLabel = selectedLang === "zh"
    ? `HSK ${selectedZhLevel}`
    : selectedLang === "ja"
    ? `JLPT ${selectedJaLevel}`
    : selectedEnLevel;
  const levelDesc = selectedLang === "zh"
    ? HSK_LEVELS.find(l => l.value === selectedZhLevel)?.descKey
    : selectedLang === "ja"
    ? JA_LEVELS.find(l => l.value === selectedJaLevel)?.descKey
    : EN_LEVELS.find(l => l.value === selectedEnLevel)?.descKey;

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      <div className="px-6 pt-10 pb-6 bg-dark-300 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMode("select")}
            className="w-8 h-8 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-all"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-stone-100">{levelLabel}</h1>
        </div>
        <p className="text-stone-500 text-xs mt-3">{levelDesc ? t.levelDesc[levelDesc] : ""}</p>
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-3">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-stone-600 text-sm">{t.loading}</div>
        ) : (
          <>
            <button
              onClick={startReview}
              disabled={stats.due === 0}
              className="w-full py-6 rounded-2xl font-bold text-lg transition-all duration-200 shadow-lg
                bg-jeok-600 hover:bg-jeok-500 text-white shadow-jeok-900/40
                disabled:bg-dark-200 disabled:text-stone-600 disabled:shadow-none disabled:border disabled:border-white/5"
            >
              {stats.due > 0 ? t.reviewStart : t.reviewDone}
            </button>

            {stats.today > 0 && (
              <button
                onClick={openToday}
                className="w-full py-4 bg-dark-200 hover:bg-dark-100 border border-jeok-900 hover:border-jeok-700 rounded-2xl transition-all flex items-center justify-between px-5"
              >
                <span className="text-stone-300 font-medium text-sm">{t.openToday}</span>
                <span className="text-jeok-400 font-bold text-sm">{t.count(stats.today)} →</span>
              </button>
            )}

            <button
              onClick={() => setMode("browse")}
              className="w-full py-4 bg-dark-200 hover:bg-dark-100 border border-white/5 text-stone-400 hover:text-stone-200 rounded-2xl font-medium text-sm transition-all"
            >
              {t.openWords}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   중국어 컴포넌트
══════════════════════════════════════════════════════════════ */

let _audio: HTMLAudioElement | null = null;
function stopAll() {
  if (_audio) { _audio.pause(); _audio = null; }
  window.speechSynthesis.cancel();
}
function playAudio(chinese: string) {
  stopAll();
  const url = `https://raw.githubusercontent.com/hugolpz/audio-cmn/master/96k/hsk/cmn-${chinese}.mp3`;
  _audio = new Audio(url);
  _audio.play().catch(() => {});
}
function speakSentence(text: string) {
  stopAll();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "zh-CN";
  utter.rate = 0.85;
  window.speechSynthesis.speak(utter);
}

function HighlightedSentence({ sentence, word }: { sentence: string; word: string }) {
  const parts = sentence.split(word);
  if (parts.length === 1) return <span>{sentence}</span>;
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="text-jeok-300 font-bold border-b-2 border-jeok-500">{word}</span>
          )}
        </span>
      ))}
    </>
  );
}

const SWIPE_THRESHOLD = 100;

function ZhSwipeCard({ word, flipped, onFlip, onSwipe, uiLanguage, onFavoriteChange }: {
  word: Word; flipped: boolean; onFlip: () => void; onSwipe: (knew: boolean) => void; uiLanguage: UiLanguage; onFavoriteChange?: (id: number, isFavorite: boolean) => void;
}) {
  const BASE_URL = "";  // Use relative path: /images/...
  const firstRender = useRef(true);
  const [isFavorite, setIsFavorite] = useState(word.is_favorite);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const t = UI_TEXT[uiLanguage];

  useEffect(() => {
    setIsFavorite(word.is_favorite);
    setFavoriteBusy(false);
  }, [word.id, word.is_favorite]);

  useEffect(() => { playAudio(word.chinese); return () => stopAll(); }, []);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (flipped && word.example_zh) speakSentence(word.example_zh);
    else playAudio(word.chinese);
  }, [flipped]);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-18, 18]);
  const rightOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const leftOpacity  = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      animate(x, 600, { duration: 0.25 });
      setTimeout(() => onSwipe(true), 200);
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      animate(x, -600, { duration: 0.25 });
      setTimeout(() => onSwipe(false), 200);
    } else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  };

  const toggleFavorite = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (favoriteBusy) return;

    setFavoriteBusy(true);
    try {
      const result = await api.words.favorite(word.id);
      setIsFavorite(result.is_favorite);
      onFavoriteChange?.(word.id, result.is_favorite);
    } finally {
      setFavoriteBusy(false);
    }
  };

  return (
    <div className="relative w-full aspect-square select-none">
      <motion.div style={{ opacity: rightOpacity }}
        className="absolute inset-0 rounded-3xl border-2 border-green-500 bg-green-950/30 flex items-center justify-center z-0 pointer-events-none">
        <span className="text-green-400 text-3xl font-black tracking-widest rotate-[-12deg] border-4 border-green-500 px-4 py-1 rounded-xl">{t.knew}</span>
      </motion.div>
      <motion.div style={{ opacity: leftOpacity }}
        className="absolute inset-0 rounded-3xl border-2 border-jeok-500 bg-jeok-950/30 flex items-center justify-center z-0 pointer-events-none">
        <span className="text-jeok-400 text-3xl font-black tracking-widest rotate-[12deg] border-4 border-jeok-500 px-4 py-1 rounded-xl">{t.missed}</span>
      </motion.div>
      <motion.div drag="x" dragElastic={0.8} style={{ x, rotate, position: "relative", zIndex: 10 }}
        onDragEnd={handleDragEnd} onClick={onFlip}
        className="h-full cursor-grab active:cursor-grabbing" whileTap={{ scale: 0.98 }}>
        <div className="h-full" style={{ perspective: "1200px" }}>
          <div className="relative h-full w-full transition-transform duration-[380ms]"
            style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
            {/* 앞면 */}
            <div className="absolute inset-0 bg-dark-200 border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 p-8 overflow-hidden"
              style={{ backfaceVisibility: "hidden" }}>
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={favoriteBusy}
                aria-label={isFavorite ? t.favorites : t.favorites}
                aria-pressed={isFavorite}
                className="absolute top-3 left-4 z-30 w-9 h-9 rounded-full bg-black/45 border border-white/10 flex items-center justify-center transition-all hover:bg-black/65 active:scale-95 disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill={isFavorite ? "#facc15" : "none"} stroke={isFavorite ? "#facc15" : "#d6d3d1"} strokeWidth="1.4">
                  <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 5.7l4-.6z"/>
                </svg>
              </button>
              {word.hsk_level && (
                <span className="absolute top-3 right-4 text-xs text-stone-300 font-semibold z-20 bg-black/50 px-2 py-0.5 rounded-full">HSK {word.hsk_level}</span>
              )}
              {word.image_path && (
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  <img src={`${BASE_URL}/images/${word.image_path.replace("test_output/", "")}`} alt=""
                    className="w-full h-full object-contain opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-200 via-dark-200/40 to-transparent" />
                </div>
              )}
              <div className="relative z-10 flex flex-col items-center gap-4">
                <p className="text-7xl font-bold text-stone-100 tracking-wider"
                  style={{ fontFamily: "'LXGW WenKai', serif", WebkitTextStroke: "1px black", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>{word.chinese}</p>
                <CopyButton text={word.chinese} />
                {word.example_zh && (
                  <div className="bg-black/40 rounded-xl px-4 py-2">
                    <p className="text-sm text-stone-200 leading-relaxed text-center" style={{ fontFamily: "'LXGW WenKai', serif" }}>{word.example_zh}</p>
                  </div>
                )}
                <p className="text-xs text-stone-700 mt-2">{t.tapBack}</p>
              </div>
            </div>
            {/* 뒷면 */}
            <div className="absolute inset-0 bg-dark-300 border border-jeok-900 rounded-3xl flex flex-col items-center justify-center gap-3 p-8 overflow-hidden"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={favoriteBusy}
                aria-label={isFavorite ? t.favorites : t.favorites}
                aria-pressed={isFavorite}
                className="absolute top-3 left-4 z-30 w-9 h-9 rounded-full bg-black/45 border border-white/10 flex items-center justify-center transition-all hover:bg-black/65 active:scale-95 disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill={isFavorite ? "#facc15" : "none"} stroke={isFavorite ? "#facc15" : "#d6d3d1"} strokeWidth="1.4">
                  <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 5.7l4-.6z"/>
                </svg>
              </button>
              {word.image_path && (
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  <img src={`${BASE_URL}/images/${word.image_path.replace("test_output/", "")}`} alt=""
                    className="w-full h-full object-contain opacity-20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-300 via-dark-300/70 to-transparent" />
                </div>
              )}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <p className="text-4xl font-bold text-stone-100 text-center">{word.meaning}</p>
                {word.example_zh && (
                  <div className="bg-black/30 rounded-xl px-4 py-2 mt-2">
                    <p className="text-sm text-stone-200 leading-relaxed text-center" style={{ fontFamily: "'LXGW WenKai', serif" }}>
                      <HighlightedSentence sentence={word.example_zh} word={word.chinese} />
                    </p>
                  </div>
                )}
                {word.example_pinyin && (
                  <div className="bg-black/30 rounded-xl px-4 py-1.5">
                    <p className="text-xs text-stone-400 text-center leading-relaxed" style={{ fontFamily: "'Outfit', sans-serif" }}>{word.example_pinyin}</p>
                  </div>
                )}
                <div className="bg-black/30 rounded-xl px-4 py-1.5">
                  <p className="text-sm text-jeok-300 tracking-widest" style={{ fontFamily: "'Outfit', sans-serif" }}>{word.pinyin}</p>
                </div>
                {word.example_ko && (
                  <p className="text-xs text-stone-600 text-center mt-1">{word.example_ko}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ZhReviewSession({ words, uiLanguage, onDone, onBack, onFavoriteChange }: { words: Word[]; uiLanguage: UiLanguage; onDone: () => void; onBack: () => void; onFavoriteChange?: (id: number, isFavorite: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [results, setResults] = useState({ knew: 0, missed: 0 });
  const [done, setDone] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  const current = words[index];

  const reveal = () => { setFlipped((f) => !f); if (phase === "question") setPhase("answer"); };
  const answer = async (knew: boolean) => {
    if (busy) return;
    setBusy(true);
    await api.words.review(current.id, knew);
    setResults((r) => ({ knew: r.knew + (knew ? 1 : 0), missed: r.missed + (knew ? 0 : 1) }));
    const next = index + 1;
    if (next >= words.length) { setDone(true); setBusy(false); return; }
    setTimeout(() => { setIndex(next); setPhase("question"); setFlipped(false); setCardKey((k) => k + 1); setBusy(false); }, 280);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (phase === "question" && e.key === " ") { e.preventDefault(); reveal(); }
      if (!busy) {
        if (e.key === "ArrowRight" || e.key === "o") answer(true);
        if (e.key === "ArrowLeft"  || e.key === "x") answer(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase, index, busy]);

  if (done) return <ReviewDoneScreen results={results} uiLanguage={uiLanguage} onDone={onDone} />;
  return (
    <ReviewLayout index={index} total={words.length} uiLanguage={uiLanguage} onBack={onBack} phase={phase} onReveal={reveal} onAnswer={answer} busy={busy}>
      <ZhSwipeCard key={cardKey} word={current} flipped={flipped} onFlip={reveal} onSwipe={answer} uiLanguage={uiLanguage} onFavoriteChange={onFavoriteChange} />
    </ReviewLayout>
  );
}

function StarButton({ isFav, onToggle }: { isFav: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex-shrink-0 transition-colors ml-auto">
      <svg width="16" height="16" viewBox="0 0 16 16" fill={isFav ? "#e2a444" : "none"} stroke={isFav ? "#e2a444" : "#57534e"} strokeWidth="1.3">
        <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 5.7l4-.6z"/>
      </svg>
    </button>
  );
}

function ZhBrowseMode({ words, uiLanguage, onBack, title }: { words: Word[]; uiLanguage: UiLanguage; onBack: () => void; title?: string }) {
  const [query, setQuery] = useState("");
  const t = UI_TEXT[uiLanguage];
  const [favs, setFavs] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(words.map((w) => [w.id, w.is_favorite]))
  );

  const toggleFav = async (id: number) => {
    const result = await api.words.favorite(id);
    setFavs((f) => ({ ...f, [id]: result.is_favorite }));
  };

  const filtered = query
    ? words.filter((w) =>
        w.chinese.includes(query) ||
        w.pinyin.toLowerCase().includes(query.toLowerCase()) ||
        w.meaning.includes(query))
    : words;
  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      <div className="px-6 pt-14 pb-4 bg-dark-300 border-b border-white/5">
        <button onClick={onBack} className="text-stone-600 text-xs mb-3 flex items-center gap-1 hover:text-stone-400 transition-colors">{t.back}</button>
        <h2 className="text-xl font-bold text-stone-100 mb-3">{title ?? t.allWords} <span className="text-stone-500 font-normal text-sm">{t.count(filtered.length)}</span></h2>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchZh}
          className="w-full bg-dark-200 border border-stone-700 focus:border-jeok-600 rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none transition-colors" />
      </div>
      <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {filtered.map((w) => (
          <div key={w.id} className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-bold text-stone-100">{w.chinese}</span>
              <span className="text-sm text-stone-500 font-light">{w.pinyin}</span>
              <StarButton isFav={!!favs[w.id]} onToggle={() => toggleFav(w.id)} />
            </div>
            <p className="text-sm text-stone-300 font-medium mt-0.5 leading-snug">{w.meaning}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-medium ${STATE_COLOR[w.state]}`}>{STATE_LABEL[uiLanguage][w.state]}</span>
              {w.reps > 0 && <span className="text-xs text-stone-700">{t.reviewCount(w.reps)}</span>}
              {w.lapses > 0 && <span className="text-xs text-jeok-700">{t.lapseCount(w.lapses)}</span>}
              <span className="text-xs text-stone-700 ml-auto">{formatDue(w.due, uiLanguage)}</span>
            </div>
            {w.example_zh && (
              <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                <p className="text-xs text-stone-500 leading-relaxed">{w.example_zh}</p>
                {w.example_ko && <p className="text-xs text-stone-700 leading-relaxed">{w.example_ko}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   영어 컴포넌트
══════════════════════════════════════════════════════════════ */

function speakEnglish(word: string) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = "en-US";
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

function EnSwipeCard({ word, flipped, onFlip, onSwipe, uiLanguage }: {
  word: EnglishWord; flipped: boolean; onFlip: () => void; onSwipe: (knew: boolean) => void; uiLanguage: UiLanguage;
}) {
  const firstRender = useRef(true);
  const [meaningZh, setMeaningZh] = useState(word.meaning_zh);
  const [exampleZh, setExampleZh] = useState(word.example_zh);
  const t = UI_TEXT[uiLanguage];

  useEffect(() => {
    setMeaningZh(word.meaning_zh);
    setExampleZh(word.example_zh);
  }, [word.id, word.meaning_zh, word.example_zh]);

  useEffect(() => {
    speakEnglish(word.word);
    return () => window.speechSynthesis.cancel();
  }, []);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (flipped && word.example_en) speakEnglish(word.example_en);
    else speakEnglish(word.word);
  }, [flipped]);

  useEffect(() => {
    if (!flipped || uiLanguage !== "zh" || meaningZh) return;
    api.englishWords.translateZh(word.id)
      .then((result) => {
        setMeaningZh(result.meaning_zh);
        setExampleZh(result.example_zh);
      })
      .catch(() => {});
  }, [flipped, uiLanguage, meaningZh, word.id]);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-18, 18]);
  const rightOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const leftOpacity  = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      animate(x, 600, { duration: 0.25 });
      setTimeout(() => onSwipe(true), 200);
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      animate(x, -600, { duration: 0.25 });
      setTimeout(() => onSwipe(false), 200);
    } else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  };

  return (
    <div className="relative w-full select-none" style={{ minHeight: "300px" }}>
      <motion.div style={{ opacity: rightOpacity }}
        className="absolute inset-0 rounded-3xl border-2 border-green-500 bg-green-950/30 flex items-center justify-center z-0 pointer-events-none">
        <span className="text-green-400 text-3xl font-black tracking-widest rotate-[-12deg] border-4 border-green-500 px-4 py-1 rounded-xl">{t.knew}</span>
      </motion.div>
      <motion.div style={{ opacity: leftOpacity }}
        className="absolute inset-0 rounded-3xl border-2 border-jeok-500 bg-jeok-950/30 flex items-center justify-center z-0 pointer-events-none">
        <span className="text-jeok-400 text-3xl font-black tracking-widest rotate-[12deg] border-4 border-jeok-500 px-4 py-1 rounded-xl">{t.missed}</span>
      </motion.div>
      <motion.div drag="x" dragElastic={0.8} style={{ x, rotate, position: "relative", zIndex: 10 }}
        onDragEnd={handleDragEnd} onClick={onFlip}
        className="cursor-grab active:cursor-grabbing" whileTap={{ scale: 0.98 }}>
        <div style={{ perspective: "1200px" }}>
          <div className="relative w-full transition-transform duration-[380ms]"
            style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", minHeight: "300px" }}>
            {/* 앞면: 영어 단어 */}
            <div className="absolute inset-0 bg-dark-200 border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 p-8"
              style={{ backfaceVisibility: "hidden" }}>
              {word.level && (
                <span className="absolute top-3 right-4 text-xs text-stone-300 font-semibold z-20 bg-black/50 px-2 py-0.5 rounded-full">{word.level}</span>
              )}
              <p className="text-5xl font-bold text-stone-100 text-center tracking-wide"
                style={{ fontFamily: "'Outfit', sans-serif" }}>{word.word}</p>
              <CopyButton text={word.word} />
              <p className="text-xs text-stone-700 mt-2">{t.tapMeaning}</p>
            </div>
            {/* 뒷면: 한국어 뜻 */}
            <div className="absolute inset-0 bg-dark-300 border border-jeok-900 rounded-3xl flex flex-col items-center justify-center gap-3 p-8"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <p className="text-2xl font-bold text-stone-100 text-center leading-relaxed">{uiLanguage === "zh" ? (meaningZh || word.meaning) : word.meaning}</p>
              <p className="text-stone-500 text-sm font-light" style={{ fontFamily: "'Outfit', sans-serif" }}>{word.word}</p>
              {word.example_en && (
                <div className="bg-black/30 rounded-xl px-4 py-2.5 mt-1 w-full">
                  <p className="text-sm text-stone-200 leading-relaxed text-center italic" style={{ fontFamily: "'Outfit', sans-serif" }}>{word.example_en}</p>
                  {(uiLanguage === "zh" ? (exampleZh || word.example_ko) : word.example_ko) && (
                    <p className="text-xs text-stone-500 text-center mt-1.5 leading-relaxed">{uiLanguage === "zh" ? (exampleZh || word.example_ko) : word.example_ko}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function EnReviewSession({ words, uiLanguage, onDone, onBack }: { words: EnglishWord[]; uiLanguage: UiLanguage; onDone: () => void; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [results, setResults] = useState({ knew: 0, missed: 0 });
  const [done, setDone] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  const current = words[index];

  const reveal = () => { setFlipped((f) => !f); if (phase === "question") setPhase("answer"); };
  const answer = async (knew: boolean) => {
    if (busy) return;
    setBusy(true);
    await api.englishWords.review(current.id, knew);
    setResults((r) => ({ knew: r.knew + (knew ? 1 : 0), missed: r.missed + (knew ? 0 : 1) }));
    const next = index + 1;
    if (next >= words.length) { setDone(true); setBusy(false); return; }
    setTimeout(() => { setIndex(next); setPhase("question"); setFlipped(false); setCardKey((k) => k + 1); setBusy(false); }, 280);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (phase === "question" && e.key === " ") { e.preventDefault(); reveal(); }
      if (!busy) {
        if (e.key === "ArrowRight" || e.key === "o") answer(true);
        if (e.key === "ArrowLeft"  || e.key === "x") answer(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase, index, busy]);

  if (done) return <ReviewDoneScreen results={results} uiLanguage={uiLanguage} onDone={onDone} />;
  return (
    <ReviewLayout index={index} total={words.length} uiLanguage={uiLanguage} onBack={onBack} phase={phase} onReveal={reveal} onAnswer={answer} busy={busy}>
      <EnSwipeCard key={cardKey} word={current} flipped={flipped} onFlip={reveal} onSwipe={answer} uiLanguage={uiLanguage} />
    </ReviewLayout>
  );
}

function EnBrowseMode({ words, uiLanguage, onBack, title }: { words: EnglishWord[]; uiLanguage: UiLanguage; onBack: () => void; title?: string }) {
  const [query, setQuery] = useState("");
  const t = UI_TEXT[uiLanguage];
  const [favs, setFavs] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(words.map((w) => [w.id, w.is_favorite]))
  );

  const toggleFav = async (id: number) => {
    const result = await api.englishWords.favorite(id);
    setFavs((f) => ({ ...f, [id]: result.is_favorite }));
  };

  const filtered = query
    ? words.filter((w) =>
        w.word.toLowerCase().includes(query.toLowerCase()) ||
        w.meaning.includes(query) ||
        (w.meaning_zh?.includes(query) ?? false) ||
        (w.example_zh?.includes(query) ?? false))
    : words;
  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      <div className="px-6 pt-14 pb-4 bg-dark-300 border-b border-white/5">
        <button onClick={onBack} className="text-stone-600 text-xs mb-3 flex items-center gap-1 hover:text-stone-400 transition-colors">{t.back}</button>
        <h2 className="text-xl font-bold text-stone-100 mb-3">{title ?? t.allWords} <span className="text-stone-500 font-normal text-sm">{t.count(filtered.length)}</span></h2>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchEn}
          className="w-full bg-dark-200 border border-stone-700 focus:border-jeok-600 rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none transition-colors" />
      </div>
      <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {filtered.map((w) => (
          <div key={w.id} className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold text-stone-100" style={{ fontFamily: "'Outfit', sans-serif" }}>{w.word}</span>
              {w.level && <span className="text-xs text-jeok-600 border border-jeok-900 rounded px-1.5 py-0.5">{w.level}</span>}
              <StarButton isFav={!!favs[w.id]} onToggle={() => toggleFav(w.id)} />
            </div>
            <p className="text-sm text-stone-300 font-medium mt-1 leading-snug">{uiLanguage === "zh" ? (w.meaning_zh || w.meaning) : w.meaning}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-medium ${STATE_COLOR[w.state]}`}>{STATE_LABEL[uiLanguage][w.state]}</span>
              {w.reps > 0 && <span className="text-xs text-stone-700">{t.reviewCount(w.reps)}</span>}
              {w.lapses > 0 && <span className="text-xs text-jeok-700">{t.lapseCount(w.lapses)}</span>}
              <span className="text-xs text-stone-700 ml-auto">{formatDue(w.due, uiLanguage)}</span>
            </div>
            {w.example_en && (
              <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-1">
                <p className="text-xs text-stone-400 italic leading-relaxed">{w.example_en}</p>
                {(uiLanguage === "zh" ? (w.example_zh || w.example_ko) : w.example_ko) && <p className="text-xs text-stone-600 leading-relaxed">{uiLanguage === "zh" ? (w.example_zh || w.example_ko) : w.example_ko}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function JaBrowseMode({ words, uiLanguage, onBack, title }: { words: JapaneseWord[]; uiLanguage: UiLanguage; onBack: () => void; title?: string }) {
  const [query, setQuery] = useState("");
  const t = UI_TEXT[uiLanguage];
  const [favs, setFavs] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(words.map((w) => [w.id, w.is_favorite]))
  );

  const toggleFav = async (id: number) => {
    const result = await api.japaneseWords.favorite(id);
    setFavs((f) => ({ ...f, [id]: result.is_favorite }));
  };

  const filtered = query
    ? words.filter((w) =>
        w.expression.includes(query) ||
        w.reading.includes(query) ||
        w.meaning.includes(query) ||
        (w.meaning_zh?.includes(query) ?? false) ||
        (w.example_zh?.includes(query) ?? false))
    : words;

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      <div className="px-6 pt-14 pb-4 bg-dark-300 border-b border-white/5">
        <button onClick={onBack} className="text-stone-600 text-xs mb-3 flex items-center gap-1 hover:text-stone-400 transition-colors">{t.back}</button>
        <h2 className="text-xl font-bold text-stone-100 mb-3">{title ?? t.allWords} <span className="text-stone-500 font-normal text-sm">{t.count(filtered.length)}</span></h2>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchJa}
          className="w-full bg-dark-200 border border-stone-700 focus:border-jeok-600 rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none transition-colors" />
      </div>
      <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {filtered.map((w) => (
          <div key={w.id} className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-bold text-stone-100">{w.expression}</span>
              {w.expression !== w.reading && (
                <span className="text-sm text-stone-500 font-light">{w.reading}</span>
              )}
              {w.jlpt_level && (
                <span className="text-xs text-jeok-600 border border-jeok-900 rounded px-1.5 py-0.5">{w.jlpt_level}</span>
              )}
              <StarButton isFav={!!favs[w.id]} onToggle={() => toggleFav(w.id)} />
            </div>
            <p className="text-sm text-stone-300 font-medium mt-1 leading-snug">{uiLanguage === "zh" ? (w.meaning_zh || w.meaning) : w.meaning}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-medium ${STATE_COLOR[w.state]}`}>{STATE_LABEL[uiLanguage][w.state]}</span>
              {w.reps > 0 && <span className="text-xs text-stone-700">{t.reviewCount(w.reps)}</span>}
              {w.lapses > 0 && <span className="text-xs text-jeok-700">{t.lapseCount(w.lapses)}</span>}
              <span className="text-xs text-stone-700 ml-auto">{formatDue(w.due, uiLanguage)}</span>
            </div>
            {w.example_jp && (
              <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-1">
                <p className="text-xs text-stone-400 leading-relaxed">{w.example_jp}</p>
                {(uiLanguage === "zh" ? (w.example_zh || w.example_ko) : w.example_ko) && <p className="text-xs text-stone-600 leading-relaxed">{uiLanguage === "zh" ? (w.example_zh || w.example_ko) : w.example_ko}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   공용 컴포넌트
══════════════════════════════════════════════════════════════ */

function ReviewLayout({ index, total, uiLanguage, onBack, phase, onReveal, onAnswer, busy, children }: {
  index: number; total: number; uiLanguage: UiLanguage; onBack: () => void; phase: Phase;
  onReveal: () => void; onAnswer: (knew: boolean) => void; busy: boolean;
  children: React.ReactNode;
}) {
  const t = UI_TEXT[uiLanguage];
  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button onClick={onBack} className="text-stone-600 hover:text-stone-400 transition-colors text-lg">✕</button>
        <div className="flex-1 h-1.5 bg-dark-200 rounded-full overflow-hidden">
          <div className="h-full bg-jeok-500 rounded-full transition-all duration-500"
            style={{ width: `${(index / total) * 100}%` }} />
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-5">
        <div className="w-full max-w-[420px] sm:max-w-[440px] lg:max-w-[460px]">
          {children}
        </div>
        {phase === "question" ? (
          <button onClick={onReveal}
            className="w-full max-w-[420px] sm:max-w-[440px] lg:max-w-[460px] py-4 bg-dark-200 border border-white/5 hover:border-stone-700 text-stone-400 hover:text-stone-200 rounded-2xl font-semibold transition-all">
            {t.flip}
          </button>
        ) : (
          <div className="w-full max-w-[420px] sm:max-w-[440px] lg:max-w-[460px] grid grid-cols-2 gap-3">
            <button onClick={() => !busy && onAnswer(false)}
              className="py-4 bg-dark-200 border border-jeok-800 hover:bg-jeok-950 text-jeok-400 rounded-2xl font-bold transition-all active:scale-95">
              ✕ {t.missed}
            </button>
            <button onClick={() => !busy && onAnswer(true)}
              className="py-4 bg-dark-200 border border-green-900 hover:bg-green-950 text-green-400 rounded-2xl font-bold transition-all active:scale-95">
              ○ {t.knew}
            </button>
          </div>
        )}
        <p className="text-xs text-stone-700">{t.swipeHint}</p>
      </div>
    </div>
  );
}

function ReviewDoneScreen({ results, uiLanguage, onDone }: { results: { knew: number; missed: number }; uiLanguage: UiLanguage; onDone: () => void }) {
  const total = results.knew + results.missed;
  const pct = total > 0 ? Math.round((results.knew / total) * 100) : 0;
  const t = UI_TEXT[uiLanguage];
  return (
    <div className="flex flex-col min-h-dvh bg-dark-400 items-center justify-center px-6 gap-6">
      <p className="text-5xl">{pct >= 70 ? "🎉" : "💪"}</p>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-100">{t.sessionDone}</h2>
        <p className="text-stone-500 text-sm mt-1">{t.doneSub}</p>
      </div>
      <div className="w-full bg-dark-200 border border-white/5 rounded-3xl p-6 space-y-3">
        <StatRow label={t.knew} value={t.count(results.knew)} color="text-green-400" />
        <StatRow label={t.missed} value={t.count(results.missed)} color="text-jeok-400" />
        <div className="border-t border-white/5 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-stone-500 text-sm">{t.accuracy}</span>
            <span className="text-2xl font-bold text-stone-100">{pct}%</span>
          </div>
        </div>
      </div>
      <button onClick={onDone} className="w-full py-4 bg-jeok-600 hover:bg-jeok-500 text-white rounded-2xl font-bold transition-colors">
        {t.done}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   일본어 컴포넌트
══════════════════════════════════════════════════════════════ */

const SWIPE_THRESHOLD_JA = 80;

function speakJapanese(text: string) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ja-JP";
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

function JaSwipeCard({ word, flipped, onFlip, onSwipe, uiLanguage }: {
  word: JapaneseWord; flipped: boolean; onFlip: () => void; onSwipe: (knew: boolean) => void; uiLanguage: UiLanguage;
}) {
  const firstRender = useRef(true);
  const [meaningZh, setMeaningZh] = useState(word.meaning_zh);
  const [exampleZh, setExampleZh] = useState(word.example_zh);
  const t = UI_TEXT[uiLanguage];

  useEffect(() => {
    setMeaningZh(word.meaning_zh);
    setExampleZh(word.example_zh);
  }, [word.id, word.meaning_zh, word.example_zh]);

  useEffect(() => {
    speakJapanese(word.reading);
    return () => window.speechSynthesis.cancel();
  }, []);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (flipped && word.example_jp) speakJapanese(word.example_jp);
    else speakJapanese(word.reading);
  }, [flipped]);

  useEffect(() => {
    if (!flipped || uiLanguage !== "zh" || meaningZh) return;
    api.japaneseWords.translateZh(word.id)
      .then((result) => {
        setMeaningZh(result.meaning_zh);
        setExampleZh(result.example_zh);
      })
      .catch(() => {});
  }, [flipped, uiLanguage, meaningZh, word.id]);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-18, 18]);
  const rightOpacity = useTransform(x, [20, SWIPE_THRESHOLD_JA], [0, 1]);
  const leftOpacity  = useTransform(x, [-SWIPE_THRESHOLD_JA, -20], [1, 0]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > SWIPE_THRESHOLD_JA) {
      animate(x, 600, { duration: 0.25 });
      setTimeout(() => onSwipe(true), 200);
    } else if (info.offset.x < -SWIPE_THRESHOLD_JA) {
      animate(x, -600, { duration: 0.25 });
      setTimeout(() => onSwipe(false), 200);
    } else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  };

  return (
    <div className="relative w-full select-none" style={{ minHeight: "300px" }}>
      <motion.div style={{ opacity: rightOpacity }}
        className="absolute inset-0 rounded-3xl border-2 border-green-500 bg-green-950/30 flex items-center justify-center z-0 pointer-events-none">
        <span className="text-green-400 text-3xl font-black tracking-widest rotate-[-12deg] border-4 border-green-500 px-4 py-1 rounded-xl">{t.knew}</span>
      </motion.div>
      <motion.div style={{ opacity: leftOpacity }}
        className="absolute inset-0 rounded-3xl border-2 border-jeok-500 bg-jeok-950/30 flex items-center justify-center z-0 pointer-events-none">
        <span className="text-jeok-400 text-3xl font-black tracking-widest rotate-[12deg] border-4 border-jeok-500 px-4 py-1 rounded-xl">{t.missed}</span>
      </motion.div>
      <motion.div drag="x" dragElastic={0.8} style={{ x, rotate, position: "relative", zIndex: 10 }}
        onDragEnd={handleDragEnd} onClick={onFlip}
        className="cursor-grab active:cursor-grabbing" whileTap={{ scale: 0.98 }}>
        <div style={{ perspective: "1200px" }}>
          <div className="relative w-full transition-transform duration-[380ms]"
            style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", minHeight: "300px" }}>
            {/* 앞면: 일본어 표기 */}
            <div className="absolute inset-0 bg-dark-200 border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 p-8"
              style={{ backfaceVisibility: "hidden" }}>
              {word.jlpt_level && (
                <span className="absolute top-3 right-4 text-xs text-stone-300 font-semibold z-20 bg-black/50 px-2 py-0.5 rounded-full">{word.jlpt_level}</span>
              )}
              <p className="text-6xl font-bold text-stone-100 text-center">{word.expression}</p>
              {word.expression !== word.reading && (
                <p className="text-lg text-stone-400 font-light">{word.reading}</p>
              )}
              <CopyButton text={word.expression} />
              <p className="text-xs text-stone-700 mt-2">{t.tapMeaning}</p>
            </div>
            {/* 뒷면: 한국어 뜻 */}
            <div className="absolute inset-0 bg-dark-300 border border-jeok-900 rounded-3xl flex flex-col items-center justify-center gap-3 p-8"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <p className="text-2xl font-bold text-stone-100 text-center leading-relaxed">{uiLanguage === "zh" ? (meaningZh || word.meaning) : word.meaning}</p>
              <p className="text-stone-500 text-base">{word.expression}</p>
              {word.reading !== word.expression && (
                <p className="text-stone-600 text-sm">{word.reading}</p>
              )}
              {word.example_jp && (
                <div className="bg-black/30 rounded-xl px-4 py-2.5 mt-1 w-full">
                  <p className="text-sm text-stone-200 leading-relaxed text-center">{word.example_jp}</p>
                  {(uiLanguage === "zh" ? (exampleZh || word.example_ko) : word.example_ko) && (
                    <p className="text-xs text-stone-500 text-center mt-1.5 leading-relaxed">{uiLanguage === "zh" ? (exampleZh || word.example_ko) : word.example_ko}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function JaReviewSession({ words, uiLanguage, onDone, onBack }: { words: JapaneseWord[]; uiLanguage: UiLanguage; onDone: () => void; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [results, setResults] = useState({ knew: 0, missed: 0 });
  const [done, setDone] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  const current = words[index];

  const reveal = () => { setFlipped((f) => !f); if (phase === "question") setPhase("answer"); };
  const answer = async (knew: boolean) => {
    if (busy) return;
    setBusy(true);
    await api.japaneseWords.review(current.id, knew);
    setResults((r) => ({ knew: r.knew + (knew ? 1 : 0), missed: r.missed + (knew ? 0 : 1) }));
    const next = index + 1;
    if (next >= words.length) { setDone(true); setBusy(false); return; }
    setTimeout(() => { setIndex(next); setPhase("question"); setFlipped(false); setCardKey((k) => k + 1); setBusy(false); }, 280);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (phase === "question" && e.key === " ") { e.preventDefault(); reveal(); }
      if (!busy) {
        if (e.key === "ArrowRight" || e.key === "o") answer(true);
        if (e.key === "ArrowLeft"  || e.key === "x") answer(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase, index, busy]);

  if (done) return <ReviewDoneScreen results={results} uiLanguage={uiLanguage} onDone={onDone} />;
  return (
    <ReviewLayout index={index} total={words.length} uiLanguage={uiLanguage} onBack={onBack} phase={phase} onReveal={reveal} onAnswer={answer} busy={busy}>
      <JaSwipeCard key={cardKey} word={current} flipped={flipped} onFlip={reveal} onSwipe={answer} uiLanguage={uiLanguage} />
    </ReviewLayout>
  );
}


function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 7l3 3 6-6" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="4" y="1" width="8" height="8" rx="1.5" stroke="#a8a29e" strokeWidth="1.4"/><rect x="1" y="4" width="8" height="8" rx="1.5" stroke="#a8a29e" strokeWidth="1.4"/></svg>
      )}
    </button>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-stone-500 text-sm">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}
