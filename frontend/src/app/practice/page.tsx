"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type PracticeCard = { id: string; text: string; sub: string; lang: string };

export default function PracticePage() {
  const router = useRouter();
  const [cards, setCards] = useState<PracticeCard[]>([]);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"listen" | "speak">("listen");
  const [heard, setHeard] = useState("");
  useEffect(() => { Promise.all([api.words.today(4), api.englishWords.today(), api.japaneseWords.today("N5")]).then(([zh,en,ja]) => setCards([...zh.slice(0,5).map(w=>({id:`zh-${w.id}`,text:w.chinese,sub:`${w.pinyin} · ${w.meaning}`,lang:"zh-CN"})),...en.slice(0,5).map(w=>({id:`en-${w.id}`,text:w.word,sub:w.meaning,lang:"en-US"})),...ja.slice(0,5).map(w=>({id:`ja-${w.id}`,text:w.expression,sub:`${w.reading} · ${w.meaning}`,lang:"ja-JP"}))])); }, []);
  const card = cards[index];
  const speak = () => { if (!card) return; speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(card.text); utterance.lang = card.lang; utterance.rate = .85; speechSynthesis.speak(utterance); };
  const recognize = () => { if (!card) return; const SpeechRecognition = (window as unknown as { webkitSpeechRecognition?: new () => { lang:string; start:()=>void; onresult:(event:{results:{0:{0:{transcript:string}}}})=>void } }).webkitSpeechRecognition; if (!SpeechRecognition) { setHeard("이 브라우저는 음성 인식을 지원하지 않습니다."); return; } const recognition = new SpeechRecognition(); recognition.lang = card.lang; recognition.onresult = event => setHeard(event.results[0][0].transcript); recognition.start(); };
  const next = () => { if (!cards.length) return; setIndex(value => (value + 1) % cards.length); setHeard(""); };
  const finish = async () => { await api.learning.activity({ subject:"languages", activity_type:mode, title:"듣기·말하기 연속 연습", duration_minutes:10, total_count:cards.length }); router.push("/"); };
  return <div className="flex min-h-dvh flex-col bg-dark-400 px-4 pb-8 pt-8"><main className="mx-auto flex w-full max-w-xl flex-1 flex-col"><Link href="/" className="text-sm text-stone-500">← 홈</Link><div className="mt-5 grid grid-cols-2 rounded-2xl bg-dark-200 p-1">{(["listen","speak"] as const).map(value=><button key={value} onClick={()=>setMode(value)} className={`rounded-xl py-3 text-sm font-bold ${mode===value?"bg-blue-600 text-white":"text-stone-500"}`}>{value==="listen"?"🎧 연속 듣기":"🎙 따라 말하기"}</button>)}</div>
    <section className="mt-5 flex flex-1 flex-col justify-center rounded-3xl border border-blue-900/50 bg-dark-200 p-7 text-center"><p className="text-xs text-stone-600">{cards.length ? `${index+1} / ${cards.length}` : "불러오는 중"}</p><h1 className="mt-5 text-4xl font-black text-stone-100">{card?.text || "..."}</h1><p className="mt-3 text-sm text-stone-500">{card?.sub}</p>{mode==="listen"?<button onClick={speak} className="mx-auto mt-8 h-20 w-20 rounded-full bg-blue-600 text-3xl shadow-lg shadow-blue-950">🔊</button>:<><button onClick={recognize} className="mx-auto mt-8 h-20 w-20 rounded-full bg-red-600 text-3xl shadow-lg shadow-red-950">🎙</button>{heard&&<p className="mt-4 text-sm text-emerald-300">인식: {heard}</p>}</>}<button onClick={next} className="mt-8 rounded-xl bg-dark-100 py-3 font-bold text-stone-300">다음 →</button></section><button onClick={finish} className="mt-4 rounded-2xl bg-emerald-700 py-4 font-bold text-white">연습 마치고 기록하기</button>
  </main></div>;
}
