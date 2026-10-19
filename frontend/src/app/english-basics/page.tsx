"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ENGLISH_CHAPTERS, reviewWords } from "./curriculum";
import { ENGLISH_EXPLANATIONS } from "./explanations";
import StudyProse from "@/components/StudyProse";

const same = (a: string, b: string) => a.trim().replace(/\s+/g, " ").toLowerCase().replace(/[.!?]$/, "") === b.trim().replace(/\s+/g, " ").toLowerCase().replace(/[.!?]$/, "");

export default function EnglishBasicsPage() {
  const [selected, setSelected] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [practicing, setPracticing] = useState(false);
  const [queue, setQueue] = useState<number[]>([]);
  const [cursor, setCursor] = useState(0);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sentence, setSentence] = useState("");
  const [sentenceChecked, setSentenceChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const step = Number(new URLSearchParams(window.location.search).get("step"));
    if (Number.isInteger(step) && step >= 1 && step <= ENGLISH_CHAPTERS.length) setSelected(step);
    api.learning.progress("english-basics").then(rows => {
      setCompleted(new Set(rows.filter(row => row.completed).map(row => Number(row.unit_id))));
    }).catch(() => setError("학습 기록을 불러오지 못했습니다. 새로고침 후 다시 시도하세요."));
  }, []);

  const chapter = selected ? ENGLISH_CHAPTERS[selected - 1] : undefined;
  const extra = selected ? ENGLISH_EXPLANATIONS[selected - 1] : undefined;
  const review = chapter ? reviewWords(selected) : [];
  const words = chapter ? [...review, ...chapter.words] : [];
  const active = queue[cursor];
  const recallDone = practicing && cursor >= queue.length;

  const open = (id: number) => {
    setSelected(id); setPracticing(false); setQueue([]); setCursor(0);
    setTyped(""); setFeedback(""); setSentence(""); setSentenceChecked(false); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const start = () => {
    setQueue(words.map((_, index) => index));
    setCursor(0); setTyped(""); setFeedback(""); setPracticing(true);
  };
  const checkWord = () => {
    if (active === undefined || !typed.trim() || feedback) return;
    const expected = words[active][0];
    if (same(typed, expected)) setFeedback("정확해요. 이 단어를 기억했습니다.");
    else {
      setQueue(previous => [...previous, active]);
      setFeedback(`다시 외워 보세요. 정답: ${expected}`);
    }
  };
  const nextWord = () => { setCursor(value => value + 1); setTyped(""); setFeedback(""); };
  const finish = async () => {
    if (!chapter || !recallDone || !sentenceChecked || saving) return;
    setSaving(true); setError("");
    try {
      await api.learning.complete("english-basics", String(chapter.id), {
        completed: true, score: 100, duration_minutes: 0, title: chapter.title,
      });
      setCompleted(previous => new Set(previous).add(chapter.id));
      open(chapter.id < ENGLISH_CHAPTERS.length ? chapter.id + 1 : 0);
    } catch {
      setError("저장에 실패했습니다. 답은 그대로 있으니 다시 눌러 주세요.");
    } finally { setSaving(false); }
  };

  return <div className="min-h-dvh bg-dark-400 text-stone-100">
    <header className="border-b border-white/5 bg-dark-300 px-4 py-6"><div className="mx-auto max-w-4xl">
      <Link href="/learn" className="text-sm text-stone-400 hover:text-white">← 학습 선택</Link>
      <h1 className="mt-3 text-3xl font-black">하린의 영어 교역문</h1>
      <p className="mt-2 text-sm leading-6 text-stone-400">영어를 처음부터 배우는 25장 연속 이야기 · 새 단어와 이전 장의 단어를 간격을 두고 뜻만 보고 다시 씁니다.</p>
      <p className="mt-2 text-sm font-bold text-blue-300">완료 {completed.size}/{ENGLISH_CHAPTERS.length}장</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-dark-100"><div className="h-full bg-blue-500" style={{width: `${completed.size / ENGLISH_CHAPTERS.length * 100}%`}} /></div>
    </div></header>
    {chapter ? <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <button onClick={() => open(0)} className="text-sm text-stone-400">← 전체 장 보기</button>
      <article className="space-y-5 rounded-3xl bg-dark-200 p-5 sm:p-7">
        <div><p className="text-xs font-bold text-blue-300">{chapter.id}/{ENGLISH_CHAPTERS.length}장 · 가상의 선협 이야기</p><h2 className="mt-2 text-2xl font-black">{chapter.title}</h2></div>
        <p className="whitespace-pre-line leading-8">{chapter.story}</p>
        <section className="rounded-2xl bg-dark-100 p-5"><h3 className="font-bold text-blue-300">이 장면을 실제 개념으로 풀어 읽기</h3><p className="mt-3 leading-7">{chapter.concept}</p><p className="mt-2 leading-7 text-stone-300">{chapter.sceneLink}</p><p className="mt-3 text-xs text-stone-500">하린과 교역문은 가상의 이야기입니다. 아래 영어 문장과 문법 설명은 실제 영어 학습 내용입니다.</p></section>
        {extra && <section className="space-y-4 rounded-2xl border border-white/10 bg-dark-100 p-5"><h3 className="font-bold text-blue-300">한 단어씩 차근차근 풀어 읽기</h3><StudyProse text={extra.walkthrough} className="leading-8"/><div className="border-t border-white/10 pt-4"><h4 className="text-sm font-bold text-blue-200">한 번 더, 다른 문장으로</h4><StudyProse text={extra.anotherLook} className="mt-2 leading-8 text-stone-300"/></div></section>}
        <section><h3 className="font-bold">입으로 세 번 읽기</h3><p className="mt-2 text-lg font-semibold text-blue-200">{chapter.example}</p><p className="mt-1 text-sm text-stone-400">{chapter.translation}</p></section>
        {!practicing && <section><h3 className="font-bold">오늘 외울 단어 · 소리 내어 읽고 뜻을 가려 보세요</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{chapter.words.map(([english, korean]) => <div key={english} className="rounded-xl bg-dark-100 px-3 py-2"><strong className="text-blue-200">{english}</strong><span className="ml-3 text-sm text-stone-400">{korean}</span></div>)}</div>{review.length > 0 && <p className="mt-3 text-xs text-stone-400">입력 연습에는 이전 장의 단어도 간격을 두고 다시 나옵니다.</p>}<button onClick={start} className="mt-4 rounded-xl bg-blue-600 px-5 py-3 font-bold">단어 가리고 직접 쓰기</button></section>}
      </article>
      {practicing && <section className="rounded-3xl bg-dark-200 p-5 sm:p-7">
        {!recallDone && active !== undefined ? <><p className="text-xs font-bold text-blue-300">뜻 → 영어 철자 · {cursor + 1}/{queue.length}</p><h3 className="mt-3 text-xl font-bold">{words[active][1]}</h3><form className="mt-3 flex gap-2" onSubmit={event => {event.preventDefault(); checkWord();}}><input autoComplete="off" aria-label="영어 단어 입력" value={typed} onChange={event => setTyped(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-stone-700 bg-dark-100 p-3 outline-none focus:border-blue-500" placeholder="영어 단어를 써 보세요"/><button disabled={!typed.trim() || !!feedback} className="rounded-xl bg-blue-600 px-4 font-bold disabled:opacity-40">확인</button></form>{feedback && <div className="mt-3"><p role="status" className="text-sm text-blue-200">{feedback}</p><button onClick={nextWord} className="mt-2 rounded-xl bg-dark-100 px-4 py-2">다음 단어 →</button></div>}</> : <><h3 className="font-bold text-emerald-300">모든 단어를 다시 떠올렸어요</h3><p className="mt-2 leading-7 text-stone-300">{chapter.question}</p><input value={sentence} onChange={event => {setSentence(event.target.value); setSentenceChecked(false);}} className="mt-3 w-full rounded-xl border border-stone-700 bg-dark-100 p-3 outline-none focus:border-blue-500" placeholder="영어 문장을 직접 써 보세요"/><button disabled={sentence.trim().length < 5} onClick={() => setSentenceChecked(true)} className="mt-2 rounded-xl border border-blue-700 px-4 py-2 text-blue-200 disabled:opacity-40">예시 답안과 비교</button>{sentenceChecked && <div className="mt-3 rounded-xl bg-dark-100 p-4 text-sm leading-7"><p>예시 답안: <strong className="text-blue-200">{chapter.answer}</strong></p><p>{same(sentence, chapter.answer) ? "정확히 썼어요." : "다른 표현도 가능해요. 주어·동사·뜻이 맞는지 비교하고 필요하면 다시 고쳐 쓰세요."}</p></div>}</>}
        {error && <p role="alert" className="mt-3 text-sm text-amber-300">{error}</p>}
        {recallDone && <button disabled={!sentenceChecked || saving} onClick={finish} className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-bold disabled:opacity-40">{saving ? "저장 중..." : "이 장 완료하고 다음 장으로"}</button>}
      </section>}
      <div className="grid grid-cols-2 gap-3"><button disabled={chapter.id === 1} onClick={() => open(chapter.id - 1)} className="rounded-xl bg-dark-200 py-3 disabled:opacity-30">← 이전 장</button><button disabled={chapter.id === ENGLISH_CHAPTERS.length} onClick={() => open(chapter.id + 1)} className="rounded-xl bg-dark-200 py-3 disabled:opacity-30">다음 장 →</button></div>
      {chapter.id === ENGLISH_CHAPTERS.length && <section className="rounded-2xl bg-dark-200 p-5 text-sm leading-7"><h3 className="font-bold text-blue-300">이야기 없이 설명해 보기</h3><p className="mt-2">서술형 답안 예시: 기본 영어 문장은 보통 주어 뒤에 동사가 온다. I am ready는 상태, I check the door는 행동이다. 어제 한 행동은 I checked the door처럼 과거형을 쓰고, 내일의 계획은 I am going to check the door처럼 표현할 수 있다.</p><p className="mt-2">복습 문제: I am과 she is는 왜 다를까? a key와 the key는 언제 달라질까? Do you like ...?와 Are you ready?의 문장 구조는 어떻게 다를까?</p></section>}
    </main> : <main className="mx-auto max-w-4xl px-4 py-6">{error && <p role="alert" className="mb-4 text-amber-300">{error}</p>}<p className="mb-5 text-sm leading-6 text-stone-400">1장부터 읽으면 앞 사건이 다음 장으로 이어집니다. 완료한 장도 다시 열어 단어를 복습할 수 있어요.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{ENGLISH_CHAPTERS.map(item => <button key={item.id} onClick={() => open(item.id)} className={`rounded-2xl border p-4 text-left ${completed.has(item.id) ? "border-emerald-800 bg-emerald-950/15" : "border-white/5 bg-dark-200"}`}><p className="text-xs text-blue-300">{item.id}장 {completed.has(item.id) ? "· 완료" : ""}</p><h2 className="mt-2 font-bold">{item.title}</h2><p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-400">{item.story}</p></button>)}</div><Link href="/words?en=A1" className="mt-5 inline-block text-sm text-blue-300 underline">A1 단어 카드도 복습하기 →</Link></main>}
  </div>;
}
