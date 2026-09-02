"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTaskStore } from "@/store/taskStore";
import TaskList from "@/components/TaskList";
import AddTaskForm from "@/components/AddTaskForm";
import DoneList from "@/components/DoneList";
import { FloatingSettings } from "@/components/FloatingSettings";
import { getUser, clearAuth } from "@/lib/auth";
import { subscribePush } from "@/lib/push";
import { api } from "@/lib/api";
import { COMMON_TEXT, useUiLanguage, UiLanguage } from "@/lib/i18n";
import TodayStudy from "@/components/TodayStudy";

type Tab = "todo" | "done";
const HOME_TEXT: Record<UiLanguage, {
  nav: {
    calendar: [string, string];
    words: [string, string];
    search: [string, string];
    englishPhrases: [string, string];
    hsk5: [string, string];
    stats: [string, string];
    math: [string, string];
    python: [string, string];
    sqld: [string, string];
    network: [string, string];
    dailyCourse: [string, string];
  };
}> = {
  ko: {
    nav: {
      calendar: ["캘린더", "날짜별 완료 기록"],
      words: ["단어 암기장", "단어 플래시카드"],
      search: ["단어 검색", "찾아서 즐겨찾기"],
      englishPhrases: ["영어 표현 암기", "예문 · 빈칸 · 대화"],
      hsk5: ["HSK5 한 달 코스", "HSK4 공백 보강부터 모의고사까지"],
      stats: ["학습 통계", "진행률 · 연속일 · 레벨별"],
      math: ["AI 미적분", "중학생도 이해하는 10단계"],
      python: ["Python AI", "변수부터 신경망까지 10단계"],
      sqld: ["SQLD 합격 100단계", "데이터 모델링 · SQL 기본 및 활용"],
      network: ["네트워크관리사 2급", "필기 · 케이블 · 서버 · 라우터 100단계"],
      dailyCourse: ["추천 하루 학습", "HSK4 · 일본어 · SQLD · 네트워크"],
    },
  },
  zh: {
    nav: {
      calendar: ["日历", "按日期查看完成记录"],
      words: ["单词记忆本", "单词闪卡"],
      search: ["搜索单词", "查找并收藏"],
      englishPhrases: ["英语表达记忆", "例句 · 填空 · 对话"],
      hsk5: ["HSK5 一个月课程", "从 HSK4 查缺补漏到模拟考试"],
      stats: ["学习统计", "进度 · 连续天数 · 按级别"],
      math: ["AI 微积分", "中学生也能理解的 10 阶段"],
      python: ["Python AI", "从变量到神经网络的 10 阶段"],
      sqld: ["SQLD 合格 100 阶段", "数据建模 · SQL 基础与应用"],
      network: ["网络管理员 2级", "笔试 · 网线 · 服务器 · 路由器 100阶段"],
      dailyCourse: ["每日推荐学习", "HSK4 · 日语 · SQLD · 网络"],
    },
  },
};

