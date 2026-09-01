"use client";

import { useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/api";

const BASE = "/api";

const MODELS = [
  { key: "flux-schnell", label: "FLUX Schnell", desc: "빠름 · 저렴" },
  { key: "flux-dev",     label: "FLUX Dev",     desc: "고품질" },
  { key: "flux-2-pro",   label: "FLUX 2 Pro",   desc: "최고품질 · 비쌈" },
  { key: "sdxl",         label: "SDXL",         desc: "클래식 SD" },
];

const SCENES = [
  { key: "friendship", word: "友情", meaning: "우정",    example: "두 친구가 벚꽃 아래를 함께 걷고 있다" },
  { key: "study",      word: "学习", meaning: "공부하다", example: "학생이 책상에 앉아 열심히 책을 읽고 있다" },
  { key: "food",       word: "吃饭", meaning: "밥 먹다",  example: "가족이 식탁에 둘러앉아 함께 식사를 즐기고 있다" },
];

interface Result {
  model_key: string;
  label: string;
  url?: string;
  error?: string;
  loading: boolean;
  prompt?: string;
}

export default function ImageTestPage() {
  const [scene, setScene] = useState(SCENES[0]);
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);

  const generate = async (modelKey: string) => {
    const model = MODELS.find((m) => m.key === modelKey)!;

    setResults((prev) => {
      const existing = prev.find((r) => r.model_key === modelKey);
      if (existing) {
        return prev.map((r) =>
          r.model_key === modelKey ? { ...r, loading: true, url: undefined, error: undefined } : r
        );
      }
      return [...prev, { model_key: modelKey, label: model.label, loading: true }];
    });

    try {
      const res = await fetch(`${BASE}/image-test/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ model_key: modelKey, scene_key: scene.key }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "요청 실패");
      }

      setResults((prev) =>
        prev.map((r) =>
          r.model_key === modelKey
            ? { ...r, loading: false, url: data.url, prompt: data.prompt, error: data.error }
            : r
        )
      );
    } catch {
      setResults((prev) =>
        prev.map((r) =>
          r.model_key === modelKey ? { ...r, loading: false, error: "요청 실패" } : r
        )
      );
    }
  };

  const generateAll = async () => {
    setRunning(true);
    await Promise.all(MODELS.map((m) => generate(m.key)));
    setRunning(false);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      <div className="px-6 pt-14 pb-6 bg-dark-300 border-b border-white/5">
        <Link href="/words" className="text-stone-600 text-xs mb-4 block hover:text-stone-400 transition-colors">
          ← 단어 암기장
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">이미지 모델 테스트</h1>
        <p className="text-stone-500 text-xs mt-1">어떤 스타일이 마음에 드는지 확인</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* 예문 선택 */}
        <div>
          <p className="text-xs text-stone-500 mb-2 font-medium">예문 선택</p>
          <div className="flex flex-col gap-2">
            {SCENES.map((s) => (
              <button
                key={s.key}
                onClick={() => { setScene(s); setResults([]); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                  scene.key === s.key
                    ? "bg-jeok-900 border-jeok-700 text-stone-100"
                    : "bg-dark-200 border-white/5 text-stone-400 hover:border-stone-700"
                }`}
              >
                <span className="text-xl font-bold text-stone-200">{s.word}</span>
                <div>
                  <p className="text-sm font-medium">{s.meaning}</p>
                  <p className="text-xs text-stone-600 mt-0.5">{s.example}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 모델별 버튼 */}
        <div>
          <p className="text-xs text-stone-500 mb-2 font-medium">모델 선택</p>
          <div className="grid grid-cols-2 gap-2">
            {MODELS.map((m) => {
              const result = results.find((r) => r.model_key === m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => generate(m.key)}
                  disabled={result?.loading}
                  className={`py-3 px-4 rounded-2xl border text-left transition-all ${
                    result?.loading
                      ? "bg-dark-200 border-stone-700 opacity-60"
                      : result?.url
                      ? "bg-jeok-900 border-jeok-700"
                      : "bg-dark-200 border-white/5 hover:border-stone-600"
                  }`}
                >
                  <p className="text-sm font-semibold text-stone-200">{m.label}</p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {result?.loading ? "생성 중..." : m.desc}
                  </p>
                </button>
              );
            })}
          </div>
          <button
            onClick={generateAll}
            disabled={running}
            className="w-full mt-2 py-3 bg-jeok-600 hover:bg-jeok-500 disabled:opacity-50 text-white rounded-2xl text-sm font-bold transition-colors"
          >
            {running ? "전체 생성 중..." : "전체 모델 동시 생성"}
          </button>
        </div>

        {/* 결과 */}
        {results.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs text-stone-500 font-medium">결과</p>
            {results.map((r) => (
              <div key={r.model_key} className="bg-dark-200 border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-200">{r.label}</p>
                  {r.loading && <span className="text-xs text-stone-500 animate-pulse">생성 중...</span>}
                </div>

                {r.loading && (
                  <div className="aspect-square bg-dark-300 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-jeok-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {r.url && !r.loading && (
                  <>
                    {/* Generated previews can be data/blob URLs and cannot use Next image optimization. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.url} alt={r.label} className="w-full aspect-square object-cover" />
                    {r.prompt && (
                      <p className="px-4 py-2 text-xs text-stone-600 leading-relaxed">{r.prompt}</p>
                    )}
                  </>
                )}

                {r.error && !r.loading && (
                  <div className="aspect-square bg-dark-300 flex items-center justify-center">
                    <p className="text-jeok-400 text-sm">{r.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
