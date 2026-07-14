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

type Tab = "todo" | "done";

export default function Home() {
  const { fetchAll, tasks } = useTaskStore();
  const [tab, setTab] = useState<Tab>("todo");
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [wordToday, setWordToday] = useState<number | null>(null);
  const router = useRouter();
  const user = getUser();

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

  const dateStr = new Date().toLocaleDateString("ko-KR", {
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
                🔔 알림
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
              로그아웃
            </button>
            <FloatingSettings />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <span className="flex items-center gap-1.5 bg-dark-200 rounded-full px-3 py-1.5 text-xs font-medium text-stone-400">
            <span className="w-1.5 h-1.5 rounded-full bg-jeok-500 inline-block" />
            할일 {todoCount}개
          </span>
          <span className="flex items-center gap-1.5 bg-dark-200 rounded-full px-3 py-1.5 text-xs font-medium text-stone-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            오늘 완료 {doneToday.length}개
          </span>
          {wordToday !== null && wordToday > 0 && (
            <span className="flex items-center gap-1.5 bg-dark-200 rounded-full px-3 py-1.5 text-xs font-medium text-stone-400">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
              단어 {wordToday}개
            </span>
          )}
        </div>
      </div>

      {/* 탭 */}
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
              {t === "done" ? "✅ 완료" : "📋 할일"}
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
      <div className="px-4 pb-8 pt-2 border-t border-white/5 bg-dark-300 flex flex-col gap-2">
        <Link
          href="/calendar"
          className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-jeok-800 rounded-2xl px-5 py-4 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-xl">
            📅
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-200">캘린더</p>
            <p className="text-xs text-stone-500 mt-0.5">날짜별 완료 기록</p>
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
            <p className="text-sm font-semibold text-stone-200">단어 암기장</p>
            <p className="text-xs text-stone-500 mt-0.5">단어 플래시카드</p>
          </div>
          <span className="ml-auto text-stone-600 group-hover:text-jeok-400 transition-colors">→</span>
        </Link>
        <Link
          href="/hsk5"
          className="flex items-center gap-4 bg-dark-200 hover:bg-dark-100 border border-white/5 hover:border-jeok-800 rounded-2xl px-5 py-4 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl bg-jeok-900 flex items-center justify-center text-lg font-bold text-jeok-300">
            H5
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-200">HSK5 한 달 코스</p>
            <p className="text-xs text-stone-500 mt-0.5">HSK4 공백 보강부터 모의고사까지</p>
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
            <p className="text-sm font-semibold text-stone-200">학습 통계</p>
            <p className="text-xs text-stone-500 mt-0.5">진행률 · 연속일 · 레벨별</p>
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
            <p className="text-sm font-semibold text-stone-200">AI 미적분</p>
            <p className="text-xs text-stone-500 mt-0.5">중학생도 이해하는 10단계</p>
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
            <p className="text-sm font-semibold text-stone-200">Python AI</p>
            <p className="text-xs text-stone-500 mt-0.5">변수부터 신경망까지 10단계</p>
          </div>
          <span className="ml-auto text-stone-600 group-hover:text-blue-400 transition-colors">→</span>
        </Link>
      </div>
    </div>
  );
}
