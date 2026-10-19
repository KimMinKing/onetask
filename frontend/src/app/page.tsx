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
    learn: [string, string];
  };
}> = {
  ko: {
    nav: {
      calendar: ["캘린더", "날짜별 완료 기록"],
      learn: ["학습하기", "과목과 복습 방법 고르기"],
    },
  },
  zh: {
    nav: {
      calendar: ["日历", "按日期查看完成记录"],
      learn: ["开始学习", "选择科目与复习方式"],
    },
  },
};

export default function Home() {
  const { fetchAll, tasks } = useTaskStore();
  const [tab, setTab] = useState<Tab>("todo");
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [wordToday, setWordToday] = useState<number | null>(null);
  const uiLanguage = useUiLanguage();
  const router = useRouter();
  const user = getUser();
  const text = HOME_TEXT[uiLanguage];
  const common = COMMON_TEXT[uiLanguage];

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if ("Notification" in window) {
      setPushPermission(Notification.permission);
      if (Notification.permission === "granted") {
        subscribePush().then(setPushSubscribed).catch(() => setPushSubscribed(false));
      }
    }
    api.stats.overview()
      .then((s) => setWordToday(s.zh_today + s.en_today + s.ja_today))
      .catch(() => {});
  }, []);

  const handleEnablePush = async () => {
    try {
      const ok = await subscribePush();
      if (ok) {
        setPushPermission("granted");
        setPushSubscribed(true);
      }
    } catch {
      setPushSubscribed(false);
    }
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
            {!pushSubscribed && pushPermission !== "denied" && (
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
            <button onClick={async () => { await clearAuth(); router.replace("/login"); }}
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
        <Link href="/calendar" className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-jeok-800 rounded-2xl px-5 py-4 transition-all group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-100 text-xl">📅</div>
          <div><p className="text-sm font-semibold text-stone-200">{text.nav.calendar[0]}</p><p className="mt-0.5 text-xs text-stone-500">{text.nav.calendar[1]}</p></div>
          <span className="ml-auto text-stone-600 group-hover:text-jeok-400">→</span>
        </Link>
        <Link href="/learn" className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-emerald-800 rounded-2xl px-5 py-4 transition-all group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/40 text-xl">📚</div>
          <div><p className="text-sm font-semibold text-stone-200">{text.nav.learn[0]}</p><p className="mt-0.5 text-xs text-stone-500">{text.nav.learn[1]}</p></div>
          <span className="ml-auto text-stone-600 group-hover:text-emerald-400">→</span>
        </Link>
      </div>
      </div>
    </div>
  );
}
