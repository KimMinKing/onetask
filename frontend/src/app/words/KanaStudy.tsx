"use client";

import { useEffect, useMemo, useState } from "react";

type UiLanguage = "ko" | "zh";
type Script = "all" | "hiragana" | "katakana";
type KanaCard = { id:string; kana:string; pair:string; romaji:string; sound:string; example:string; script:Exclude<Script,"all"> };

const BASE = [
  ["あ","ア","a","아","あさ(아침)"],["い","イ","i","이","いぬ(개)"],["う","ウ","u","우","うみ(바다)"],["え","エ","e","에","えき(역)"],["お","オ","o","오","おと(소리)"],
  ["か","カ","ka","카","かさ(우산)"],["き","キ","ki","키","き(나무)"],["く","ク","ku","쿠","くち(입)"],["け","ケ","ke","케","けさ(오늘 아침)"],["こ","コ","ko","코","こえ(목소리)"],
  ["さ","サ","sa","사","さかな(물고기)"],["し","シ","shi","시","しお(소금)"],["す","ス","su","스","すし(초밥)"],["せ","セ","se","세","せかい(세계)"],["そ","ソ","so","소","そら(하늘)"],
  ["た","タ","ta","타","たこ(문어)"],["ち","チ","chi","치","ちず(지도)"],["つ","ツ","tsu","츠","つき(달)"],["て","テ","te","테","て(손)"],["と","ト","to","토","とり(새)"],
  ["な","ナ","na","나","なつ(여름)"],["に","ニ","ni","니","にく(고기)"],["ぬ","ヌ","nu","누","ぬの(천)"],["ね","ネ","ne","네","ねこ(고양이)"],["の","ノ","no","노","のみもの(음료)"],
  ["は","ハ","ha","하","はな(꽃)"],["ひ","ヒ","hi","히","ひと(사람)"],["ふ","フ","fu","후","ふゆ(겨울)"],["へ","ヘ","he","헤","へや(방)"],["ほ","ホ","ho","호","ほん(책)"],
  ["ま","マ","ma","마","まち(마을)"],["み","ミ","mi","미","みず(물)"],["む","ム","mu","무","むし(벌레)"],["め","メ","me","메","め(눈)"],["も","モ","mo","모","もの(물건)"],
  ["や","ヤ","ya","야","やま(산)"],["ゆ","ユ","yu","유","ゆき(눈)"],["よ","ヨ","yo","요","よる(밤)"],
  ["ら","ラ","ra","라","らいねん(내년)"],["り","リ","ri","리","りんご(사과)"],["る","ル","ru","루","るす(부재)"],["れ","レ","re","레","れきし(역사)"],["ろ","ロ","ro","로","ろく(여섯)"],
  ["わ","ワ","wa","와","わたし(나)"],["を","ヲ","wo","오","を(목적격 조사)"],["ん","ン","n","응/ㄴ","ほん(책)"],
] as const;

