"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { api, EnglishPhrase, EnglishPhraseLevel } from "@/lib/api";

type Mode = "study" | "browse" | "done";
type Phase = "question" | "answer";

function speakEnglish(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function SoundButton({ text, label = "영어 발음 듣기" }: { text: string; label?: string }) {
  return (
    <button type="button" aria-label={label} title={label}
      onClick={(event) => { event.stopPropagation(); speakEnglish(text); }}
      className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-800/70 bg-blue-950/40 text-blue-300 transition-colors hover:border-blue-600 hover:bg-blue-900/50 hover:text-blue-100">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5Zm4.5 4.5a4 4 0 0 1 0 5m2.5-8a8 8 0 0 1 0 11" />
      </svg>
    </button>
  );
}

const LEVEL_LABELS: Record<number, string> = {
  1: "생존 표현",
  2: "일상 회화",
  3: "연결 표현",
  4: "실전 유창성",
  5: "업무 문제 해결",
  6: "뉘앙스와 완곡함",
  7: "논리와 스토리",
  8: "고급 토론",
  9: "전문적 정확성",
  10: "수사적 표현",
};

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export default function EnglishPhrasesPage() {
  const router = useRouter();
  const [levels, setLevels] = useState<EnglishPhraseLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [query, setQuery] = useState("");
  const [selectedFunction, setSelectedFunction] = useState("");
  const [items, setItems] = useState<EnglishPhrase[]>([]);
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [mode, setMode] = useState<Mode>("study");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ knew: 0, missed: 0 });

  const currentLevel = levels.find((level) => level.level === selectedLevel);
  const functions = useMemo(() => currentLevel?.functions ?? [], [currentLevel]);
  const current = items[index];

  const load = async (options?: { shuffled?: boolean; resetQuery?: boolean }) => {
    setLoading(true);
    try {
      const result = await api.englishPhrases.list({
        level: selectedLevel,
        q: options?.resetQuery ? undefined : query.trim() || undefined,
        function: selectedFunction || undefined,
        limit: 1000,
      });
      setItems(options?.shuffled ? shuffle(result.items) : result.items);
      setTotal(result.total);
      setIndex(0);
      setPhase("question");
      setResults({ knew: 0, missed: 0 });
      setMode("study");
      if (options?.resetQuery) setQuery("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.englishPhrases.levels().then(setLevels).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [selectedLevel, selectedFunction]);

  const selectLevel = (level: number) => {
    setSelectedLevel(level);
    setSelectedFunction("");
    setQuery("");
  };

  const answer = (knew: boolean) => {
    setResults((prev) => ({ knew: prev.knew + (knew ? 1 : 0), missed: prev.missed + (knew ? 0 : 1) }));
    const next = index + 1;
    if (next >= items.length) {
      setMode("done");
      return;
    }
    setIndex(next);
    setPhase("question");
  };

  const reshuffle = () => {
    setItems((prev) => shuffle(prev));
    setIndex(0);
    setPhase("question");
    setResults({ knew: 0, missed: 0 });
    setMode("study");
  };

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      <div className="px-5 pt-10 pb-4 bg-dark-300 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-all">
            ←
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-stone-100">영어 표현 암기</h1>
            <p className="text-xs text-stone-500 mt-1">왼쪽 모름 · 오른쪽 앎 · 단계별 1000개</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
            <button key={level} onClick={() => selectLevel(level)}
              className={`py-2 rounded-lg text-xs font-bold transition-colors ${selectedLevel === level ? "bg-blue-600 text-white" : "bg-dark-200 text-stone-500 hover:text-stone-300"}`}>
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 border-b border-white/5">
        <div className="bg-dark-200 border border-white/5 rounded-2xl px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-stone-100">Level {selectedLevel} · {currentLevel?.cefr ?? ""} · {LEVEL_LABELS[selectedLevel]}</p>
              <p className="text-xs text-stone-500 mt-1">{currentLevel?.level_title} · {total || currentLevel?.count || 1000}개</p>
            </div>
            <span className="text-xs text-blue-300 bg-blue-900/40 rounded-full px-2.5 py-1">{items.length ? `${index + 1}/${items.length}` : "0"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && load()}
            placeholder="표현, 뜻, 예문, 태그 검색..."
            className="min-w-0 w-full bg-dark-200 border border-stone-700 focus:border-blue-600 rounded-xl px-4 py-3 text-sm text-stone-200 placeholder-stone-600 outline-none"
          />
          <button onClick={() => load()} className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">
            검색
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <select value={selectedFunction} onChange={(event) => setSelectedFunction(event.target.value)}
            className="min-w-0 w-full bg-dark-200 border border-stone-700 focus:border-blue-600 rounded-xl px-4 py-3 text-sm text-stone-200 outline-none">
            <option value="">전체 기능</option>
            {functions.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
          </select>
          <button onClick={reshuffle} disabled={!items.length}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-dark-200 hover:bg-dark-100 border border-white/5 text-stone-300 text-sm font-semibold disabled:opacity-40">
            섞기
          </button>
          <button onClick={() => setMode((prev) => prev === "browse" ? "study" : "browse")} disabled={!items.length}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-dark-200 hover:bg-dark-100 border border-white/5 text-stone-300 text-sm font-semibold disabled:opacity-40">
            {mode === "browse" ? "카드" : "목록"}
          </button>
        </div>
      </div>

      {loading && <div className="flex-1 flex items-center justify-center text-sm text-stone-500">불러오는 중...</div>}
      {!loading && mode === "done" && <DoneScreen results={results} onRestart={reshuffle} onBrowse={() => setMode("browse")} />}
      {!loading && mode === "study" && current && (
        <PhraseStudyCard phrase={current} phase={phase} onReveal={() => setPhase("answer")} onAnswer={answer} />
      )}
      {!loading && mode === "browse" && <PhraseBrowse items={items} />}
      {!loading && !current && mode !== "browse" && mode !== "done" && (
        <div className="flex-1 flex items-center justify-center text-sm text-stone-500">결과가 없습니다.</div>
      )}
    </div>
  );
}

function PhraseStudyCard({ phrase, phase, onReveal, onAnswer }: {
  phrase: EnglishPhrase;
  phase: Phase;
  onReveal: () => void;
  onAnswer: (knew: boolean) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-15, 15]);
  const leftOpacity = useTransform(x, [-100, -25], [1, 0]);
  const rightOpacity = useTransform(x, [25, 100], [0, 1]);

  useEffect(() => () => window.speechSynthesis.cancel(), []);

  const dragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -90) {
      animate(x, -600, { duration: 0.2 });
      setTimeout(() => onAnswer(false), 180);
    } else if (info.offset.x > 90) {
      animate(x, 600, { duration: 0.2 });
      setTimeout(() => onAnswer(true), 180);
    } else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  };

  return (
    <div className="flex-1 flex flex-col px-4 py-5">
      <div className="relative flex-1 min-h-[430px]">
        <motion.div style={{ opacity: leftOpacity }} className="absolute inset-0 rounded-2xl border-2 border-jeok-500 bg-jeok-950/30 flex items-center justify-center">
          <span className="text-jeok-400 text-3xl font-black rotate-[12deg] border-4 border-jeok-500 px-4 py-1 rounded-xl">모름</span>
        </motion.div>
        <motion.div style={{ opacity: rightOpacity }} className="absolute inset-0 rounded-2xl border-2 border-green-500 bg-green-950/30 flex items-center justify-center">
          <span className="text-green-400 text-3xl font-black rotate-[-12deg] border-4 border-green-500 px-4 py-1 rounded-xl">앎</span>
        </motion.div>

        <motion.div
          role="button"
          tabIndex={0}
          drag="x"
          dragElastic={0.75}
          onDragEnd={dragEnd}
          onClick={() => phase === "question" && onReveal()}
          onKeyDown={(event) => {
            if (phase === "question" && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              onReveal();
            }
          }}
          style={{ x, rotate }}
          className="relative z-10 w-full h-full min-h-[430px] rounded-2xl bg-dark-200 border border-white/5 px-5 py-6 text-left active:cursor-grabbing"
        >
          {phase === "question" ? (
            <div className="h-full flex flex-col justify-center gap-5">
              <p className="text-xs text-yellow-400">{phrase.situation_ko}</p>
              <h2 className="text-2xl font-bold text-stone-100 leading-relaxed">{phrase.reverse_prompt_ko}</h2>
              <div className="rounded-xl bg-dark-100 px-4 py-3">
                <p className="text-xs text-stone-600 mb-1">빈칸 힌트</p>
                <p className="text-stone-300 text-sm">{phrase.cloze_prompt}</p>
              </div>
              <p className="text-xs text-stone-600 text-center">탭해서 답 보기</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-blue-300 mb-2">표현</p>
                <div className="flex items-start gap-3">
                  <h2 className="min-w-0 flex-1 text-3xl font-black text-stone-100 leading-tight">{phrase.expression}</h2>
                  <SoundButton text={phrase.expression} />
                </div>
                <p className="text-stone-300 text-sm mt-2">{phrase.meaning_ko}</p>
              </div>
              <Info label="끊어 외우기" value={phrase.memory_chunk} strong />
              <Info label="예문" value={phrase.example_en} strong />
              <Info label="대화" value={phrase.dialogue_en} />
              <Info label="암기 팁" value={phrase.memory_tip_ko} />
              <Info label="주의" value={phrase.confusion_note_ko} />
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4">
        <button onClick={() => onAnswer(false)} className="py-4 bg-dark-200 border border-jeok-800 hover:bg-jeok-950 text-jeok-400 rounded-2xl font-bold transition-all active:scale-95">
          ← 모름
        </button>
        <button onClick={() => onAnswer(true)} className="py-4 bg-dark-200 border border-green-900 hover:bg-green-950 text-green-400 rounded-2xl font-bold transition-all active:scale-95">
          앎 →
        </button>
      </div>
    </div>
  );
}

function PhraseBrowse({ items }: { items: EnglishPhrase[] }) {
  return (
    <div className="flex-1 px-4 py-4 overflow-y-auto space-y-3">
      {items.map((item) => (
        <article key={item.id} className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] text-blue-300 bg-blue-900/40 rounded-full px-2 py-0.5">L{item.level}</span>
            <span className="text-[11px] text-stone-400 bg-dark-100 rounded-full px-2 py-0.5">{item.function}</span>
            <span className="text-[11px] text-stone-500 bg-dark-100 rounded-full px-2 py-0.5">P{item.pattern_no}-{item.variation_no}</span>
          </div>
          <div className="flex items-start gap-3">
            <h2 className="min-w-0 flex-1 text-xl font-bold text-stone-100 leading-snug">{item.expression}</h2>
            <SoundButton text={item.expression} />
          </div>
          <p className="text-sm text-stone-300">{item.meaning_ko}</p>
          <Info label="예문" value={item.example_en} strong />
          <Info label="대화" value={item.dialogue_en} />
          <Info label="복습" value={item.review_steps_ko} />
        </article>
      ))}
    </div>
  );
}

function DoneScreen({ results, onRestart, onBrowse }: { results: { knew: number; missed: number }; onRestart: () => void; onBrowse: () => void }) {
  const total = results.knew + results.missed;
  const pct = total ? Math.round((results.knew / total) * 100) : 0;
  return (
    <div className="flex-1 flex flex-col justify-center px-5 gap-4">
      <div className="bg-dark-200 border border-white/5 rounded-2xl p-6 text-center">
        <p className="text-4xl font-black text-stone-100">{pct}%</p>
        <p className="text-sm text-stone-500 mt-1">앎 {results.knew}개 · 모름 {results.missed}개</p>
      </div>
      <button onClick={onRestart} className="py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold">섞어서 다시</button>
      <button onClick={onBrowse} className="py-4 rounded-2xl bg-dark-200 hover:bg-dark-100 border border-white/5 text-stone-300 font-bold">목록 보기</button>
    </div>
  );
}

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-dark-100 px-3 py-2">
      <p className="text-[11px] text-stone-600 mb-1">{label}</p>
      <p className={`text-xs leading-relaxed ${strong ? "text-stone-200" : "text-stone-400"}`}>{value}</p>
    </div>
  );
}
