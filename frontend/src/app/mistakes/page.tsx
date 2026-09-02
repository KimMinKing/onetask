"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, MistakeItem } from "@/lib/api";

export default function MistakesPage() {
  const router = useRouter();
  const [items, setItems] = useState<MistakeItem[]>([]);
  const [subject, setSubject] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("subject") || "");
  useEffect(() => { api.learning.mistakes(subject || undefined).then(setItems); }, [subject]);
  const resolve = async (id: number) => { await api.learning.resolveMistake(id); setItems(current => current.filter(item => item.id !== id)); };
  return <div className="min-h-dvh bg-dark-400 px-4 pb-12 pt-8"><main className="mx-auto max-w-3xl">
    <button onClick={() => router.back()} className="text-sm text-stone-500">← 돌아가기</button>
    <div className="mt-5 flex items-end justify-between"><div><p className="text-xs font-bold text-red-400">통합 복습</p><h1 className="text-3xl font-black text-stone-100">오답 노트</h1></div><select value={subject} onChange={e => setSubject(e.target.value)} className="rounded-xl border border-white/10 bg-dark-200 px-3 py-2 text-sm text-stone-300"><option value="">전체 과목</option><option value="sqld">SQLD</option><option value="network">네트워크</option></select></div>
    <p className="mt-2 text-sm text-stone-500">틀린 문제가 자동으로 모입니다. 설명하고 다시 풀 수 있으면 완료하세요.</p>
    <div className="mt-5 space-y-3">{items.length === 0 && <div className="rounded-2xl bg-dark-200 p-8 text-center text-sm text-stone-500">남은 오답이 없습니다.</div>}{items.map(item => <article key={item.id} className="rounded-2xl border border-red-900/40 bg-dark-200 p-5"><div className="flex justify-between text-xs"><span className="font-bold uppercase text-red-400">{item.subject}</span><span className="text-stone-600">{item.mistake_count}회 틀림</span></div><h2 className="mt-3 font-bold leading-7 text-stone-100">{item.question}</h2>{item.user_answer && <p className="mt-3 text-sm text-red-300">내 답: {item.user_answer}</p>}<p className="mt-1 text-sm text-emerald-300">정답: {item.correct_answer}</p>{item.explanation && <p className="mt-3 rounded-xl bg-dark-100 p-3 text-sm leading-6 text-stone-400">{item.explanation}</p>}<button onClick={() => resolve(item.id)} className="mt-4 w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white">이제 설명할 수 있어요</button></article>)}</div>
  </main></div>;
}
