"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import StudyFlowBar from "@/components/StudyFlowBar";
import { useStudyFlow } from "@/lib/useStudyFlow";
import { clearStudyCheckpoint } from "@/lib/studyCheckpoint";
import { CSHARP_CURRICULUM } from "./curriculum";
import StudyText from "@/components/StudyText";
import StudyDiagram from "@/components/StudyDiagram";
import { isDailyFocus } from "@/lib/dailyFocusMarker";

const total = CSHARP_CURRICULUM.length;

export default function CSharpPage() {
  const [selected, setSelected] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [cppCompleted, setCppCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = window.performance.now();
    const step = Number(new URLSearchParams(window.location.search).get("step"));
    if (Number.isInteger(step) && step >= 1 && step <= total) setSelected(step);
    Promise.all([api.learning.progress("csharp"), api.learning.progress("cpp")]).then(([csharp, cpp]) => {
      setCompleted(new Set(csharp.filter(row => row.completed).map(row => Number(row.unit_id))));
      setCppCompleted(new Set(cpp.filter(row => row.completed).map(row => Number(row.unit_id))).size >= 40);
    }).catch(() => setError("진도를 불러오지 못했습니다. 새로고침하여 다시 시도하세요.")).finally(() => setLoading(false));
  }, []);

  const current = selected ? CSHARP_CURRICULUM[selected - 1] : undefined;
  const flow = useStudyFlow("csharp", selected, current?.title ?? "", { choice: null as number | null });
  const choice = flow.draft.choice;
  const filtered = useMemo(() => CSHARP_CURRICULUM.filter(lesson =>
    `${lesson.title} ${lesson.section} ${lesson.concept}`.toLowerCase().includes(query.toLowerCase())
  ), [query]);

  function open(id: number) {
    if (saving) return;
    setSelected(id);
    setError("");
    startedAt.current = window.performance.now();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function answer(index: number) {
    if (!current || choice !== null) return;
    flow.setDraft({ choice: index });
    if (index !== current.quiz.answer) api.learning.addMistake({
      subject: "csharp", item_key: `lesson-${current.id}`, question: current.quiz.question,
      correct_answer: current.quiz.options[current.quiz.answer], user_answer: current.quiz.options[index],
      explanation: current.quiz.explanation,
    }).catch(() => {});
  }

  async function finish() {
    if (!current || choice !== current.quiz.answer || saving) return;
    setSaving(true);
    setError("");
    const id = current.id;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      await api.learning.complete("csharp", String(id), {
        completed: true, score: 100,
        duration_minutes: Math.floor((window.performance.now() - startedAt.current) / 60_000), title: current.title, daily_focus: isDailyFocus("csharp", id),
      }, controller.signal);
      setCompleted(previous => new Set(previous).add(id));
      if (id === total) clearStudyCheckpoint("csharp");
      setSelected(id < total ? id + 1 : 0);
      startedAt.current = window.performance.now();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("서버에 진도를 저장하지 못했습니다. 정답은 유지됩니다. 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
    }
  }

  return <div className="min-h-dvh bg-dark-400 text-stone-100">
    <header className="border-b border-white/5 bg-dark-300 px-4 py-6"><div className="mx-auto max-w-5xl">
      <Link href="/learn" className="text-sm text-stone-400 hover:text-stone-100">← 학습 선택</Link>
      <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold text-violet-300">C++ 다음 과정 · 유나의 기록관</p><h1 className="mt-1 text-3xl font-black">C# {total}단계</h1><p className="mt-2 text-sm leading-6 text-stone-400">C++에서 배운 타입·수명·네트워크를 발판으로 .NET과 웹 API까지 이어갑니다.</p></div><span className="font-bold">{loading ? "불러오는 중" : `${completed.size}/${total}`}</span></div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-dark-100"><div className="h-full bg-violet-500" style={{ width: `${completed.size / total * 100}%` }}/></div>
      {!loading && !cppCompleted && <p className="mt-3 text-xs text-amber-300">C++ 40단계를 마친 뒤 시작하도록 구성했습니다. 먼저 둘러볼 수도 있습니다.</p>}
    </div></header>
    {current ? <main className="study-lesson mx-auto max-w-3xl space-y-5 px-4 py-6" data-study="csharp">
      <button onClick={() => open(0)} className="text-sm text-stone-400 hover:text-stone-100">← 전체 목록</button>
      <StudyFlowBar phase={flow.phase} paused={flow.paused} onPause={flow.setPaused} onPhase={flow.changePhase}/>
      {!flow.paused && <>
        <article className="space-y-5 rounded-3xl bg-dark-200 p-5 sm:p-7">
          <div><p className="text-xs font-bold text-violet-300">{current.section} · {current.id}/{total}</p><h2 className="mt-2 text-2xl font-black">{current.title}</h2></div>
          {flow.phase === "story" && <section className="rounded-2xl border border-violet-900/50 bg-violet-950/20 p-5"><h3 className="font-bold text-violet-200">이어지는 이야기 · 유나의 기록관</h3>{current.id > 1 && <p className="mt-3 text-xs leading-6 text-violet-300">앞 단계: {CSHARP_CURRICULUM[current.id - 2].title}</p>}<p className="study-reading mt-3"><StudyText subject="csharp" text={current.story}/></p><p className="mt-3 text-xs leading-6 text-stone-400">기록관은 가상 배경입니다. 실제 C# 규칙은 다음 화면에서 코드와 함께 확인하세요.</p></section>}
          {flow.phase === "concept" && <>
            <section className="rounded-2xl bg-dark-100 p-5"><h3 className="font-bold text-violet-200">이 장면을 실제 개념으로 풀어 읽기</h3><p className="study-reading mt-3 text-stone-200"><StudyText subject="csharp" text={current.concept}/></p></section>
            <StudyDiagram subject="csharp" step={current.id}/>
            {current.id === 1 && <section className="rounded-2xl border border-violet-900/50 bg-violet-950/20 p-5 text-sm leading-7"><h3 className="font-bold text-violet-200">정말 처음이라면: 실행 순서</h3><p className="mt-2">먼저 <a href="https://dotnet.microsoft.com/download" target="_blank" rel="noopener noreferrer" className="text-violet-300 underline">공식 .NET SDK</a>를 설치하고 터미널을 새로 여세요. 아래 명령은 Windows PowerShell이나 macOS/Linux 터미널에서 한 줄씩 입력합니다. C++의 g++는 사용하지 않습니다.</p><pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 text-xs leading-6 text-emerald-300">{"dotnet --version\nmkdir csharp-first\ncd csharp-first\ndotnet new console"}</pre><p className="mt-3"><code>dotnet --version</code>은 SDK 확인, <code>mkdir</code>은 폴더 만들기, <code>cd</code>는 그 폴더로 이동, <code>dotnet new console</code>은 콘솔 프로젝트 만들기입니다. 만들어진 <code>Program.cs</code>를 아래 코드로 바꾸고 저장한 뒤 실행하세요.</p><pre className="mt-3 rounded-xl bg-black/40 p-4 text-xs text-emerald-300">dotnet run</pre><p className="mt-3">명령을 찾을 수 없다면 SDK 설치 또는 터미널 경로를 확인하세요. <code>Program.cs</code>가 있는 프로젝트 폴더에서 <code>dotnet run</code>을 실행해야 합니다. C# 공식 <a href="https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/tutorials/hello-world" target="_blank" rel="noopener noreferrer" className="text-violet-300 underline">첫 프로그램 설명</a>도 참고할 수 있습니다.</p></section>}
            <section><h3 className="mb-2 font-bold">{current.id === 1 ? "Program.cs 전체 내용" : "코드로 확인하기"}</h3><pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/40 p-4 text-xs leading-6 text-emerald-300">{current.code}</pre>{current.id > 1 && <p className="mt-2 text-xs leading-6 text-stone-400">앞 단계의 콘솔 프로젝트 Program.cs에 넣어 보는 예제입니다. 일부 단계는 별도 프로젝트나 추가 맥락이 필요하므로 아래 실습 안내를 먼저 읽으세요.</p>}</section>
            <section className="rounded-xl border border-white/10 p-4"><h3 className="font-bold">직접 해 보기</h3><p className="study-reading mt-2 text-stone-300"><StudyText subject="csharp" text={current.practice}/></p></section>
          </>}
          {flow.phase !== "practice" && <button onClick={() => flow.changePhase(flow.phase === "story" ? "concept" : "practice")} className="w-full rounded-xl bg-violet-600 py-3 font-bold">{flow.phase === "story" ? "개념과 코드 보기 →" : "확인 문제 풀기 →"}</button>}
        </article>
        {flow.phase === "practice" && <section className="rounded-3xl bg-dark-200 p-5 sm:p-7"><p className="text-xs font-bold text-violet-300">확인 문제</p><h3 className="my-3 font-bold leading-7">{current.quiz.question}</h3><div className="space-y-2">{current.quiz.options.map((option, index) => <button key={option} disabled={choice !== null} onClick={() => answer(index)} className={`block w-full rounded-xl border p-3 text-left text-sm ${choice === null ? "border-white/10 bg-dark-100 hover:border-violet-700" : index === current.quiz.answer ? "border-emerald-700 bg-emerald-950/30 text-emerald-300" : index === choice ? "border-red-700 bg-red-950/30 text-red-300" : "border-white/5 text-stone-500"}`}>{index + 1}. {option}</button>)}</div>{choice !== null && <p className="mt-4 rounded-xl bg-dark-100 p-4 text-sm leading-7">{choice === current.quiz.answer ? "정답입니다. " : "다시 골라 보세요. "}{current.quiz.explanation}{choice !== current.quiz.answer && <button onClick={() => flow.setDraft({ choice: null })} className="mt-3 block rounded-lg border border-violet-700 px-3 py-1">다시 풀기</button>}</p>}{error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}<button disabled={choice !== current.quiz.answer || saving} onClick={finish} className="mt-4 w-full rounded-xl bg-violet-600 py-3 font-bold disabled:opacity-40">{saving ? "저장 중..." : error ? "저장 다시 시도" : current.id === total ? "완료하고 목록으로" : "완료하고 다음 단계로"}</button></section>}
        <div className="grid grid-cols-2 gap-3"><button disabled={current.id === 1 || saving} onClick={() => open(current.id - 1)} className="rounded-xl bg-dark-200 py-3 disabled:opacity-40">← 이전</button><button disabled={current.id === total || saving} onClick={() => open(current.id + 1)} className="rounded-xl bg-dark-200 py-3 disabled:opacity-40">다음 →</button></div>
      </>}
    </main> : <main className="mx-auto max-w-5xl px-4 py-6"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="C# 개념 검색" className="mb-5 w-full rounded-xl border border-white/10 bg-dark-200 px-4 py-3 text-sm outline-none focus:border-violet-600"/>{error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}{completed.size === total && <p className="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/20 p-4 text-sm text-emerald-300">C# 20단계를 완료했습니다. 필요한 단계를 다시 열어 복습할 수 있습니다.</p>}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(item => <button key={item.id} onClick={() => open(item.id)} className={`rounded-2xl border p-4 text-left hover:border-violet-600 ${completed.has(item.id) ? "border-emerald-900 bg-emerald-950/15" : "border-white/5 bg-dark-200"}`}><p className="text-xs font-bold text-violet-300">{completed.has(item.id) ? "✓ " : ""}{item.id}단계 · {item.section}</p><h2 className="mt-2 font-bold">{item.title}</h2><p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-400">{item.story}</p></button>)}</div></main>}
  </div>;
}
