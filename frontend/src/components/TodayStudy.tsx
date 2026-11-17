"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type TodayPlan } from "@/lib/api";
import { readUserStorage, writeUserStorage } from "@/lib/auth";
import { dailyFocusTask, koreanDate } from "@/lib/dailyFocus";

const choices = [5, 15, 30, 60] as const;
type Minutes = typeof choices[number];

function lessonHref(href: string, minutes: number) {
  return `${href}${href.includes("?") ? "&" : "?"}study_minutes=${minutes}`;
}

export default function TodayStudy() {
  const [minutes, setMinutes] = useState<Minutes>(15);
  const [plan, setPlan] = useState<TodayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async (value?: Minutes) => {
    setLoading(true);
    setError(false);
    try {
      const next = await api.learning.today(value);
      setPlan(next);
      setMinutes(next.minutes);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const start = async () => {
      let needsMigration = false;
      try { needsMigration = !readUserStorage("learning_progress_migrated_v1"); } catch { /* Local storage is optional. */ }
      if (needsMigration) {
        const read = (key: string) => { try { return JSON.parse(readUserStorage(key) || "{}"); } catch { return {}; } };
        try {
          await api.learning.migrateLocal({ sqld: read("sqld_progress_v1"), network: read("network_manager_progress_v1") });
          writeUserStorage("learning_progress_migrated_v1", "1");
        } catch { /* Today's lesson still loads if old local progress cannot sync. */ }
      }
      await load();
    };
    start().catch(() => { setError(true); setLoading(false); });
  }, []);

  const changeMinutes = async (value: Minutes) => {
    setMinutes(value);
    setLoading(true);
    try {
      await api.settings.update({ study_minutes: value });
      await load(value);
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  const focus = plan ? dailyFocusTask(plan, koreanDate(new Date())) : null;
  const optional = plan?.tasks.filter(task => task.id !== focus?.id) ?? [];

  return <section className="mx-4 mt-4 rounded-3xl border border-emerald-800/50 bg-gradient-to-br from-emerald-950/50 via-dark-200 to-dark-300 p-5 text-stone-100">
    <p className="text-xs font-bold text-emerald-300">오늘의 한 걸음</p>
    <h2 className="mt-1 text-xl font-black leading-8">고르는 대신, 여기서 바로 시작해요</h2>
    {plan?.recovery_message && !plan.studied_today && <p className="mt-2 text-sm text-amber-200">{plan.recovery_message}</p>}

    {loading && <p role="status" className="mt-5 rounded-2xl bg-dark-100 p-5 text-sm text-stone-300">오늘의 한 단계를 찾는 중...</p>}
    {!loading && error && <div role="alert" className="mt-5 rounded-2xl border border-amber-800 bg-amber-950/20 p-4 text-sm text-amber-200">오늘 학습을 불러오지 못했습니다. <button type="button" onClick={() => load(minutes)} className="ml-1 font-bold underline">다시 시도</button></div>}

    {!loading && !error && plan?.studied_today && <div className="mt-5 rounded-2xl border border-emerald-700/50 bg-emerald-950/30 p-5">
      <p className="text-lg font-bold text-emerald-200">오늘 한 걸음 완료 ✓</p>
      <p className="mt-2 text-sm leading-6 text-stone-300">여기서 멈춰도 됩니다. 내일 다시 이 자리에서 이어가요.</p>
    </div>}

    {!loading && !error && plan && !plan.studied_today && focus && <div className="mt-5 rounded-2xl border border-emerald-600/50 bg-dark-100/90 p-5">
      <p className="text-xs font-bold text-emerald-300">지금 할 일 · 약 {focus.minutes}분</p>
      <h3 className="mt-2 text-lg font-black leading-7">{focus.title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-300">이 단계 하나면 오늘의 시작으로 충분해요. 끝나면 자동으로 기록됩니다.</p>
      <Link href={lessonHref(focus.href, focus.minutes)} className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-black text-white hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200">바로 시작하기 →</Link>
    </div>}

    {!loading && !error && plan && !plan.studied_today && !focus && <p className="mt-5 rounded-2xl bg-dark-100 p-4 text-sm text-stone-300">지금 이어갈 단계가 없습니다. 학습 서가에서 과목을 골라 보세요.</p>}

    {!loading && !error && plan && <div className="mt-4 space-y-3">
      <details className="rounded-xl border border-white/10 bg-dark-100/50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-stone-200">시간 바꾸기 · 현재 {minutes}분</summary>
        <div className="mt-3 grid grid-cols-4 gap-2">{choices.map(value => <button key={value} type="button" disabled={loading} onClick={() => changeMinutes(value)} aria-pressed={minutes === value} className={`min-h-10 rounded-lg text-sm font-bold ${minutes === value ? "bg-emerald-600 text-white" : "bg-dark-100 text-stone-300 hover:bg-dark-200"}`}>{value}분</button>)}</div>
      </details>
      <details className="rounded-xl border border-white/10 bg-dark-100/50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-stone-200">다른 과목도 보고 싶다면</summary>
        <div className="mt-3 space-y-2">
          {plan.studied_today && focus && <Link href={lessonHref(focus.href, focus.minutes)} className="block rounded-lg bg-dark-100 px-3 py-3 text-sm text-stone-200 hover:text-white">{focus.title} · 더 공부하기 →</Link>}
          {optional.map(task => <Link key={task.id} href={lessonHref(task.href, task.minutes)} className="block rounded-lg bg-dark-100 px-3 py-3 text-sm text-stone-200 hover:text-white">{task.title} →</Link>)}
          <Link href="/settings" className="block px-1 py-2 text-xs text-emerald-300 underline">주력 과목 바꾸기</Link>
          <Link href="/learn" className="block px-1 py-2 text-xs text-stone-300 underline">학습 서가 전체 보기</Link>
        </div>
      </details>
    </div>}
  </section>;
}
