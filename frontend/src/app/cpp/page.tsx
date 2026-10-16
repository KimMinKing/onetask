"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CPP_CURRICULUM } from "./curriculum";
import { api } from "@/lib/api";
import { readUserStorage, writeUserStorage } from "@/lib/auth";

const STORAGE_KEY = "cpp_progress_v1";
const total = CPP_CURRICULUM.length;

function savedProgress(): Record<number, boolean> {
  try {
    const value = JSON.parse(readUserStorage(STORAGE_KEY) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, done]) =>
      Number.isInteger(Number(id)) && Number(id) >= 1 && Number(id) <= total && done === true
    ).map(([id]) => [Number(id), true]));
  } catch {
    return {};
  }
}

async function reconcileProgress(): Promise<{ completed: Record<number, boolean>; failed: boolean }> {
  const local = savedProgress();
  const rows = await api.learning.progress("cpp");
  const remote = new Set(rows.filter(row => row.completed).map(row => Number(row.unit_id))
    .filter(id => Number.isInteger(id) && id >= 1 && id <= total));
  const missing = Object.keys(local).map(Number).filter(id => !remote.has(id));
  const results = await Promise.allSettled(missing.map(id => api.learning.complete("cpp", String(id), {
    completed: true, score: 100, duration_minutes: 0, title: CPP_CURRICULUM[id - 1].title,
  })));
  return {
    completed: { ...local, ...Object.fromEntries([...remote].map(id => [id, true])) },
    failed: results.some(result => result.status === "rejected"),
  };
}

