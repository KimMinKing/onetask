"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CPP_CURRICULUM } from "./curriculum";
import { CPP_STORY, CPP_STORY_CHAPTERS } from "./story";
import { CPP_EXPLANATIONS } from "./explanations";
import FirstCppSteps from "./FirstCppSteps";
import { CPP_CHECK_ANSWERS, CPP_DEEP_LESSONS } from "./deepLessons";
import { api } from "@/lib/api";
import { readUserStorage, writeUserStorage } from "@/lib/auth";
import StudyFlowBar from "@/components/StudyFlowBar";
import { useStudyFlow } from "@/lib/useStudyFlow";
import { clearStudyCheckpoint } from "@/lib/studyCheckpoint";

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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const startedAt = useRef(0);
  const [syncFailed, setSyncFailed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("전체");

  useEffect(() => {
    startedAt.current = window.performance.now();
    setProgress(savedProgress());
    reconcileProgress().then(result => {
      setProgress(previous => ({ ...previous, ...result.completed }));
      setSyncFailed(previous => previous || result.failed);
    }).catch(() => setSyncFailed(true));
    const step = Number(new URLSearchParams(window.location.search).get("step"));
    if (Number.isInteger(step) && step >= 1 && step <= total) setSelected(step);
  }, []);

  const current = CPP_CURRICULUM.find(lesson => lesson.id === selected);
  const flow = useStudyFlow("cpp", selected, current?.title ?? "", { choice: null as number | null });
  const choice = flow.draft.choice;
  const setChoice = (value: number | null) => flow.setDraft({ choice: value });
  const scene = current ? CPP_STORY[current.id - 1] : undefined;
  const chapter = current ? CPP_STORY_CHAPTERS.find(({ start, end }) => current.id >= start && current.id <= end) : undefined;
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
    if (saving) return;
    setSelected(id);
    setSaveError(false);
    startedAt.current = window.performance.now();
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
    setSaveError(false);
    const id = current.id;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      await api.learning.complete("cpp", String(id), {
        completed: true, score: 100, duration_minutes: Math.floor((window.performance.now() - startedAt.current) / 60_000), title: current.title,
      }, controller.signal);
      const next = { ...savedProgress(), ...progress, [id]: true };
      try { writeUserStorage(STORAGE_KEY, JSON.stringify(next)); } catch { /* Server progress is authoritative. */ }
      setProgress(previous => ({ ...previous, [id]: true }));
      if (id === total) clearStudyCheckpoint("cpp");
      setSelected(id < total ? id + 1 : 0);
      startedAt.current = window.performance.now();
    } catch {
      setSaveError(true);
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
    }
  }

  return <div className="min-h-dvh bg-dark-400 text-stone-100">
    <header className="border-b border-white/5 bg-dark-300 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/learn" className="text-sm text-stone-400 hover:text-stone-100">← 학습 선택</Link>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-cyan-400">C++ · 시스템 · 네트워크</p>
            <h1 className="mt-1 text-3xl font-black">C++와 TCP/UDP {total}단계</h1>
            <p className="mt-2 text-sm text-stone-400">민재의 해안 통신소 복구 이야기 · 언어와 메모리부터 TCP/UDP 실습까지</p>
          </div>
          <p className="shrink-0 text-lg font-bold">{completed}/{total}</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-dark-100"><div className="h-full bg-cyan-500" style={{ width: `${completed / total * 100}%` }} /></div>
        {completed === total && <Link href="/csharp?step=1" className="mt-4 block rounded-xl border border-violet-700 bg-violet-950/30 px-4 py-3 text-sm font-bold text-violet-200 hover:border-violet-400">C++ 완료! 다음 과정 C# 시작하기 →</Link>}
        <div className="mt-4 flex flex-wrap gap-4 text-sm"><Link href="/cpp/lab" className="font-bold text-emerald-300 hover:underline">실행 가능한 TCP/UDP 실습 →</Link><Link href="/network" className="text-cyan-300 hover:underline">네트워크 심화 20단계 →</Link></div>
        {syncFailed && <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-800 bg-amber-950/20 px-4 py-3 text-sm text-amber-200"><span>서버 진도를 확인하거나 저장하지 못했습니다. 이 기기의 완료 기록은 유지됩니다.</span><button disabled={syncing} onClick={retrySync} className="rounded-lg border border-amber-700 px-3 py-1 disabled:opacity-50">{syncing ? "재시도 중..." : "다시 동기화"}</button></div>}
      </div>
    </header>

    {current ? <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <button onClick={() => openLesson(0)} className="text-sm text-stone-400 hover:text-stone-100">← 전체 목록</button>
      <StudyFlowBar phase={flow.phase} paused={flow.paused} onPause={flow.setPaused} onPhase={flow.changePhase}/>
      {!flow.paused && <>
      <article className="space-y-5 rounded-3xl bg-dark-200 p-5 sm:p-7">
        <div><p className="text-xs font-bold text-cyan-400">{current.section} · {current.id}/{total}</p><h2 className="mt-2 text-2xl font-black">{current.title}</h2></div>
        {flow.phase === "story" && scene && <section className="rounded-2xl border border-cyan-900/40 bg-cyan-950/20 p-5"><p className="text-xs font-bold text-cyan-300">이어지는 이야기 · 가상의 해안 통신소 · {chapter?.title}</p>{chapter?.start === current.id && <p className="mt-3 text-sm leading-8 text-stone-300">{chapter.introduction}</p>}{current.id > 1 && <p className="mt-3 rounded-xl bg-black/20 px-4 py-2 text-xs leading-6 text-cyan-200">앞 단계에서 민재가 배운 것: {CPP_CURRICULUM[current.id - 2].summary}</p>}<p className="mt-3 text-sm leading-8 text-stone-100">{scene.story}</p></section>}
        {flow.phase === "concept" && <>
        <section className="rounded-2xl bg-dark-100 p-5"><h3 className="font-bold text-cyan-300">이 장면을 실제 개념으로 풀어 읽기</h3><p className="mt-3 text-sm leading-7 text-stone-100">{current.summary}</p>{scene && <p className="mt-3 text-sm leading-7 text-stone-300">{scene.bridge}</p>}<p className="mt-3 text-xs leading-6 text-stone-500">통신소 사건은 가상입니다. C++의 실제 동작은 아래 코드와 실습 결과로 확인하세요.</p></section>
        <section className="rounded-2xl border border-sky-900/50 bg-sky-950/20 p-5"><h3 className="font-bold text-sky-300">처음 배우는 사람을 위한 풀이</h3><div className="mt-3 space-y-3 text-sm leading-7 text-stone-200">{CPP_EXPLANATIONS[current.id].map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div></section>
        {CPP_DEEP_LESSONS[current.id] && <section className="space-y-5 rounded-2xl border border-cyan-900/50 bg-cyan-950/10 p-5 text-sm leading-8 text-stone-200">
          <h3 className="text-lg font-bold text-cyan-200">이야기를 따라 더 깊게 이해하기</h3>
          {([['장면을 다시 따라가기', 'scene'], ['이 장면을 실제 개념으로 풀어 읽기', 'concept'], ['개발할 때는 이렇게 판단하기', 'development'], ['혼자 설명하고 확인하기', 'check']] as const).map(([title, key]) => <div key={key}><h4 className="font-bold text-stone-100">{title}</h4><p className="mt-1">{CPP_DEEP_LESSONS[current.id][key]}</p></div>)}
          <details className="rounded-xl border border-cyan-900/50 bg-black/20 p-4"><summary className="cursor-pointer font-bold text-cyan-200">내 답을 생각한 뒤 해설 보기</summary><p className="mt-3">{CPP_CHECK_ANSWERS[current.id]}</p></details>
          {current.id >= 15 && <Link href="/cpp/lab" className="inline-block font-bold text-cyan-300 hover:underline">TCP/UDP 전체 실행 프로젝트 보기 →</Link>}
        </section>}
        <ul className="space-y-2">{current.points.map(point => <li key={point} className="rounded-xl bg-dark-100 px-4 py-3 text-sm leading-6 text-stone-300">• {point}</li>)}</ul>
        <section><h3 className="mb-2 font-bold">{current.id === 1 ? "첫 프로그램 전체 코드" : "핵심 코드 조각"}</h3><pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/40 p-4 text-xs leading-6 text-emerald-300">{current.code}</pre></section>
        {current.id > 1 && <p className="text-xs leading-6 text-stone-400">이 코드는 개념을 보여 주는 일부입니다. 선언·헤더·main 함수 또는 플랫폼별 처리가 빠질 수 있어 그대로 붙여 넣어 실행하는 전체 프로그램은 아닙니다.</p>}
        {current.id === 1 && <FirstCppSteps />}
        <section><h3 className="mb-2 font-bold">직접 해보기</h3><p className="text-sm leading-6 text-stone-300">{current.exercise}</p></section>
        <aside className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm leading-6 text-amber-200"><strong>주의:</strong> {current.pitfall}</aside>
        </>}
        {flow.phase !== "practice" && <button onClick={() => flow.changePhase(flow.phase === "story" ? "concept" : "practice")} className="w-full rounded-xl bg-cyan-600 py-3 font-bold">{flow.phase === "story" ? "실제 개념 보기 →" : "확인 문제 풀기 →"}</button>}
      </article>
      {flow.phase === "practice" && <section className="rounded-3xl bg-dark-200 p-5 sm:p-7">
        <p className="text-xs font-bold text-cyan-400">확인 문제</p><h3 className="my-3 font-bold leading-7">{current.quiz.question}</h3>
        <div className="space-y-2">{current.quiz.options.map((option, index) => <button key={index} disabled={choice !== null} onClick={() => selectAnswer(index)} className={`block w-full rounded-xl border p-3 text-left text-sm ${choice === null ? "border-white/10 bg-dark-100 hover:border-cyan-700" : index === current.quiz.answer ? "border-emerald-700 bg-emerald-950/30 text-emerald-300" : index === choice ? "border-red-700 bg-red-950/30 text-red-300" : "border-white/5 text-stone-500"}`}>{index + 1}. {option}</button>)}</div>
        {choice !== null && <div className={`mt-4 rounded-xl p-4 text-sm leading-6 ${choice === current.quiz.answer ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>{choice === current.quiz.answer ? "정답입니다. " : "다시 풀어보세요. "}{current.quiz.explanation}{choice !== current.quiz.answer && <button className="mt-3 block rounded-lg border border-red-700 px-3 py-1" onClick={() => setChoice(null)}>다시 풀기</button>}</div>}
        {saveError && <p role="alert" className="mt-4 text-sm text-red-300">진도가 서버에 저장되지 않았습니다. 연결을 확인한 뒤 다시 눌러 주세요. 정답은 유지됩니다.</p>}
        <button disabled={choice !== current.quiz.answer || saving} onClick={finish} className="mt-4 w-full rounded-xl bg-cyan-600 py-3 font-bold disabled:opacity-30">{saving ? "저장 중..." : saveError ? "저장 다시 시도" : current.id === total ? "완료하고 목록으로" : "완료하고 다음 단계로"}</button>
      </section>}
      <div className="grid grid-cols-2 gap-3"><button disabled={current.id === 1 || saving} onClick={() => openLesson(current.id - 1)} className="rounded-xl bg-dark-200 py-3 disabled:opacity-30">← 이전</button><button disabled={current.id === total || saving} onClick={() => openLesson(current.id + 1)} className="rounded-xl bg-dark-200 py-3 disabled:opacity-30">다음 →</button></div>
      </>}
    </main> : <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_auto]"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="C++, TCP, UDP, 소켓 검색" className="rounded-xl border border-stone-700 bg-dark-200 px-4 py-3 text-sm outline-none focus:border-cyan-600"/><select value={section} onChange={event => setSection(event.target.value)} className="rounded-xl border border-stone-700 bg-dark-200 px-4 py-3 text-sm">{sections.map(name => <option key={name}>{name}</option>)}</select></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(lesson => <button key={lesson.id} onClick={() => openLesson(lesson.id)} className={`rounded-2xl border p-4 text-left hover:border-cyan-700 ${progress[lesson.id] ? "border-emerald-900 bg-emerald-950/15" : "border-white/5 bg-dark-200"}`}><p className={`text-xs font-bold ${progress[lesson.id] ? "text-emerald-400" : "text-cyan-400"}`}>{progress[lesson.id] ? "✓ " : ""}{lesson.id}단계 · {lesson.section}</p><h2 className="mt-2 font-bold">{lesson.title}</h2><p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-400">{lesson.summary}</p></button>)}</div>
    </main>}
  </div>;
}
