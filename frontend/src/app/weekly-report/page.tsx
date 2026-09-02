"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Report = Awaited<ReturnType<typeof api.learning.weeklyReport>>;
const names: Record<string, string> = { zh: "중국어", ja: "일본어", en: "영어", sqld: "SQLD", network: "네트워크" };

export default function WeeklyReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => { api.learning.weeklyReport().then(setReport); }, []);
  return <div className="min-h-dvh bg-dark-400 px-4 pb-12 pt-8"><main className="mx-auto max-w-3xl"><Link href="/" className="text-sm text-stone-500">← 홈</Link><p className="mt-6 text-xs font-bold text-emerald-400">최근 7일</p><h1 className="text-3xl font-black text-stone-100">주간 학습 리포트</h1>
    {!report ? <p className="mt-8 text-stone-500">집계 중...</p> : <><div className="mt-6 grid grid-cols-3 gap-3">{[["학습일", `${report.days}일`],["집중 시간", `${report.minutes}분`],["학습 활동", `${report.activities}회`]].map(([label,value]) => <div key={label} className="rounded-2xl bg-dark-200 p-4 text-center"><p className="text-2xl font-black text-stone-100">{value}</p><p className="mt-1 text-xs text-stone-500">{label}</p></div>)}</div><div className="mt-5 space-y-2">{Object.entries(report.by_subject).map(([key,value]) => <div key={key} className="flex items-center justify-between rounded-xl bg-dark-200 px-4 py-3"><span className="font-bold text-stone-200">{names[key] || key}</span><span className="text-sm text-stone-500">{value.activities}회 · {value.minutes}분</span></div>)}</div><Link href="/mistakes" className="mt-5 block rounded-2xl border border-red-900/50 bg-red-950/20 p-4 text-red-300">남은 오답 {report.unresolved_mistakes}개 복습하기 →</Link></>}
  </main></div>;
}