const CARDS:KanaCard[]=BASE.flatMap(([h,k,romaji,sound,example])=>[
  {id:`h-${romaji}`,kana:h,pair:k,romaji,sound,example,script:"hiragana"},
  {id:`k-${romaji}`,kana:k,pair:h,romaji,sound,example:example.replace(h,k),script:"katakana"},
]);
const STORAGE_KEY="kana_study_progress_v1";
const shuffle=<T,>(items:T[])=>{const next=[...items];for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]];}return next;};
const speak=(text:string)=>{if(!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="ja-JP";u.rate=.8;window.speechSynthesis.speak(u);};

export default function KanaStudy({uiLanguage,onBack}:{uiLanguage:UiLanguage;onBack:()=>void}){
  const zh=uiLanguage==="zh";const [script,setScript]=useState<Script>("hiragana");const [deck,setDeck]=useState<KanaCard[]>(()=>CARDS.filter(x=>x.script==="hiragana"));const [index,setIndex]=useState(0);const [revealed,setRevealed]=useState(false);const [known,setKnown]=useState<Record<string,boolean>>({});
  useEffect(()=>{try{setKnown(JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}"));}catch{}return()=>window.speechSynthesis.cancel();},[]);
  const current=deck[index];const learned=useMemo(()=>CARDS.filter(x=>known[x.id]).length,[known]);
  const changeScript=(value:Script)=>{setScript(value);setDeck(CARDS.filter(x=>value==="all"||x.script===value));setIndex(0);setRevealed(false);};
  const answer=(right:boolean)=>{if(right){const next={...known,[current.id]:true};setKnown(next);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}if(index+1>=deck.length){setDeck(shuffle(deck));setIndex(0);}else setIndex(index+1);setRevealed(false);};
  return <div className="flex min-h-dvh flex-col bg-dark-400"><header className="border-b border-white/5 bg-dark-300 px-5 pb-4 pt-10"><div className="flex items-center gap-3"><button onClick={onBack} className="h-9 w-9 rounded-xl bg-dark-200 text-stone-400">←</button><div><h1 className="text-xl font-bold text-stone-100">{zh?"日语 0 阶段":"일본어 0단계"}</h1><p className="mt-0.5 text-xs text-stone-500">{zh?"平假名 · 片假名 92张卡片":"히라가나 · 가타카나 92개 카드"}</p></div><span className="ml-auto text-xs font-bold text-jeok-400">{learned}/92</span></div><div className="mt-4 grid grid-cols-3 gap-2">{(["hiragana","katakana","all"] as Script[]).map(x=><button key={x} onClick={()=>changeScript(x)} className={`rounded-lg py-2 text-xs font-bold ${script===x?"bg-jeok-600 text-white":"bg-dark-200 text-stone-500"}`}>{x==="hiragana"?"ひらがな":x==="katakana"?"カタカナ":zh?"全部":"전체"}</button>)}</div></header>
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-5 py-6"><div className="text-xs text-stone-600">{index+1}/{deck.length} · {known[current.id]?(zh?"已学习":"학습 완료"):(zh?"新卡片":"새 카드")}</div><button onClick={()=>setRevealed(!revealed)} className="relative flex min-h-[360px] w-full max-w-[430px] flex-col items-center justify-center rounded-3xl border border-white/5 bg-dark-200 p-8 shadow-xl"><span className="absolute right-5 top-4 text-sm text-stone-700">{current.script==="hiragana"?"ひらがな":"カタカナ"}</span><span className="text-8xl font-black text-stone-100">{current.kana}</span>{revealed?<div className="mt-7 text-center"><p className="text-2xl font-bold text-jeok-300">{current.romaji} · {current.sound}</p><p className="mt-3 text-base text-stone-300">{current.example}</p><p className="mt-2 text-xs text-stone-600">{zh?"对应文字":"짝 문자"} {current.pair}</p></div>:<p className="mt-8 text-xs text-stone-600">{zh?"点击查看发音":"탭해서 발음 보기"}</p>}<span onClick={e=>{e.stopPropagation();speak(current.kana);}} className="absolute bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-jeok-950 text-xl text-jeok-300">🔊</span></button>
      <div className="grid w-full max-w-[430px] grid-cols-2 gap-3"><button onClick={()=>answer(false)} className="rounded-2xl border border-jeok-800 bg-dark-200 py-4 font-bold text-jeok-400">← {zh?"不认识":"몰랐음"}</button><button onClick={()=>answer(true)} className="rounded-2xl border border-green-900 bg-dark-200 py-4 font-bold text-green-400">{zh?"认识":"알았음"} →</button></div><button onClick={()=>{setDeck(shuffle(deck));setIndex(0);setRevealed(false);}} className="text-xs text-stone-600 hover:text-stone-300">↻ {zh?"随机排序":"카드 섞기"}</button></main></div>;
}
