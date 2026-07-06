import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { QuizLayout } from "./QuizLayout";

type PronunciationData = {
  word_id: number;
  word_lang: string;
  target_word: string;
  instruction: string;
  quiz_type: string;
};

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onend: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start: () => void;
  abort: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: {
    transcript: string;
    confidence: number;
  };
  length: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
  }
}

export function PronunciationQuiz({ wordLang = "zh", onBack, onDone }: {
  wordLang?: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [quiz, setQuiz] = useState<PronunciationData | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [quizzes, setQuizzes] = useState<PronunciationData[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    loadQuizzes();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [wordLang]);

  const loadQuizzes = async () => {
    const loaded: PronunciationData[] = [];
    for (let i = 0; i < 5; i++) {
      try {
        const q = await api.quizzes.checkPronunciation(wordLang);
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

  const startListening = () => {
    if (!quiz || busy || feedback) return;

    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("음성 인식을 지원하지 않는 브라우저입니다.");
      return;
    }

    const SpeechRecognitionClass = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognition.lang = wordLang === "zh" ? "zh-CN" : wordLang === "en" ? "en-US" : "ja-JP";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSpokenText(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleAnswer = async (isCorrect: boolean) => {
    if (!quiz || busy) return;
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
        answer: spokenText,
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
        setSpokenText("");
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
          <p className="text-stone-500 text-sm mt-1">발음 평가 결과</p>
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
      correct="정답"
      wrong="오답"
      feedback={feedback}
      busy={busy}
      question={quiz.instruction}
    >
      <div className="w-full space-y-4">
        <div className="bg-dark-200 border border-white/5 rounded-2xl p-6 text-center">
          <p className="text-sm text-stone-600 mb-3">발음할 단어</p>
          <p className="text-3xl font-bold text-stone-100">{quiz.target_word}</p>
        </div>

        <button
          onClick={startListening}
          disabled={busy || isListening || !!feedback}
          className={`w-full py-4 rounded-xl font-medium transition-all ${
            isListening
              ? "bg-jeok-600 text-white animate-pulse"
              : "bg-dark-200 text-stone-300 border border-white/5 hover:bg-dark-100 hover:border-stone-700"
          } ${busy || feedback ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          {isListening ? "🎤 듣고 있어요..." : "🎤 말하기"}
        </button>

        {spokenText && !feedback && (
          <div className="bg-dark-200 border border-white/5 rounded-2xl p-4">
            <p className="text-xs text-stone-600 mb-2">인식된 발음</p>
            <p className="text-lg text-stone-200">&ldquo;{spokenText}&rdquo;</p>
          </div>
        )}

        {spokenText && !feedback && (
          <button
            onClick={() => {
              const isCorrect = spokenText.toLowerCase().includes(quiz.target_word.toLowerCase());
              handleAnswer(isCorrect);
            }}
            disabled={busy}
            className="w-full py-4 bg-jeok-600 hover:bg-jeok-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            제출
          </button>
        )}
      </div>
    </QuizLayout>
  );
}
