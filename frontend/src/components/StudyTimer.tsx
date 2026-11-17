"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { readStudyCheckpoint, saveStudyCheckpoint, STORY_COURSES, type StoryCourse } from "@/lib/studyCheckpoint";

const courseForPath = Object.fromEntries(Object.entries(STORY_COURSES).map(([subject, course]) => [course.path, subject])) as Record<string, StoryCourse>;

export function StudyTimer() {
  const pathname = usePathname();
  const params = useSearchParams();
  const minutes = Number(params.get("study_minutes"));
  const validMinutes = Number.isInteger(minutes) && minutes >= 1 && minutes <= 60;
  const [remaining, setRemaining] = useState<number | null>(null);
  const subject = courseForPath[pathname];
  const step = Number(params.get("step"));

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

  const stopHere = () => {
    if (!subject) return;
    const checkpoint = readStudyCheckpoint(subject);
    if (checkpoint && (step < 1 || !Number.isInteger(step) || step === checkpoint.step)) {
      saveStudyCheckpoint({ ...checkpoint, paused: true });
    }
  };

  return <aside aria-label="학습 목표 시간" className="fixed bottom-4 right-4 z-50 max-w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-emerald-700 bg-dark-300/95 px-4 py-3 text-stone-100 shadow-xl backdrop-blur">
    <p className="text-xs font-semibold text-emerald-300">오늘의 학습 · 목표 {minutes}분</p>
    <p role="timer" className="mt-1 font-mono text-2xl font-bold tabular-nums">{clock}</p>
    <p className="mt-1 text-xs leading-5 text-stone-300">{remaining === 0 ? "목표 시간에 도달했어요. 문제를 끝내지 않아도 여기서 멈출 수 있어요." : "완료를 재촉하지 않아요. 중간에 멈춰도 됩니다."}</p>
    {remaining === 0 && <Link href="/learn" onClick={stopHere} className="mt-3 block rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-bold text-white hover:bg-emerald-500">여기서 멈추고 이어하기 →</Link>}
    {remaining === 0 && <p className="mt-2 text-[11px] leading-4 text-stone-400">{subject ? "읽던 위치와 입력은 이 기기에 저장됩니다. 단계 완료는 정답 뒤 서버 저장 시 기록돼요." : "완료한 학습만 서버 진도에 기록됩니다."}</p>}
  </aside>;
}