export default function Home() {
  const { fetchAll, tasks } = useTaskStore();
  const [tab, setTab] = useState<Tab>("todo");
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [wordToday, setWordToday] = useState<number | null>(null);
  const uiLanguage = useUiLanguage();
  const router = useRouter();
  const user = getUser();
  const text = HOME_TEXT[uiLanguage];
  const common = COMMON_TEXT[uiLanguage];

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if ("Notification" in window) setPushPermission(Notification.permission);
    api.stats.overview()
      .then((s) => setWordToday(s.zh_today + s.en_today + s.ja_today))
      .catch(() => {});
  }, []);

  const handleEnablePush = async () => {
    const ok = await subscribePush();
    if (ok) setPushPermission("granted");
  };

  const doneToday = tasks.filter((t) => {
    if (t.status !== "done" || !t.done_at) return false;
    return new Date(t.done_at).toDateString() === new Date().toDateString();
  });
  const todoCount = tasks.filter((t) => t.status === "todo").length;

  const dateStr = new Date().toLocaleDateString(uiLanguage === "zh" ? "zh-CN" : "ko-KR", {
    month: "long", day: "numeric", weekday: "short",
  });

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      {/* 헤더 */}
      <div className="px-6 pt-10 pb-6 bg-dark-300 border-b border-white/5">
        <div className="flex items-start justify-between">
          <div>
            <Link href="/" className="inline-flex items-center group">
              <h1 className="text-3xl font-bold text-jeok-400 tracking-tight group-hover:text-jeok-300 transition-colors">onetask</h1>
            </Link>
            <p className="text-stone-600 text-xs mt-1">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {pushPermission !== "granted" && pushPermission !== "denied" && (
              <button onClick={handleEnablePush}
                className="text-xs text-jeok-500 hover:text-jeok-400 transition-colors">
                🔔 {common.notifications}
              </button>
            )}
            {user?.is_master && (
              <Link href="/admin"
                className="text-xs text-stone-600 hover:text-jeok-400 transition-colors">
                admin
              </Link>
            )}
            <button onClick={() => { clearAuth(); router.replace("/login"); }}
              className="text-xs text-stone-700 hover:text-stone-500 transition-colors">
              {common.logout}
            </button>
            <FloatingSettings />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <span className="flex items-center gap-1.5 bg-dark-200 rounded-full px-3 py-1.5 text-xs font-medium text-stone-400">
            <span className="w-1.5 h-1.5 rounded-full bg-jeok-500 inline-block" />
            {common.todo} {common.count(todoCount)}
          </span>
          <span className="flex items-center gap-1.5 bg-dark-200 rounded-full px-3 py-1.5 text-xs font-medium text-stone-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            {common.todayDone} {common.count(doneToday.length)}
          </span>
          {wordToday !== null && wordToday > 0 && (
            <span className="flex items-center gap-1.5 bg-dark-200 rounded-full px-3 py-1.5 text-xs font-medium text-stone-400">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
              {common.words} {common.count(wordToday)}
            </span>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="home-desktop-shell">
        <main className="home-main-panel">
      <TodayStudy />
      <div className="px-4 pt-4">
        <div className="flex bg-dark-200 rounded-2xl p-1 gap-1">
          {(["done", "todo"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === t
                  ? "bg-jeok-600 text-white shadow-lg shadow-jeok-900/50"
                  : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {t === "done" ? `✅ ${common.done}` : `📋 ${common.todo}`}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 px-4 pt-4 pb-6 overflow-y-auto">
        {tab === "todo" && (
          <>
            <AddTaskForm />
            <TaskList filter="todo" />
          </>
        )}
        {tab === "done" && <DoneList tasks={tasks.filter((t) => t.status === "done")} />}
      </div>

      {/* 하단 네비 */}
        </main>

      <div className="home-nav-grid px-4 pb-8 pt-2 border-t border-white/5 bg-dark-300 flex flex-col gap-2">
        <Link
          href="/calendar"
          className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-jeok-800 rounded-2xl px-5 py-4 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-xl">
            📅
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-200">{text.nav.calendar[0]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{text.nav.calendar[1]}</p>
          </div>
          <span className="ml-auto text-stone-600 group-hover:text-jeok-400 transition-colors">→</span>
        </Link>
        <Link
          href="/words"
          className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-jeok-800 rounded-2xl px-5 py-4 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-jeok-900 flex items-center justify-center text-xl">
            🀄
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-200">{text.nav.words[0]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{text.nav.words[1]}</p>
          </div>
          <span className="ml-auto text-stone-600 group-hover:text-jeok-400 transition-colors">→</span>
        </Link>
        <Link
          href="/search"
          className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-yellow-800 rounded-2xl px-5 py-4 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-yellow-900/40 flex items-center justify-center text-xl">
            🔎
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-200">{text.nav.search[0]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{text.nav.search[1]}</p>
          </div>
          <span className="ml-auto text-stone-600 group-hover:text-yellow-400 transition-colors">→</span>
        </Link>
        <Link
          href="/english-phrases"
          className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-blue-800 rounded-2xl px-5 py-4 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-300">
            Ex
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-200">{text.nav.englishPhrases[0]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{text.nav.englishPhrases[1]}</p>
          </div>
          <span className="ml-auto text-stone-600 group-hover:text-blue-400 transition-colors">→</span>
        </Link>
        <Link
          href="/hsk5"
          className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-jeok-800 rounded-2xl px-5 py-4 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-jeok-900 flex items-center justify-center text-lg font-bold text-jeok-300">
            H5
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-200">{text.nav.hsk5[0]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{text.nav.hsk5[1]}</p>
          </div>
          <span className="ml-auto text-stone-600 group-hover:text-jeok-400 transition-colors">→</span>
        </Link>
        <Link
          href="/stats"
          className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-jeok-800 rounded-2xl px-5 py-4 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-xl">
            📊
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-200">{text.nav.stats[0]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{text.nav.stats[1]}</p>
          </div>
          <span className="ml-auto text-stone-600 group-hover:text-jeok-400 transition-colors">→</span>
        </Link>
        <Link
          href="/math"
          className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-jeok-800 rounded-2xl px-5 py-4 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-xl">
            📐
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-200">{text.nav.math[0]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{text.nav.math[1]}</p>
          </div>
          <span className="ml-auto text-stone-600 group-hover:text-jeok-400 transition-colors">→</span>
        </Link>
        <Link
          href="/python"
          className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-blue-800 rounded-2xl px-5 py-4 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-900/40 flex items-center justify-center text-xl">
            🐍
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-200">{text.nav.python[0]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{text.nav.python[1]}</p>
          </div>
          <span className="ml-auto text-stone-600 group-hover:text-blue-400 transition-colors">→</span>
        </Link>
        <Link
          href="/sqld"
          className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-violet-800 rounded-2xl px-5 py-4 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-900/40 flex items-center justify-center text-sm font-black text-violet-300">
            SQL
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-200">{text.nav.sqld[0]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{text.nav.sqld[1]}</p>
          </div>
          <span className="ml-auto text-stone-600 group-hover:text-violet-400 transition-colors">→</span>
        </Link>
        <Link
          href="/network"
          className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-cyan-800 rounded-2xl px-5 py-4 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-900/40 flex items-center justify-center text-sm font-black text-cyan-300">
            NET
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-200">{text.nav.network[0]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{text.nav.network[1]}</p>
          </div>
          <span className="ml-auto text-stone-600 group-hover:text-cyan-400 transition-colors">→</span>
        </Link>
        <Link
          href="/daily-course"
          className="flex items-center gap-4 bg-gradient-to-r from-emerald-950/40 to-dark-200 hover:bg-dark-100 border border-emerald-900/60 hover:border-emerald-700 rounded-2xl px-5 py-4 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-900/50 flex items-center justify-center text-lg font-black text-emerald-300">✓</div>
          <div>
            <p className="text-sm font-semibold text-stone-200">{text.nav.dailyCourse[0]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{text.nav.dailyCourse[1]}</p>
          </div>
          <span className="ml-auto text-stone-600 group-hover:text-emerald-400 transition-colors">→</span>
        </Link>
      </div>
      </div>
    </div>
  );
}
