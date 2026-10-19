"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { RUST_CURRICULUM } from "./curriculum";
import { RUST_STORY } from "./story";
import { RUST_EXPLANATIONS } from "./explanations";
import StudyProse from "@/components/StudyProse";
import { PYTHON_BRIDGES } from "./pythonBridges";
import StudyFlowBar from "@/components/StudyFlowBar";
import { useStudyFlow } from "@/lib/useStudyFlow";
import { clearStudyCheckpoint } from "@/lib/studyCheckpoint";

const total = RUST_CURRICULUM.length;

export default function RustPage() {
  const [selected, setSelected] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("전체");

  useEffect(() => {
    const step = Number(new URLSearchParams(window.location.search).get("step"));
    if (Number.isInteger(step) && step >= 1 && step <= total) setSelected(step);
    api.learning.progress("rust").then((rows) => {
      setCompleted(new Set(rows.filter((row) => row.completed).map((row) => Number(row.unit_id))));
    }).catch(() => setError("진도를 불러오지 못했습니다. 새로고침하여 다시 시도하세요.")).finally(() => setLoading(false));
  }, []);

  const current = selected ? RUST_CURRICULUM[selected - 1] : undefined;
  const flow = useStudyFlow("rust", selected, current?.title ?? "", { answer: "", revealed: false });
  const myAnswer = flow.draft.answer;
  const revealed = flow.draft.revealed;
  const scene = selected ? RUST_STORY[selected - 1] : undefined;
  const extra = selected ? RUST_EXPLANATIONS[selected - 1] : undefined;
  const pythonBridge = selected ? PYTHON_BRIDGES.find((bridge) => bridge.id === selected) : undefined;
  const sections = ["전체", ...new Set(RUST_CURRICULUM.map((lesson) => lesson.section))];
  const filtered = useMemo(() => RUST_CURRICULUM.filter((lesson) =>
    (section === "전체" || lesson.section === section) &&
    `${lesson.title} ${lesson.idea} ${lesson.detail}`.toLowerCase().includes(query.toLowerCase())
  ), [query, section]);

  const open = (id: number) => {
    setSelected(id);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finish = async () => {
    if (!current || !revealed || myAnswer.trim().length < 8 || saving) return;
    setSaving(true);
    setError("");
    try {
      await api.learning.complete("rust", String(current.id), {
        completed: true, score: 100, duration_minutes: 0, title: current.title,
      });
      setCompleted((before) => new Set(before).add(current.id));
      if (current.id === total) clearStudyCheckpoint("rust");
      open(current.id < total ? current.id + 1 : 0);
    } catch {
      setError("진도를 저장하지 못했습니다. 입력한 답은 유지되니 다시 눌러 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="min-h-dvh bg-dark-400 text-stone-100">
    <header className="border-b border-white/5 bg-dark-300 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/learn" className="text-sm text-stone-400 hover:text-stone-100">← 학습 선택</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold text-orange-400">Rust · 기초부터 시스템 실습까지</p><h1 className="mt-1 text-3xl font-black">Rust {total}단계</h1><p className="mt-2 text-sm text-stone-400">한 개념씩 읽고, 코드 실행, 직접 설명, 다음 단계</p></div>
          <p className="text-lg font-bold">{loading ? "불러오는 중" : `${completed.size}/${total}`}</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-dark-100"><div className="h-full bg-orange-500" style={{ width: `${completed.size / total * 100}%` }} /></div>
        <p className="mt-3 text-xs text-stone-500">코드는 로컬 Cargo 프로젝트에서 실행하세요. 브라우저에서 코드를 실행하지 않습니다.</p>
        <a href="https://doc.rust-lang.org/book/" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-orange-300 underline">Rust 공식 책 참고 ↗</a>
      </div>
    </header>

    {current ? <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <button onClick={() => open(0)} className="text-sm text-stone-400 hover:text-stone-100">← 전체 목록</button>
      <StudyFlowBar phase={flow.phase} paused={flow.paused} onPause={flow.setPaused} onPhase={flow.changePhase}/>
      {!flow.paused && <>
      <article className="space-y-5 rounded-3xl bg-dark-200 p-5 sm:p-7">
        <div><p className="text-xs font-bold text-orange-400">{current.section} · {current.id}/{total}</p><h2 className="mt-2 text-2xl font-black">{current.title}</h2></div>
        {flow.phase === "story" && scene && <section className="rounded-2xl border border-orange-900/40 bg-orange-950/20 p-5"><p className="text-xs font-bold text-orange-300">이어지는 이야기 · 가상의 선협 세계</p><p className="mt-3 whitespace-pre-line leading-8 text-stone-100">{scene.story}</p></section>}
        {flow.phase === "concept" && <>
        <section className="rounded-2xl bg-dark-100 p-5"><h3 className="font-bold text-orange-300">이 장면을 실제 개념으로 풀어 읽기</h3><p className="mt-3 leading-7 text-stone-100">{current.idea}</p><p className="mt-2 leading-7 text-stone-300">{current.detail}</p>{scene && <p className="mt-3 leading-7 text-stone-300">{scene.bridge}</p>}<p className="mt-3 text-xs leading-6 text-stone-500">이야기 속 부적과 결계는 기억을 돕는 비유입니다. 실제 Rust의 동작은 아래 코드와 컴파일 결과로 확인하세요.</p></section>
        {extra && <section className="space-y-4 rounded-2xl border border-white/10 bg-dark-100 p-5"><h3 className="font-bold text-orange-300">처음 배우는 사람을 위한 자세한 풀이</h3><StudyProse text={extra.walkthrough} className="leading-8 text-stone-100"/><div className="border-t border-white/10 pt-4"><h4 className="text-sm font-bold text-orange-200">다른 예와 헷갈리는 부분</h4><StudyProse text={extra.anotherLook} className="mt-2 leading-8 text-stone-300"/></div></section>}
        {pythonBridge && <section className="rounded-2xl border border-white/10 bg-dark-100 p-5"><h3 className="font-bold text-orange-300">Python으로 본 적이 있다면</h3><p className="mt-1 text-xs text-stone-500">두 언어의 모양을 비교하는 코드 조각입니다. 동작 규칙까지 같다는 뜻은 아닙니다.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="mb-2 text-xs font-bold text-blue-300">Python</p><pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/40 p-3 text-xs leading-6 text-stone-200">{pythonBridge.python}</pre></div><div><p className="mb-2 text-xs font-bold text-orange-300">Rust</p><pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/40 p-3 text-xs leading-6 text-stone-200">{pythonBridge.rust}</pre></div></div><StudyProse text={pythonBridge.explanation} className="mt-3 text-sm leading-7 text-stone-300"/></section>}
        <section><h3 className="font-bold">직접 실행할 코드</h3><pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/40 p-4 text-sm leading-6 text-emerald-300">{current.code}</pre></section>
        <section><h3 className="font-bold">손으로 바꿔 보기</h3><p className="mt-2 text-sm leading-7 text-stone-300">{current.tryIt}</p></section>
        </>}
        {flow.phase !== "practice" && <button onClick={() => flow.changePhase(flow.phase === "story" ? "concept" : "practice")} className="w-full rounded-xl bg-orange-600 py-3 font-bold">{flow.phase === "story" ? "실제 개념 보기 →" : "직접 설명하기 →"}</button>}
      </article>
      {flow.phase === "practice" && <section className="rounded-3xl bg-dark-200 p-5 sm:p-7">
        <p className="text-xs font-bold text-orange-400">가리고 설명하기</p>
        <h3 className="mt-2 font-bold leading-7">{current.check}</h3>
        <textarea value={myAnswer} onChange={(event) => flow.setDraft(previous => ({...previous, answer: event.target.value}))} rows={3} placeholder="답을 보지 않고 자기 말로 먼저 설명해 보세요." className="mt-3 w-full rounded-xl border border-stone-700 bg-dark-100 p-3 text-sm outline-none focus:border-orange-500" />
        <button onClick={() => flow.setDraft(previous => ({...previous, revealed: true}))} disabled={myAnswer.trim().length < 8} className="mt-2 rounded-xl border border-orange-700 px-4 py-2 text-sm text-orange-300 disabled:opacity-40">설명 비교하기</button>
        {revealed && <div className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/20 p-4 text-sm leading-7"><strong className="text-emerald-300">확인할 핵심:</strong> {current.answer}<p className="mt-2 text-stone-400">내 설명과 다르면 위 코드와 설명을 다시 보고 고쳐 적어도 됩니다.</p></div>}
        {error && <p role="alert" className="mt-3 text-sm text-amber-300">{error}</p>}
        <button onClick={finish} disabled={!revealed || myAnswer.trim().length < 8 || saving} className="mt-4 w-full rounded-xl bg-orange-600 py-3 font-bold disabled:opacity-40">{saving ? "진도 저장 중..." : current.id === total ? "완료하고 목록으로" : "이해 확인하고 다음 단계로"}</button>
      </section>}
      <div className="grid grid-cols-2 gap-3"><button disabled={current.id === 1} onClick={() => open(current.id - 1)} className="rounded-xl bg-dark-200 py-3 disabled:opacity-30">← 이전</button><button disabled={current.id === total} onClick={() => open(current.id + 1)} className="rounded-xl bg-dark-200 py-3 disabled:opacity-30">다음 →</button></div>
      {current.id === total && <section className="rounded-2xl bg-dark-200 p-5 text-sm leading-7 text-stone-300"><h3 className="font-bold text-orange-300">이야기 없이 설명해 보기</h3><p className="mt-2">서술형 답안 예시: Rust의 소유권은 한 값의 정리 책임을 한 소유자에게 두고, 이동하면 이전 바인딩을 사용하지 못하게 하는 규칙이다. 읽기만 필요할 때는 불변 참조로 빌리고, 수정할 때는 겹치지 않는 가변 참조를 쓴다. TCP는 바이트 스트림이므로 애플리케이션이 메시지 경계를 정해야 하며, UDP는 데이터그램이지만 전달과 순서를 보장하지 않는다.</p><p className="mt-2">복습 문제: `String`을 함수에 넘긴 뒤 원본을 다시 쓰려면 어떤 방법이 있을까? `Option`과 `Result`는 각각 언제 쓸까? TCP에서 `read` 한 번이 메시지 한 개가 아닌 이유는 무엇일까?</p></section>}
      </>}
    </main> : <main className="mx-auto max-w-5xl px-4 py-6">
      {error && <p role="alert" className="mb-4 text-sm text-amber-300">{error}</p>}
      <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_auto]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="소유권, Option, TCP 등 검색" className="rounded-xl border border-stone-700 bg-dark-200 px-4 py-3 text-sm outline-none focus:border-orange-500"/><select value={section} onChange={(event) => setSection(event.target.value)} className="rounded-xl border border-stone-700 bg-dark-200 px-4 py-3 text-sm">{sections.map((name) => <option key={name}>{name}</option>)}</select></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((lesson) => <button key={lesson.id} onClick={() => open(lesson.id)} className={`rounded-2xl border p-4 text-left hover:border-orange-600 ${completed.has(lesson.id) ? "border-emerald-900 bg-emerald-950/15" : "border-white/5 bg-dark-200"}`}><p className={`text-xs font-bold ${completed.has(lesson.id) ? "text-emerald-400" : "text-orange-400"}`}>{completed.has(lesson.id) ? "✓ " : ""}{lesson.id}단계 · {lesson.section}</p><h2 className="mt-2 font-bold">{lesson.title}</h2><p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-400">{lesson.idea}</p></button>)}</div>
    </main>}
  </div>;
}
