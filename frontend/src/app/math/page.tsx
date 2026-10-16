"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CURRICULUM, Step } from "./curriculum";
import { CHALLENGE, ChallengeQuiz } from "./challenge";
import { readUserStorage, writeUserStorage } from "@/lib/auth";

const STORAGE_KEY = "math_progress";

function getProgress(): Record<number, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(readUserStorage(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveProgress(p: Record<number, boolean>) {
  writeUserStorage(STORAGE_KEY, JSON.stringify(p));
}

/* ══════════════════════════════════════════
   연습 퀴즈 컴포넌트
══════════════════════════════════════════ */
function Quiz({ step, onComplete }: { step: Step; onComplete: () => void }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const q = step.quiz[idx];

  const choose = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === q.answer) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (idx + 1 < step.quiz.length) {
      setIdx((i) => i + 1);
      setSelected(null);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="text-center py-8">
        <p className="text-4xl mb-3">{correct === step.quiz.length ? "🎉" : "💪"}</p>
        <p className="text-xl font-bold text-stone-100 mb-1">{correct}/{step.quiz.length} 정답</p>
        <p className="text-sm text-stone-500 mb-6">
          {correct === step.quiz.length ? "완벽해요! 도전 퀴즈로 넘어가봐요." : "한 번 더 복습하고 도전해봐요."}
        </p>
        <button onClick={onComplete}
          className="px-8 py-3 bg-dark-200 hover:bg-dark-100 text-stone-300 rounded-2xl font-bold transition-colors">
          확인
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-stone-600 mb-3">연습 {idx + 1}/{step.quiz.length}</p>
      <p className="text-base font-semibold text-stone-100 mb-4">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt, i) => (
          <button key={i} onClick={() => choose(i)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${
              selected === null
                ? "bg-dark-200 border-white/5 hover:border-jeok-700 text-stone-300"
                : i === q.answer
                ? "bg-green-900/40 border-green-700 text-green-300"
                : selected === i
                ? "bg-red-900/30 border-red-800 text-red-400"
                : "bg-dark-200 border-white/5 text-stone-600"
            }`}>
            {opt}
          </button>
        ))}
      </div>
      {selected !== null && (
        <div className="mt-4">
          <div className={`px-4 py-3 rounded-xl text-sm mb-3 ${
            selected === q.answer ? "bg-green-900/30 text-green-300" : "bg-red-900/20 text-red-400"
          }`}>
            {selected === q.answer ? "✓ 정답!" : "✗ 오답"} — {q.explanation}
          </div>
          <button onClick={next}
            className="w-full py-3 bg-dark-200 hover:bg-dark-100 text-stone-300 rounded-xl text-sm font-medium transition-colors">
            {idx + 1 < step.quiz.length ? "다음 문제 →" : "결과 보기"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   도전 퀴즈 컴포넌트 (5문제, 4개 이상 통과)
══════════════════════════════════════════ */
const PASS_SCORE = 4;

function ChallengeQuizView({ stepId, onPass, onFail }: {
  stepId: number;
  onPass: () => void;
  onFail: () => void;
}) {
  const questions: ChallengeQuiz[] = CHALLENGE[stepId] || [];
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[idx];

  const choose = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === q.answer) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (idx + 1 < questions.length) {
      setIdx((i) => i + 1);
      setSelected(null);
    } else {
      setDone(true);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500 text-sm">도전 문제가 없습니다.</div>
    );
  }

  if (done) {
    const passed = correct >= PASS_SCORE;
    return (
      <div className="text-center py-8">
        <p className="text-5xl mb-4">{passed ? "🏆" : "😤"}</p>
        <p className="text-2xl font-bold text-stone-100 mb-1">{correct}/{questions.length}</p>
        <p className={`text-sm font-semibold mb-2 ${passed ? "text-green-400" : "text-red-400"}`}>
          {passed ? "통과! 다음 단계 해금됨" : `${PASS_SCORE}개 이상 맞아야 통과 (${correct}개)`}
        </p>
        <p className="text-xs text-stone-600 mb-8">
          {passed ? "실력이 충분해요. 다음 단계로 가봐요!" : "조금 더 연습하고 다시 도전해봐요!"}
        </p>
        {passed ? (
          <button onClick={onPass}
            className="px-8 py-3 bg-jeok-600 hover:bg-jeok-500 text-white rounded-2xl font-bold transition-colors">
            🎉 단계 완료!
          </button>
        ) : (
          <button onClick={onFail}
            className="px-8 py-3 bg-dark-200 hover:bg-dark-100 text-stone-300 rounded-2xl font-bold transition-colors">
            다시 도전하기
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-stone-600">도전 {idx + 1}/{questions.length}</p>
        <span className="text-xs text-amber-500 bg-amber-900/30 border border-amber-800 rounded-full px-3 py-1">
          {PASS_SCORE}개 이상 정답 시 통과
        </span>
      </div>
      <p className="text-base font-semibold text-stone-100 mb-4">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt, i) => (
          <button key={i} onClick={() => choose(i)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${
              selected === null
                ? "bg-dark-200 border-white/5 hover:border-amber-700 text-stone-300"
                : i === q.answer
                ? "bg-green-900/40 border-green-700 text-green-300"
                : selected === i
                ? "bg-red-900/30 border-red-800 text-red-400"
                : "bg-dark-200 border-white/5 text-stone-600"
            }`}>
            {opt}
          </button>
        ))}
      </div>
      {selected !== null && (
        <div className="mt-4">
          <div className={`px-4 py-3 rounded-xl text-sm mb-3 ${
            selected === q.answer ? "bg-green-900/30 text-green-300" : "bg-red-900/20 text-red-400"
          }`}>
            {selected === q.answer ? "✓ 정답!" : "✗ 오답"} — {q.explanation}
          </div>
          <button onClick={next}
            className="w-full py-3 bg-dark-200 hover:bg-dark-100 text-stone-300 rounded-xl text-sm font-medium transition-colors">
            {idx + 1 < questions.length ? "다음 문제 →" : "결과 보기"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   단계 상세 화면
══════════════════════════════════════════ */
function StepDetail({ step, onBack, onComplete, completed }: {
  step: Step; onBack: () => void; onComplete: () => void; completed: boolean;
}) {
  const [tab, setTab] = useState<"learn" | "examples" | "quiz" | "challenge">("learn");
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  const [showSolution, setShowSolution] = useState<Record<number, boolean>>({});
  const [challengeKey, setChallengeKey] = useState(0);

  const resetChallenge = () => setChallengeKey((k) => k + 1);

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      {/* 헤더 */}
      <div className="px-6 pt-10 pb-5 bg-dark-300 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="w-8 h-8 rounded-xl bg-dark-200 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-colors">
            ←
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{step.emoji}</span>
              <h1 className="text-xl font-bold text-stone-100">{step.title}</h1>
              {completed && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">완료</span>}
            </div>
            <p className="text-xs text-stone-600 mt-0.5">Step {step.id} — {step.subtitle}</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex bg-dark-200 rounded-2xl p-1 gap-1 mt-4">
          {(["learn", "examples", "quiz", "challenge"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === t ? (t === "challenge" ? "bg-amber-700 text-white" : "bg-jeok-600 text-white") : "text-stone-500 hover:text-stone-300"}`}>
              {t === "learn" ? "📖 학습" : t === "examples" ? "✏️ 예제" : t === "quiz" ? "🧠 연습" : "🏆 도전"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-5 overflow-y-auto">
        {/* 핵심 개념 태그 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {step.concepts.map((c) => (
            <span key={c} className="text-xs bg-jeok-900/50 text-jeok-400 border border-jeok-900 rounded-full px-3 py-1">{c}</span>
          ))}
        </div>

        {/* 학습 탭 */}
        {tab === "learn" && (
          <div className="space-y-4">
            <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4">
              <div className="prose prose-sm prose-invert max-w-none">
                {step.explanation.split("\n").map((line, i) => {
                  if (line.startsWith("**") && line.endsWith("**")) {
                    return <p key={i} className="font-bold text-jeok-400 mt-3 mb-1">{line.replace(/\*\*/g, "")}</p>;
                  }
                  if (line.includes("**")) {
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <p key={i} className="text-sm text-stone-300 leading-relaxed">
                        {parts.map((p, j) =>
                          p.startsWith("**") ? <strong key={j} className="text-stone-100">{p.replace(/\*\*/g, "")}</strong> : p
                        )}
                      </p>
                    );
                  }
                  if (line.trim() === "") return <div key={i} className="h-2" />;
                  return <p key={i} className="text-sm text-stone-300 leading-relaxed">{line}</p>;
                })}
              </div>
            </div>
            <div className="bg-jeok-900/30 border border-jeok-800 rounded-2xl px-5 py-4">
              <p className="text-xs text-jeok-500 font-medium mb-1">🤖 AI와의 연결</p>
              <p className="text-sm text-stone-300 leading-relaxed">{step.aiConnection}</p>
            </div>
          </div>
        )}

        {/* 예제 탭 */}
        {tab === "examples" && (
          <div className="space-y-4">
            {step.examples.map((ex, i) => (
              <div key={i} className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4">
                <p className="text-xs text-stone-600 font-medium mb-2">예제 {i + 1}</p>
                <p className="text-sm font-semibold text-stone-100 mb-3">{ex.problem}</p>
                <div className="flex gap-2">
                  {ex.hint && (
                    <button onClick={() => setShowHint((h) => ({ ...h, [i]: !h[i] }))}
                      className="text-xs text-stone-600 hover:text-stone-400 border border-white/5 rounded-lg px-3 py-1.5 transition-colors">
                      {showHint[i] ? "힌트 숨기기" : "💡 힌트"}
                    </button>
                  )}
                  <button onClick={() => setShowSolution((s) => ({ ...s, [i]: !s[i] }))}
                    className="text-xs text-jeok-500 hover:text-jeok-400 border border-jeok-900 rounded-lg px-3 py-1.5 transition-colors">
                    {showSolution[i] ? "풀이 숨기기" : "정답 보기"}
                  </button>
                </div>
                {showHint[i] && ex.hint && (
                  <p className="mt-2 text-xs text-stone-500 bg-dark-100 rounded-lg px-3 py-2">{ex.hint}</p>
                )}
                {showSolution[i] && (
                  <p className="mt-2 text-sm text-green-400 bg-green-900/20 rounded-lg px-3 py-2 font-medium">{ex.solution}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 연습 퀴즈 탭 */}
        {tab === "quiz" && (
          <Quiz step={step} onComplete={() => setTab("challenge")} />
        )}

        {/* 도전 퀴즈 탭 */}
        {tab === "challenge" && (
          <div>
            {!completed && (
              <div className="bg-amber-900/20 border border-amber-800 rounded-2xl px-5 py-3 mb-4">
                <p className="text-xs text-amber-400 font-semibold">🏆 도전 퀴즈</p>
                <p className="text-xs text-stone-500 mt-0.5">5문제 중 4개 이상 맞으면 다음 단계가 열려요.</p>
              </div>
            )}
            {completed && (
              <div className="bg-green-900/20 border border-green-800 rounded-2xl px-5 py-3 mb-4">
                <p className="text-xs text-green-400 font-semibold">✅ 이미 통과한 단계입니다</p>
                <p className="text-xs text-stone-500 mt-0.5">다시 풀어볼 수 있어요.</p>
              </div>
            )}
            <ChallengeQuizView
              key={challengeKey}
              stepId={step.id}
              onPass={onComplete}
              onFail={resetChallenge}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   메인 페이지
══════════════════════════════════════════ */
export default function MathPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<Step | null>(null);

  useEffect(() => { setProgress(getProgress()); }, []);

  const complete = (id: number) => {
    const next = { ...progress, [id]: true };
    setProgress(next);
    saveProgress(next);
    setSelected(null);
  };

  const completedCount = Object.values(progress).filter(Boolean).length;

  if (selected) {
    return (
      <StepDetail
        step={selected}
        onBack={() => setSelected(null)}
        onComplete={() => complete(selected.id)}
        completed={!!progress[selected.id]}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      {/* 헤더 */}
      <div className="px-6 pt-10 pb-6 bg-dark-300 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-dark-200 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-colors">
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold text-stone-100">AI를 위한 미적분</h1>
            <p className="text-xs text-stone-600 mt-0.5">중학생도 이해하는 10단계 커리큘럼</p>
          </div>
        </div>

        {/* 진행률 */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-stone-600 mb-1.5">
            <span>진행률</span>
            <span>{completedCount} / {CURRICULUM.length}</span>
          </div>
          <div className="h-2 bg-dark-100 rounded-full overflow-hidden">
            <div className="h-full bg-jeok-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / CURRICULUM.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* 단계 목록 */}
      <div className="flex-1 px-4 py-5 space-y-3 overflow-y-auto">
        {CURRICULUM.map((step, i) => {
          const done = !!progress[step.id];
          const unlocked = i === 0 || !!progress[CURRICULUM[i - 1].id];
          return (
            <button key={step.id} onClick={() => unlocked && setSelected(step)}
              disabled={!unlocked}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition-all ${
                done
                  ? "bg-dark-200 border-jeok-900 hover:border-jeok-700"
                  : unlocked
                  ? "bg-dark-200 border-white/5 hover:border-jeok-700 hover:bg-dark-100"
                  : "bg-dark-300 border-white/3 opacity-40 cursor-not-allowed"
              }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                done ? "bg-jeok-900/50" : unlocked ? "bg-dark-100" : "bg-dark-200"
              }`}>
                {done ? "✅" : unlocked ? step.emoji : "🔒"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-stone-100">Step {step.id}. {step.title}</p>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">{step.subtitle}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {step.concepts.slice(0, 3).map((c) => (
                    <span key={c} className="text-xs text-stone-700 bg-dark-100 rounded px-1.5 py-0.5">{c}</span>
                  ))}
                </div>
              </div>
              {unlocked && !done && (
                <span className="text-stone-600 text-sm flex-shrink-0">→</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
