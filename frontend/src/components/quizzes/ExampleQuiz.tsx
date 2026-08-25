import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { QuizLayout } from "./QuizLayout";

type QuizData = {
  question: string;
  options: string[];
  correct_answer: string;
  word_id: number;
  word_lang: string;
  quiz_type: string;
};

export function ExampleQuiz({ wordLang = "zh", onBack, onDone }: {
  wordLang?: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    loadQuizzes();
    // The loader only varies with wordLang; reload when the language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordLang]);

  const loadQuizzes = async () => {
    const loaded: QuizData[] = [];
    for (let i = 0; i < 5; i++) {
      try {
        const q = await api.quizzes.exampleQuiz(wordLang);
        loaded.push(q);
      } catch {
        break;
      }
    }
    setQuizzes(loaded);
    if (loaded.length > 0) {
      setQuiz(loaded[0]);
    } else {
      setCompleted(true);
    }
  };

  const handleAnswer = async (option: string) => {
    if (!quiz || busy || feedback) return;
    setSelectedOption(option);
    const isCorrect = option === quiz.correct_answer;
    setFeedback(isCorrect ? "correct" : "wrong");
    setBusy(true);

    if (isCorrect) {
      setScore(s => s + 1);
    }

    try {
      await api.quizzes.submitAnswer({
        word_id: quiz.word_id,
        word_lang: quiz.word_lang,
        quiz_type: quiz.quiz_type,
        answer: option,
        correct: isCorrect,
      });
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      const nextIndex = index + 1;
      if (nextIndex >= quizzes.length) {
        setCompleted(true);
      } else {
        setIndex(nextIndex);
        setQuiz(quizzes[nextIndex]);
        setFeedback(null);
        setSelectedOption(null);
        setBusy(false);
      }
    }, 1000);
  };

  if (completed) {
    const pct = quizzes.length > 0 ? Math.round((score / quizzes.length) * 100) : 0;
    return (
      <div className="flex flex-col min-h-dvh bg-dark-400 items-center justify-center px-6 gap-6">
        <p className="text-5xl">{pct >= 70 ? "🎉" : "💪"}</p>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-stone-200">퀴즈 완료</h2>
          <p className="text-stone-500 text-sm mt-1">예문 퀴즈 결과</p>
        </div>
        <div className="w-full bg-dark-200 border border-white/5 rounded-3xl p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-stone-500 text-sm">정답</span>
            <span className="text-2xl font-bold text-green-400">{score}개</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-500 text-sm">오답</span>
            <span className="text-2xl font-bold text-jeok-400">{quizzes.length - score}개</span>
          </div>
          <div className="border-t border-white/5 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-stone-500 text-sm">정답률</span>
              <span className="text-2xl font-bold text-stone-200">{pct}%</span>
            </div>
          </div>
        </div>
        <button onClick={onDone} className="w-full py-4 bg-jeok-600 hover:bg-jeok-500 text-white rounded-2xl font-bold transition-colors">
          완료
        </button>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-dark-400 text-stone-600 text-sm">
        퀴즈를 불러오는 중...
      </div>
    );
  }

  return (
    <QuizLayout
      index={index}
      total={quizzes.length}
      onBack={onBack}
      onAnswer={() => {}}
      correct=""
      wrong=""
      feedback={feedback}
      busy={busy}
      question={quiz.question}
    >
      <div className="w-full space-y-3">
        {quiz.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(option)}
            disabled={busy || !!feedback}
            className={`w-full py-4 px-4 rounded-xl text-sm text-left transition-all ${
              selectedOption === option
                ? feedback === "correct"
                  ? "bg-green-600 text-white border-green-500"
                  : feedback === "wrong"
                  ? "bg-jeok-600 text-white border-jeok-500"
                  : "bg-jeok-900 text-jeok-300 border-jeok-800"
                : "bg-dark-200 text-stone-300 border-white/5 hover:bg-dark-100 hover:border-stone-700"
            } ${busy || feedback ? "cursor-not-allowed" : "cursor-pointer"}`}
          >
            {option}
          </button>
        ))}
      </div>
    </QuizLayout>
  );
}
