"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, EnglishWord, JapaneseWord, Word } from "@/lib/api";

const STATE_LABEL: Record<number, string> = { 0: "신규", 1: "학습중", 2: "복습", 3: "다시학습" };
const STATE_COLOR: Record<number, string> = {
  0: "text-stone-500", 1: "text-yellow-500", 2: "text-jeok-400", 3: "text-orange-400",
};

function formatDue(due: string): string {
  const diff = new Date(due).getTime() - Date.now();
  const mins = Math.round(diff / 60000);
  if (mins <= 0) return "지금";
  if (mins < 60) return `${mins}분 후`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}시간 후`;
  return `${Math.round(hrs / 24)}일 후`;
}

type SearchResult = (Word & { type: "chinese"; lang?: "zh" }) |
  (EnglishWord & { type: "english"; lang?: "en" }) |
  (JapaneseWord & { type: "japanese"; lang?: "ja" });

function getWordLang(word: SearchResult): "zh" | "en" | "ja" {
  if (word.lang === "zh" || word.type === "chinese") return "zh";
  if (word.lang === "en" || word.type === "english") return "en";
  return "ja";
}

function getFavKey(word: SearchResult): string {
  return `${getWordLang(word)}:${word.id}`;
}

function getPrimaryExample(word: SearchResult): string | null {
  const wordLang = getWordLang(word);
  if (wordLang === "zh" && "example_zh" in word) return word.example_zh;
  if (wordLang === "en" && "example_en" in word) return word.example_en;
  if (wordLang === "ja" && "example_jp" in word) return word.example_jp;
  return null;
}

function StarButton({ isFav, onToggle }: { isFav: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      className="flex-shrink-0 transition-colors ml-auto"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill={isFav ? "#e2a444" : "none"} stroke={isFav ? "#e2a444" : "#57534e"} strokeWidth="1.3">
        <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 5.7l4-.6z"/>
      </svg>
    </button>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<string>("all");
  const [level, setLevel] = useState<string>("");
  const [state, setState] = useState<number | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [favs, setFavs] = useState<Record<string, boolean>>({});
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery && !favoritesOnly && !dueOnly && !level && state === null) {
      setResults([]);
      setFavs({});
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const data = await api.search.global({
        q: trimmedQuery || undefined,
        lang: lang === "all" ? undefined : lang,
        level: level || undefined,
        state: state ?? undefined,
        favorites_only: favoritesOnly || undefined,
        due_only: dueOnly || undefined,
      });
      setResults(data);
      setFavs(Object.fromEntries(data.map((w) => [getFavKey(w), w.is_favorite])));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dueOnly, favoritesOnly, lang, level, query, state]);

  const toggleFav = async (word: SearchResult) => {
    const wordLang = getWordLang(word);
    const result = wordLang === "zh"
      ? await api.words.favorite(word.id)
      : wordLang === "en"
        ? await api.englishWords.favorite(word.id)
        : await api.japaneseWords.favorite(word.id);
    const key = getFavKey(word);
    setFavs((f) => ({ ...f, [key]: result.is_favorite }));
    setResults((items) =>
      favoritesOnly && !result.is_favorite
        ? items.filter((item) => getFavKey(item) !== key)
        : items.map((item) => getFavKey(item) === key ? { ...item, is_favorite: result.is_favorite } : item)
    );
  };

  useEffect(() => {
    handleSearch();
  }, [lang, level, state, favoritesOnly, dueOnly]);

  const getLanguageBadge = (lang: string) => {
    if (lang === "zh") return { label: "중국어", color: "bg-jeok-900 text-jeok-300" };
    if (lang === "en") return { label: "영어", color: "bg-blue-900 text-blue-300" };
    return { label: "일본어", color: "bg-purple-900 text-purple-300" };
  };

  const renderWord = (w: typeof results[number]) => {
    const wordLang = getWordLang(w);
    const badge = getLanguageBadge(wordLang);
    const favKey = getFavKey(w);
    const primaryExample = getPrimaryExample(w);

    return (
      <div key={favKey} className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
          {wordLang === "zh" && "hsk_level" in w && w.hsk_level && <span className="text-xs text-stone-600 border border-stone-700 rounded px-1.5 py-0.5">HSK {w.hsk_level}</span>}
          {wordLang === "en" && "level" in w && w.level && <span className="text-xs text-jeok-600 border border-jeok-900 rounded px-1.5 py-0.5">{w.level}</span>}
          {wordLang === "ja" && "jlpt_level" in w && w.jlpt_level && <span className="text-xs text-jeok-600 border border-jeok-900 rounded px-1.5 py-0.5">{w.jlpt_level}</span>}
          <StarButton isFav={!!favs[favKey]} onToggle={() => toggleFav(w)} />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xl font-bold text-stone-100">
            {wordLang === "zh" && "chinese" in w ? w.chinese : wordLang === "en" && "word" in w ? w.word : "expression" in w ? w.expression : ""}
          </span>
          {wordLang === "zh" && "pinyin" in w && <span className="text-sm text-stone-500 font-light">{w.pinyin}</span>}
          {wordLang === "ja" && "expression" in w && w.expression !== w.reading && <span className="text-sm text-stone-500 font-light">{w.reading}</span>}
        </div>
        <p className="text-sm text-stone-300 font-medium mt-1 leading-snug">{w.meaning}</p>
        <div className="flex items-center gap-2 mt-2">
          {w.state !== undefined && (
            <span className={`text-xs font-medium ${STATE_COLOR[w.state]}`}>{STATE_LABEL[w.state]}</span>
          )}
          {w.reps !== undefined && w.reps > 0 && <span className="text-xs text-stone-700">· 복습 {w.reps}회</span>}
          {w.lapses !== undefined && w.lapses > 0 && <span className="text-xs text-jeok-700">· 틀림 {w.lapses}회</span>}
          {w.due && <span className="text-xs text-stone-700 ml-auto">{formatDue(w.due)}</span>}
        </div>
        {primaryExample && (
          <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-1">
            <p className="text-xs text-stone-400 leading-relaxed">
              {primaryExample}
            </p>
            {w.example_ko && <p className="text-xs text-stone-600 leading-relaxed">{w.example_ko}</p>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      <div className="px-6 pt-14 pb-4 bg-dark-300 border-b border-white/5">
        <button onClick={() => router.back()} className="text-stone-600 text-xs mb-3 flex items-center gap-1 hover:text-stone-400 transition-colors">
          ← 돌아가기
        </button>
        <h2 className="text-xl font-bold text-stone-100 mb-3">단어 검색</h2>
        <div className="flex gap-2 mb-3">
          <Link href="/words" className="text-xs text-stone-500 hover:text-stone-300 bg-dark-200 border border-white/5 rounded-lg px-3 py-1.5 transition-colors">
            단어장 보기
          </Link>
          <button
            type="button"
            onClick={() => {
              setFavoritesOnly(true);
              setDueOnly(false);
              setState(null);
              setLevel("");
            }}
            className="text-xs text-yellow-400 hover:text-yellow-300 bg-dark-200 border border-yellow-900/50 rounded-lg px-3 py-1.5 transition-colors"
          >
            즐겨찾기 보기
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="검색어를 입력하세요..."
            className="min-w-0 w-full bg-dark-200 border border-stone-700 focus:border-jeok-600 rounded-xl px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none transition-colors"
          />
          <button
            onClick={handleSearch}
            className="w-full sm:w-auto px-4 py-2.5 bg-jeok-600 hover:bg-jeok-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            검색
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4 space-y-4">
          <p className="text-sm font-semibold text-stone-200">필터</p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-stone-600 block mb-1.5">언어</label>
              <div className="flex gap-2">
                {["all", "zh", "en", "ja"].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      lang === l
                        ? "bg-jeok-600 text-white"
                        : "bg-dark-100 text-stone-500 hover:bg-dark-100/80"
                    }`}
                  >
                    {l === "all" ? "전체" : l === "zh" ? "중국어" : l === "en" ? "영어" : "일본어"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-600 block mb-1.5">레벨</label>
              <input
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="HSK/CEFR/JLPT 레벨"
                className="w-full bg-dark-100 border border-stone-700 focus:border-jeok-600 rounded-lg px-3 py-2 text-xs text-stone-200 placeholder-stone-600 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-stone-600 block mb-1.5">상태</label>
              <select
                value={state ?? ""}
                onChange={(e) => setState(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-dark-100 border border-stone-700 focus:border-jeok-600 rounded-lg px-3 py-2 text-xs text-stone-200 outline-none transition-colors"
              >
                <option value="">전체</option>
                <option value="0">신규</option>
                <option value="1">학습중</option>
                <option value="2">복습</option>
                <option value="3">다시학습</option>
              </select>
            </div>

            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(e) => setFavoritesOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-700 bg-dark-100 text-jeok-600 focus:ring-jeok-600 focus:ring-offset-dark-300"
                />
                <span className="text-xs text-stone-500">즐겨찾기만</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dueOnly}
                  onChange={(e) => setDueOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-700 bg-dark-100 text-jeok-600 focus:ring-jeok-600 focus:ring-offset-dark-300"
                />
                <span className="text-xs text-stone-500">복습 필요만</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-3">
          <p className="text-xs text-stone-600">
            {loading ? "검색 중..." : `결과 ${results.length}개`}
          </p>
        </div>

        <div className="space-y-2 pb-4">
          {results.map(renderWord)}
          {!loading && searched && results.length === 0 && (
            <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-8 text-center">
              <p className="text-sm text-stone-400">검색 결과가 없습니다.</p>
            </div>
          )}
          {!loading && !searched && (
            <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-8 text-center">
              <p className="text-sm text-stone-400">단어, 뜻, 예문으로 검색하고 별표를 눌러 다음에 볼 단어로 저장하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
