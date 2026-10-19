"use client";

import Link from "next/link";
import type { StudyPhase } from "@/lib/studyCheckpoint";

const steps: { phase: StudyPhase; label: string }[] = [
  { phase: "story", label: "이야기" },
  { phase: "concept", label: "개념" },
  { phase: "practice", label: "확인" },
];

export default function StudyFlowBar({ phase, paused, onPause, onPhase }: { phase: StudyPhase; paused: boolean; onPause: (value: boolean) => void; onPhase: (value: StudyPhase) => void }) {
  return <div className="rounded-2xl border border-white/10 bg-dark-200 p-4 text-stone-200">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-bold text-emerald-300">짧게 한 장면씩 · 자동 저장</p>
      <button type="button" onClick={() => onPause(!paused)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-stone-300 hover:border-emerald-700">{paused ? "다시 시작" : "잠깐 쉬기"}</button>
    </div>
    <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="현재 학습 순서">
      {steps.map(({ phase: item, label }, index) => <li key={item}><button type="button" onClick={() => onPhase(item)} aria-current={phase === item ? "step" : undefined} className={`w-full rounded-lg px-2 py-2 text-center text-xs ${phase === item ? "bg-emerald-900/60 font-bold text-emerald-200" : "bg-dark-100 text-stone-400 hover:text-stone-100"}`}>{index + 1}. {label}</button></li>)}
    </ol>
    {paused && <div className="mt-4 rounded-xl bg-dark-100 p-4 text-sm leading-6 text-stone-300"><p>여기까지 저장했습니다. 잠깐 쉬어도 괜찮아요. 돌아오면 이 장면에서 이어집니다.</p><Link href="/learn" className="mt-3 inline-block font-bold text-emerald-300 underline">오늘은 여기까지 →</Link></div>}
  </div>;
}
