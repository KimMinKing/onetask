"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SQLD_CURRICULUM, SqldLesson } from "./curriculum";

const STORAGE_KEY = "sqld_progress_v1";

function loadProgress(): Record<number, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function CodeBlock({ children }: { children: string }) {
  return <pre className="overflow-x-auto whitespace-pre rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-6 text-emerald-300">{children}</pre>;
}

function LessonView({ lesson, done, onDone, onMove }: { lesson: SqldLesson; done: boolean; onDone: () => void; onMove: (id: number) => void }) {
  const [choice, setChoice] = useState<number | null>(null);
  useEffect(() => { setChoice(null); window.scrollTo({ top: 0, behavior: "smooth" }); }, [lesson.id]);
  const correct = choice === lesson.quiz.answer;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-5">
      <button onClick={() => onMove(0)} className="mb-4 text-sm text-stone-500 hover:text-stone-200">← 100단계 목록</button>
      <div className="mb-4 flex items-center gap-2 text-xs">
        <span className="rounded-full bg-violet-950 px-3 py-1 font-bold text-violet-300">{lesson.id}/100</span>
        <span className="rounded-full bg-dark-200 px-3 py-1 text-stone-400">{lesson.section}</span>
      </div>
      <article className="space-y-5 rounded-3xl border border-white/5 bg-dark-200 p-5 sm:p-7">
        <div>
          <p className="mb-1 text-sm font-semibold text-violet-400">{lesson.subtitle}</p>
          <h1 className="text-2xl font-black text-stone-100 sm:text-3xl">{lesson.title}</h1>
        </div>
        <p className="whitespace-pre-line text-sm leading-7 text-stone-300">{lesson.summary}</p>
        <section>
          <h2 className="mb-3 text-sm font-bold text-stone-100">시험에 나오는 핵심</h2>
          <ul className="space-y-2">
            {lesson.points.map((point) => <li key={point} className="rounded-xl bg-dark-100 px-4 py-3 text-sm leading-6 text-stone-300">• {point}</li>)}
          </ul>
        </section>
        {lesson.sql && <section><h2 className="mb-3 text-sm font-bold text-stone-100">직접 읽어 보기</h2><CodeBlock>{lesson.sql}</CodeBlock></section>}
        <aside className="rounded-xl border border-amber-900/60 bg-amber-950/20 px-4 py-3 text-sm leading-6 text-amber-200"><strong>함정 노트:</strong> {lesson.trap}</aside>
      </article>

      <section className="mt-5 rounded-3xl border border-white/5 bg-dark-200 p-5 sm:p-7">
        <p className="mb-2 text-xs font-bold text-violet-400">단계 확인 문제</p>
        <h2 className="mb-4 text-base font-bold leading-7 text-stone-100">{lesson.quiz.question}</h2>
        <div className="space-y-2">
          {lesson.quiz.options.map((option, index) => (
            <button key={option} disabled={choice !== null} onClick={() => setChoice(index)} className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${choice === null ? "border-white/5 bg-dark-100 text-stone-300 hover:border-violet-700" : index === lesson.quiz.answer ? "border-emerald-700 bg-emerald-950/30 text-emerald-300" : index === choice ? "border-red-800 bg-red-950/30 text-red-300" : "border-white/5 bg-dark-100 text-stone-600"}`}>{index + 1}. {option}</button>
          ))}
        </div>
        {choice !== null && (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm leading-6 ${correct ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/25 text-red-300"}`}>
            {correct ? "정답입니다. " : "다시 기억하세요. "}{lesson.quiz.explanation}
          </div>
        )}
        <button disabled={!correct} onClick={onDone} className="mt-4 w-full rounded-xl bg-violet-600 py-3.5 font-bold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30">{done ? "완료됨 · 다음 단계" : "이 단계 완료하고 다음으로"}</button>
      </section>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button disabled={lesson.id === 1} onClick={() => onMove(lesson.id - 1)} className="rounded-xl bg-dark-200 py-3 text-sm text-stone-400 disabled:opacity-30">← 이전</button>
        <button disabled={lesson.id === 100} onClick={() => onMove(lesson.id + 1)} className="rounded-xl bg-dark-200 py-3 text-sm text-stone-400 disabled:opacity-30">다음 →</button>
      </div>
    </main>
  );
}

export default function SqldPage() {
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  const [progress, setProgress] = useState<Record<number, boolean>>({});
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("전체");
  useEffect(() => setProgress(loadProgress()), []);
  const completed = Object.values(progress).filter(Boolean).length;
  const sections = ["전체", ...Array.from(new Set(SQLD_CURRICULUM.map((lesson) => lesson.section)))];
  const lessons = useMemo(() => SQLD_CURRICULUM.filter((lesson) => (section === "전체" || lesson.section === section) && `${lesson.title} ${lesson.subtitle} ${lesson.points.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query, section]);
  const current = selected ? SQLD_CURRICULUM[selected - 1] : null;

  const complete = (id: number) => {
    const next = { ...progress, [id]: true };
    setProgress(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSelected(id < 100 ? id + 1 : 0);
  };
  if (current) return <LessonView lesson={current} done={!!progress[current.id]} onDone={() => complete(current.id)} onMove={setSelected} />;

  return (
    <div className="min-h-dvh bg-dark-400">
      <header className="border-b border-white/5 bg-dark-300 px-5 pb-5 pt-10">
        <div className="mx-auto max-w-5xl">
          <button onClick={() => router.back()} className="mb-4 text-sm text-stone-500 hover:text-stone-200">← 홈으로</button>
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-sm font-bold text-violet-400">SQL Developer</p><h1 className="mt-1 text-3xl font-black text-stone-100">SQLD 합격 100단계</h1><p className="mt-2 text-sm text-stone-500">개념 → SQL 해석 → 함정 → 확인 문제로 끝내는 시험 대비 코스</p></div>
            <div className="text-right"><p className="text-2xl font-black text-stone-100">{completed}<span className="text-sm text-stone-500">/100</span></p><p className="text-xs text-stone-600">완료</p></div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-dark-100"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${completed}%` }} /></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="정규화, 윈도우 함수, 트랜잭션 검색..." className="rounded-xl border border-stone-700 bg-dark-200 px-4 py-3 text-sm text-stone-200 outline-none focus:border-violet-600" />
            <select value={section} onChange={(event) => setSection(event.target.value)} className="rounded-xl border border-stone-700 bg-dark-200 px-4 py-3 text-sm text-stone-300 outline-none">{sections.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-3 px-4 py-5 sm:grid-cols-2 lg:grid-cols-3">
        {lessons.map((lesson) => {
          const done = !!progress[lesson.id];
          return <button key={lesson.id} onClick={() => setSelected(lesson.id)} className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${done ? "border-emerald-900 bg-emerald-950/15" : "border-white/5 bg-dark-200 hover:border-violet-800"}`}><div className="mb-2 flex items-center justify-between"><span className={`text-xs font-black ${done ? "text-emerald-400" : "text-violet-400"}`}>{done ? "✓" : lesson.id}단계</span><span className="text-[10px] text-stone-600">{lesson.section}</span></div><h2 className="font-bold leading-6 text-stone-100">{lesson.title}</h2><p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{lesson.subtitle}</p></button>;
        })}
      </main>
    </div>
  );
}
