"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NETWORK_CURRICULUM, NetworkLesson } from "./curriculum";

const STORAGE_KEY = "network_manager_progress_v1";
const readProgress = () => { if (typeof window === "undefined") return {}; try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } };

function Lesson({ lesson, done, move, complete }: { lesson:NetworkLesson; done:boolean; move:(id:number)=>void; complete:()=>void }) {
  const [choice,setChoice]=useState<number|null>(null);
  useEffect(()=>{setChoice(null);window.scrollTo({top:0,behavior:"smooth"});},[lesson.id]);
  const correct=choice===lesson.quiz.answer;
  return <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-5">
    <button onClick={()=>move(0)} className="mb-4 text-sm text-stone-500 hover:text-stone-200">← 100단계 목록</button>
    <div className="mb-4 flex items-center gap-2"><span className="rounded-full bg-cyan-950 px-3 py-1 text-xs font-bold text-cyan-300">{lesson.id}/100</span><span className="rounded-full bg-dark-200 px-3 py-1 text-xs text-stone-400">{lesson.section}</span></div>
    <article className="space-y-5 rounded-3xl border border-white/5 bg-dark-200 p-5 sm:p-7">
      <div><p className="mb-1 text-xs font-bold text-cyan-400">네트워크관리사 2급</p><h1 className="text-2xl font-black text-stone-100 sm:text-3xl">{lesson.title}</h1></div>
      <p className="text-sm leading-7 text-stone-300">{lesson.summary}</p>
      <section><h2 className="mb-3 text-sm font-bold text-stone-100">필기·실기 핵심</h2><ul className="space-y-2">{lesson.points.map(p=><li key={p} className="rounded-xl bg-dark-100 px-4 py-3 text-sm leading-6 text-stone-300">• {p}</li>)}</ul></section>
      {lesson.lab&&<section><h2 className="mb-3 text-sm font-bold text-stone-100">실습·계산</h2><pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-6 text-emerald-300">{lesson.lab}</pre></section>}
      <aside className="rounded-xl border border-amber-900/60 bg-amber-950/20 px-4 py-3 text-sm leading-6 text-amber-200"><strong>시험 함정:</strong> {lesson.trap}</aside>
    </article>
    <section className="mt-5 rounded-3xl border border-white/5 bg-dark-200 p-5 sm:p-7">
      <p className="mb-2 text-xs font-bold text-cyan-400">단계 확인 문제</p><h2 className="mb-4 font-bold leading-7 text-stone-100">{lesson.quiz.question}</h2>
      <div className="space-y-2">{lesson.quiz.options.map((o,i)=><button key={o} disabled={choice!==null} onClick={()=>setChoice(i)} className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${choice===null?"border-white/5 bg-dark-100 text-stone-300 hover:border-cyan-700":i===lesson.quiz.answer?"border-emerald-700 bg-emerald-950/30 text-emerald-300":i===choice?"border-red-800 bg-red-950/30 text-red-300":"border-white/5 bg-dark-100 text-stone-600"}`}>{i+1}. {o}</button>)}</div>
      {choice!==null&&<div className={`mt-4 rounded-xl px-4 py-3 text-sm leading-6 ${correct?"bg-emerald-950/30 text-emerald-300":"bg-red-950/25 text-red-300"}`}>{correct?"정답입니다. ":"다시 기억하세요. "}{lesson.quiz.explanation}</div>}
      <button disabled={!correct} onClick={complete} className="mt-4 w-full rounded-xl bg-cyan-600 py-3.5 font-bold text-white hover:bg-cyan-500 disabled:opacity-30">{done?"완료됨 · 다음 단계":"이 단계 완료하고 다음으로"}</button>
    </section>
    <div className="mt-4 grid grid-cols-2 gap-3"><button disabled={lesson.id===1} onClick={()=>move(lesson.id-1)} className="rounded-xl bg-dark-200 py-3 text-sm text-stone-400 disabled:opacity-30">← 이전</button><button disabled={lesson.id===100} onClick={()=>move(lesson.id+1)} className="rounded-xl bg-dark-200 py-3 text-sm text-stone-400 disabled:opacity-30">다음 →</button></div>
  </main>;
}

export default function NetworkPage(){
  const router=useRouter();const [selected,setSelected]=useState(0);const [progress,setProgress]=useState<Record<number,boolean>>({});const [query,setQuery]=useState("");const [section,setSection]=useState("전체");
  useEffect(()=>setProgress(readProgress()),[]);
  const completed=Object.values(progress).filter(Boolean).length;
  const sections=["전체",...Array.from(new Set(NETWORK_CURRICULUM.map(x=>x.section)))];
  const filtered=useMemo(()=>NETWORK_CURRICULUM.filter(x=>(section==="전체"||x.section===section)&&`${x.title} ${x.points.join(" ")}`.toLowerCase().includes(query.toLowerCase())),[query,section]);
  const current=selected?NETWORK_CURRICULUM[selected-1]:null;
  const finish=(id:number)=>{const next={...progress,[id]:true};setProgress(next);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));setSelected(id<100?id+1:0);};
  if(current)return <Lesson lesson={current} done={!!progress[current.id]} move={setSelected} complete={()=>finish(current.id)}/>;
  return <div className="min-h-dvh bg-dark-400"><header className="border-b border-white/5 bg-dark-300 px-5 pb-5 pt-10"><div className="mx-auto max-w-5xl"><button onClick={()=>router.back()} className="mb-4 text-sm text-stone-500 hover:text-stone-200">← 홈으로</button><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-cyan-400">Network Administrator Level 2</p><h1 className="mt-1 text-3xl font-black text-stone-100">네트워크관리사 2급 100단계</h1><p className="mt-2 text-sm text-stone-500">필기 50분부터 실기 80분까지 한 번에 대비</p></div><div className="text-right"><p className="text-2xl font-black text-stone-100">{completed}<span className="text-sm text-stone-500">/100</span></p><p className="text-xs text-stone-600">완료</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-dark-100"><div className="h-full rounded-full bg-cyan-500" style={{width:`${completed}%`}}/></div><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="서브넷, DNS, Linux, 케이블 검색..." className="rounded-xl border border-stone-700 bg-dark-200 px-4 py-3 text-sm text-stone-200 outline-none focus:border-cyan-600"/><select value={section} onChange={e=>setSection(e.target.value)} className="rounded-xl border border-stone-700 bg-dark-200 px-4 py-3 text-sm text-stone-300 outline-none">{sections.map(s=><option key={s}>{s}</option>)}</select></div></div></header>
    <main className="mx-auto grid max-w-5xl gap-3 px-4 py-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(x=><button key={x.id} onClick={()=>setSelected(x.id)} className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${progress[x.id]?"border-emerald-900 bg-emerald-950/15":"border-white/5 bg-dark-200 hover:border-cyan-800"}`}><div className="mb-2 flex items-center justify-between"><span className={`text-xs font-black ${progress[x.id]?"text-emerald-400":"text-cyan-400"}`}>{progress[x.id]?"✓":x.id}단계</span><span className="text-[10px] text-stone-600">{x.section}</span></div><h2 className="font-bold leading-6 text-stone-100">{x.title}</h2><p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{x.points[0]}</p></button>)}</main>
  </div>;
}