export default function CppPage() {
  const [selected, setSelected] = useState(0);
  const [progress, setProgress] = useState<Record<number, boolean>>({});
  const [choice, setChoice] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("전체");

  useEffect(() => {
    setProgress(savedProgress());
    reconcileProgress().then(result => {
      setProgress(previous => ({ ...previous, ...result.completed }));
      setSyncFailed(previous => previous || result.failed);
    }).catch(() => setSyncFailed(true));
    const step = Number(new URLSearchParams(window.location.search).get("step"));
    if (Number.isInteger(step) && step >= 1 && step <= total) setSelected(step);
  }, []);

  const current = CPP_CURRICULUM.find(lesson => lesson.id === selected);
  const sections = ["전체", ...new Set(CPP_CURRICULUM.map(lesson => lesson.section))];
  const filtered = useMemo(() => CPP_CURRICULUM.filter(lesson =>
    (section === "전체" || lesson.section === section) &&
    `${lesson.title} ${lesson.summary} ${lesson.points.join(" ")}`.toLowerCase().includes(query.toLowerCase())
  ), [query, section]);
  const completed = CPP_CURRICULUM.filter(lesson => progress[lesson.id]).length;

  async function retrySync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await reconcileProgress();
      setProgress(previous => ({ ...previous, ...result.completed }));
      setSyncFailed(result.failed);
    } catch {
      setSyncFailed(true);
    } finally {
      setSyncing(false);
    }
  }

  function openLesson(id: number) {
    setSelected(id);
    setChoice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectAnswer(index: number) {
    if (!current || choice !== null) return;
    setChoice(index);
    if (index !== current.quiz.answer) {
      api.learning.addMistake({
        subject: "cpp",
        item_key: `lesson-${current.id}`,
        question: current.quiz.question,
        correct_answer: current.quiz.options[current.quiz.answer],
        user_answer: current.quiz.options[index],
        explanation: current.quiz.explanation,
      }).catch(() => {});
    }
  }

  async function finish() {
    if (!current || choice !== current.quiz.answer || saving) return;
    setSaving(true);
    const next = { ...progress, [current.id]: true };
    setProgress(next);
    try { writeUserStorage(STORAGE_KEY, JSON.stringify(next)); } catch { /* Server save can still succeed. */ }
    try {
      await api.learning.complete("cpp", String(current.id), {
        completed: true, score: 100, duration_minutes: 15, title: current.title,
      });
    } catch {
      setSyncFailed(true);
    } finally {
      setSaving(false);
      openLesson(current.id < total ? current.id + 1 : 0);
    }
  }

  return <div className="min-h-dvh bg-dark-400 text-stone-100">
    <header className="border-b border-white/5 bg-dark-300 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-100">← 홈</Link>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-cyan-400">C++ · 시스템 · 네트워크</p>
            <h1 className="mt-1 text-3xl font-black">C++와 TCP/UDP {total}단계</h1>
            <p className="mt-2 text-sm text-stone-400">언어와 메모리부터 소켓, 패킷 경계, 타임아웃과 테스트까지</p>
          </div>
          <p className="shrink-0 text-lg font-bold">{completed}/{total}</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-dark-100"><div className="h-full bg-cyan-500" style={{ width: `${completed / total * 100}%` }} /></div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm"><Link href="/cpp/lab" className="font-bold text-emerald-300 hover:underline">실행 가능한 TCP/UDP 실습 →</Link><Link href="/network" className="text-cyan-300 hover:underline">네트워크 심화 20단계 →</Link></div>
        {syncFailed && <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-800 bg-amber-950/20 px-4 py-3 text-sm text-amber-200"><span>서버 진도를 확인하거나 저장하지 못했습니다. 이 기기의 완료 기록은 유지됩니다.</span><button disabled={syncing} onClick={retrySync} className="rounded-lg border border-amber-700 px-3 py-1 disabled:opacity-50">{syncing ? "재시도 중..." : "다시 동기화"}</button></div>}
      </div>
    </header>

    {current ? <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <button onClick={() => openLesson(0)} className="text-sm text-stone-400 hover:text-stone-100">← 전체 목록</button>
      <article className="space-y-5 rounded-3xl bg-dark-200 p-5 sm:p-7">
        <div><p className="text-xs font-bold text-cyan-400">{current.section} · {current.id}/{total}</p><h2 className="mt-2 text-2xl font-black">{current.title}</h2></div>
        <p className="leading-7 text-stone-300">{current.summary}</p>
        <ul className="space-y-2">{current.points.map(point => <li key={point} className="rounded-xl bg-dark-100 px-4 py-3 text-sm leading-6 text-stone-300">• {point}</li>)}</ul>
        <section><h3 className="mb-2 font-bold">핵심 코드 조각</h3><pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/40 p-4 text-xs leading-6 text-emerald-300">{current.code}</pre></section>
        <section><h3 className="mb-2 font-bold">직접 해보기</h3><p className="text-sm leading-6 text-stone-300">{current.exercise}</p></section>
        <aside className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm leading-6 text-amber-200"><strong>주의:</strong> {current.pitfall}</aside>
      </article>
      <section className="rounded-3xl bg-dark-200 p-5 sm:p-7">
        <p className="text-xs font-bold text-cyan-400">확인 문제</p><h3 className="my-3 font-bold leading-7">{current.quiz.question}</h3>
        <div className="space-y-2">{current.quiz.options.map((option, index) => <button key={index} disabled={choice !== null} onClick={() => selectAnswer(index)} className={`block w-full rounded-xl border p-3 text-left text-sm ${choice === null ? "border-white/10 bg-dark-100 hover:border-cyan-700" : index === current.quiz.answer ? "border-emerald-700 bg-emerald-950/30 text-emerald-300" : index === choice ? "border-red-700 bg-red-950/30 text-red-300" : "border-white/5 text-stone-500"}`}>{index + 1}. {option}</button>)}</div>
        {choice !== null && <div className={`mt-4 rounded-xl p-4 text-sm leading-6 ${choice === current.quiz.answer ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>{choice === current.quiz.answer ? "정답입니다. " : "다시 풀어보세요. "}{current.quiz.explanation}{choice !== current.quiz.answer && <button className="mt-3 block rounded-lg border border-red-700 px-3 py-1" onClick={() => setChoice(null)}>다시 풀기</button>}</div>}
        <button disabled={choice !== current.quiz.answer || saving} onClick={finish} className="mt-4 w-full rounded-xl bg-cyan-600 py-3 font-bold disabled:opacity-30">{saving ? "저장 중..." : current.id === total ? "완료하고 목록으로" : "완료하고 다음 단계로"}</button>
      </section>
      <div className="grid grid-cols-2 gap-3"><button disabled={current.id === 1} onClick={() => openLesson(current.id - 1)} className="rounded-xl bg-dark-200 py-3 disabled:opacity-30">← 이전</button><button disabled={current.id === total} onClick={() => openLesson(current.id + 1)} className="rounded-xl bg-dark-200 py-3 disabled:opacity-30">다음 →</button></div>
    </main> : <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_auto]"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="C++, TCP, UDP, 소켓 검색" className="rounded-xl border border-stone-700 bg-dark-200 px-4 py-3 text-sm outline-none focus:border-cyan-600"/><select value={section} onChange={event => setSection(event.target.value)} className="rounded-xl border border-stone-700 bg-dark-200 px-4 py-3 text-sm">{sections.map(name => <option key={name}>{name}</option>)}</select></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(lesson => <button key={lesson.id} onClick={() => openLesson(lesson.id)} className={`rounded-2xl border p-4 text-left hover:border-cyan-700 ${progress[lesson.id] ? "border-emerald-900 bg-emerald-950/15" : "border-white/5 bg-dark-200"}`}><p className={`text-xs font-bold ${progress[lesson.id] ? "text-emerald-400" : "text-cyan-400"}`}>{progress[lesson.id] ? "✓ " : ""}{lesson.id}단계 · {lesson.section}</p><h2 className="mt-2 font-bold">{lesson.title}</h2><p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-400">{lesson.summary}</p></button>)}</div>
    </main>}
  </div>;
}
