"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, TodayPlan } from "@/lib/api";

const choices = [5, 15, 30, 60] as const;

export default function TodayStudy() {
  const [minutes, setMinutes] = useState<5 | 15 | 30 | 60>(15);
  const [plan, setPlan] = useState<TodayPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (value?: 5 | 15 | 30 | 60) => {
    setLoading(true);
    try {
      const next = await api.learning.today(value);
      setPlan(next);
      setMinutes(next.minutes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const migrate = async () => {
      if (!localStorage.getItem("learning_progress_migrated_v1")) {
        const read = (key: string) => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } };
        await api.learning.migrateLocal({ sqld: read("sqld_progress_v1"), network: read("network_manager_progress_v1") });
        localStorage.setItem("learning_progress_migrated_v1", "1");
      }
      await load();
    };
    migrate().catch(() => setLoading(false));
  }, []);

  const changeMinutes = async (value: typeof choices[number]) => {
    setMinutes(value);
    await Promise.all([api.settings.update({ study_minutes: value }), load(value)]);
  };

  return (
    <section className="mx-4 mt-4 rounded-3xl border border-emerald-800/50 bg-gradient-to-br from-emerald-950/50 via-dark-200 to-dark-300 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-emerald-400">오늘의 한 가지</p>
          <h2 className="mt-1 text-xl font-black text-stone-100">지금 가능한 시간만큼 시작하세요</h2>
          {plan?.recovery_message && <p className="mt-2 text-xs text-amber-300">{plan.recovery_message}</p>}
        </div>
        <Link href="/weekly-report" className="shrink-0 text-xs text-stone-500 hover:text-stone-200">주간 리포트 →</Link>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {choices.map((value) => <button key={value} onClick={() => changeMinutes(value)} className={`rounded-xl py-2 text-sm font-bold transition ${minutes === value ? "bg-emerald-600 text-white" : "bg-dark-100 text-stone-500 hover:text-stone-200"}`}>{value}분</button>)}
      </div>
      <div className="mt-4 space-y-2">
        {loading && <div className="rounded-2xl bg-dark-100 p-4 text-sm text-stone-500">오늘 학습을 구성하는 중...</div>}
        {!loading && plan?.tasks.map((task, index) => (
          <Link key={task.id} href={task.href} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-dark-100/80 p-4 transition hover:border-emerald-700">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${task.completed ? "bg-emerald-900 text-emerald-300" : "bg-stone-800 text-stone-300"}`}>{task.completed ? "✓" : index + 1}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-stone-100">{task.title}</p><p className="mt-0.5 text-xs text-stone-500">약 {task.minutes}분</p></div>
            <span className="text-emerald-400">→</span>
          </Link>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
        <Link href="/mistakes" className="rounded-xl bg-red-950/30 px-3 py-2.5 text-red-300">오답 노트 {plan?.unresolved_mistakes ?? 0}개</Link>
        <Link href="/practice" className="rounded-xl bg-blue-950/30 px-3 py-2.5 text-blue-300">🎧 듣기 · 말하기</Link>
      </div>
    </section>
  );
}
