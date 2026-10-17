"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function StudyTimer() {
  const pathname = usePathname();
  const params = useSearchParams();
  const minutes = Number(params.get("study_minutes"));
  const validMinutes = Number.isInteger(minutes) && minutes >= 1 && minutes <= 60;
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!validMinutes) return;
    const deadline = Date.now() + minutes * 60_000;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [pathname, minutes, validMinutes]);

  if (!validMinutes || remaining === null) return null;
  const clock = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  return <aside aria-label="학습 목표 시간" className="fixed bottom-4 right-4 z-50 max-w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-emerald-700 bg-dark-300/95 px-4 py-3 text-stone-100 shadow-xl backdrop-blur">
    <p className="text-xs font-semibold text-emerald-300">오늘의 학습 · 목표 {minutes}분</p>
    <p role="timer" className="mt-1 font-mono text-2xl font-bold tabular-nums">{clock}</p>
    <p className="mt-1 text-xs text-stone-400">{remaining === 0 ? "목표 시간 완료 · 계속 학습할 수 있어요." : "시간이 끝나도 자동으로 넘어가지 않아요."}</p>
  </aside>;
}
