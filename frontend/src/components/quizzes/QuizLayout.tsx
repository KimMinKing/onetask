export function QuizLayout({
  index,
  total,
  onBack,
  onAnswer,
  correct,
  wrong,
  question,
  feedback,
  busy,
  children,
}: {
  index: number;
  total: number;
  onBack: () => void;
  onAnswer: (correct: boolean) => void;
  correct?: string;
  wrong?: string;
  question?: string;
  feedback?: "correct" | "wrong" | null;
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button onClick={onBack} className="text-stone-600 hover:text-stone-400 transition-colors text-lg">✕</button>
        <div className="flex-1 h-1.5 bg-dark-200 rounded-full overflow-hidden">
          <div className="h-full bg-jeok-500 rounded-full transition-all duration-500"
            style={{ width: `${(index / total) * 100}%` }} />
        </div>
        <span className="text-xs text-stone-600">{index + 1} / {total}</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-5">
        {question && (
          <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4 w-full">
            <p className="text-sm text-stone-500 mb-2">문제</p>
            <p className="text-base text-stone-200 leading-relaxed">{question}</p>
          </div>
        )}

        {children}

        {feedback && (
          <div className={`w-full p-4 rounded-xl text-center ${
            feedback === "correct" ? "bg-green-950/30 text-green-400 border border-green-800" : "bg-jeok-950/30 text-jeok-400 border border-jeok-800"
          }`}>
            {feedback === "correct" ? "✓ 정답!" : "✕ 틀렸어요"}
          </div>
        )}

        {correct && wrong && !feedback && (
          <div className="w-full grid grid-cols-2 gap-3">
            <button onClick={() => !busy && onAnswer(false)}
              className="py-4 bg-dark-200 border border-jeok-800 hover:bg-jeok-950 text-jeok-400 rounded-2xl font-bold transition-all active:scale-95">
              {wrong}
            </button>
            <button onClick={() => !busy && onAnswer(true)}
              className="py-4 bg-dark-200 border border-green-900 hover:bg-green-950 text-green-400 rounded-2xl font-bold transition-all active:scale-95">
              {correct}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
