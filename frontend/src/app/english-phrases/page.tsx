"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, EnglishPhrase, EnglishPhraseLevel } from "@/lib/api";

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

export default function EnglishPhrasesPage() {
  const router = useRouter();
  const [levels, setLevels] = useState<EnglishPhraseLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [query, setQuery] = useState("");
  const [selectedFunction, setSelectedFunction] = useState("");
  const [items, setItems] = useState<EnglishPhrase[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 100;

  const currentLevel = levels.find((level) => level.level === selectedLevel);
  const functions = useMemo(() => currentLevel?.functions ?? [], [currentLevel]);

  const load = async (nextOffset = 0) => {
    setLoading(true);
    try {
      const result = await api.englishPhrases.list({
        level: selectedLevel,
        q: query.trim() || undefined,
        function: selectedFunction || undefined,
        limit,
        offset: nextOffset,
      });
      setItems(result.items);
      setTotal(result.total);
      setOffset(result.offset);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.englishPhrases.levels().then(setLevels).catch(() => {});
  }, []);

  useEffect(() => {
    load(0);
  }, [selectedLevel, selectedFunction]);

  const selectLevel = (level: number) => {
    setSelectedLevel(level);
    setSelectedFunction("");
    setQuery("");
  };

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      <div className="px-6 pt-10 pb-5 bg-dark-300 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-all"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold text-stone-100">영어 표현 암기</h1>
            <p className="text-xs text-stone-500 mt-1">10단계 · 단계별 1000개 · 예문/빈칸/대화 포함</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
            <button
              key={level}
              onClick={() => selectLevel(level)}
              className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                selectedLevel === level
                  ? "bg-blue-600 text-white"
                  : "bg-dark-200 text-stone-500 hover:text-stone-300"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 border-b border-white/5 bg-dark-400">
        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-stone-100">
                Level {selectedLevel} · {currentLevel?.cefr ?? ""} · {LEVEL_LABELS[selectedLevel]}
              </p>
              <p className="text-xs text-stone-500 mt-1">{currentLevel?.level_title} · {currentLevel?.count ?? 1000}개</p>
            </div>
            <span className="text-xs text-blue-300 bg-blue-900/40 rounded-full px-2.5 py-1">
              결과 {total}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && load(0)}
            placeholder="표현, 뜻, 예문, 태그 검색..."
            className="flex-1 bg-dark-200 border border-stone-700 focus:border-blue-600 rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none"
          />
          <button
            onClick={() => load(0)}
            className="px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
          >
            검색
          </button>
        </div>

        <select
          value={selectedFunction}
          onChange={(event) => setSelectedFunction(event.target.value)}
          className="w-full bg-dark-200 border border-stone-700 focus:border-blue-600 rounded-xl px-4 py-2.5 text-sm text-stone-200 outline-none"
        >
          <option value="">전체 기능</option>
          {functions.map((fn) => (
            <option key={fn} value={fn}>{fn}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 px-4 py-4 overflow-y-auto space-y-3">
        {loading && (
          <div className="text-center text-sm text-stone-500 py-8">불러오는 중...</div>
        )}

        {!loading && items.map((item) => (
          <article key={item.id} className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="text-[11px] text-blue-300 bg-blue-900/40 rounded-full px-2 py-0.5">L{item.level}</span>
                  <span className="text-[11px] text-stone-400 bg-dark-100 rounded-full px-2 py-0.5">{item.function}</span>
                  <span className="text-[11px] text-stone-500 bg-dark-100 rounded-full px-2 py-0.5">P{item.pattern_no}-{item.variation_no}</span>
                </div>
                <h2 className="text-xl font-bold text-stone-100 leading-snug">{item.expression}</h2>
                <p className="text-sm text-stone-300 mt-1">{item.meaning_ko}</p>
              </div>
            </div>

            <div className="grid gap-2 text-xs">
              <Info label="끊어 외우기" value={item.memory_chunk} strong />
              <Info label="빈칸" value={item.cloze_prompt} />
              <Info label="예문" value={item.example_en} strong />
              <Info label="예문 뜻" value={item.example_ko} />
              <Info label="대화" value={item.dialogue_en} strong />
              <Info label="대화 뜻" value={item.dialogue_ko} />
              <Info label="암기 팁" value={item.memory_tip_ko} />
              <Info label="주의" value={item.confusion_note_ko} />
            </div>

            <div className="border-t border-white/5 pt-3 space-y-1">
              <p className="text-xs text-yellow-400">{item.reverse_prompt_ko}</p>
              <p className="text-xs text-stone-600">{item.tags}</p>
            </div>
          </article>
        ))}

        {!loading && items.length === 0 && (
          <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-8 text-center text-sm text-stone-500">
            결과가 없습니다.
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-dark-300 border-t border-white/5 grid grid-cols-2 gap-2">
        <button
          onClick={() => load(Math.max(0, offset - limit))}
          disabled={offset === 0 || loading}
          className="py-3 rounded-xl bg-dark-200 text-stone-400 text-sm font-semibold disabled:opacity-40"
        >
          이전
        </button>
        <button
          onClick={() => load(offset + limit)}
          disabled={offset + limit >= total || loading}
          className="py-3 rounded-xl bg-dark-200 text-stone-400 text-sm font-semibold disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  );
}

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-dark-100 px-3 py-2">
      <p className="text-[11px] text-stone-600 mb-1">{label}</p>
      <p className={`leading-relaxed ${strong ? "text-stone-200" : "text-stone-400"}`}>{value}</p>
    </div>
  );
}
