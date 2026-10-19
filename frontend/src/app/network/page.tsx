"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { NETWORK_CURRICULUM, NetworkLesson } from "./curriculum";
import { NETWORK_CHAPTERS, NETWORK_STORY } from "./story";
import { api } from "@/lib/api";
import { readUserStorage, writeUserStorage } from "@/lib/auth";
import StudyFlowBar from "@/components/StudyFlowBar";
import { useStudyFlow } from "@/lib/useStudyFlow";
import { clearStudyCheckpoint } from "@/lib/studyCheckpoint";

const STORAGE_KEY = "network_manager_progress_v1";
const TOTAL_LESSONS = NETWORK_CURRICULUM.length;
const readProgress = () => { if (typeof window === "undefined") return {}; try { return JSON.parse(readUserStorage(STORAGE_KEY) || "{}"); } catch { return {}; } };

function Lesson({ lesson, done, move, complete, onWrong }: { lesson:NetworkLesson; done:boolean; move:(id:number)=>void; complete:(minutes:number)=>Promise<void>; onWrong:(choice:number)=>void }) {
  const flow=useStudyFlow("network",lesson.id,lesson.title,{choice:null as number|null});
  const choice=flow.draft.choice;
  const setChoice=(value:number|null)=>flow.setDraft({choice:value});
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState(false);
  const startedAt=useRef(0);
  const scene=NETWORK_STORY[lesson.id-1];
  const chapter=NETWORK_CHAPTERS.find(({start,end})=>lesson.id>=start&&lesson.id<=end);
  useEffect(()=>{setSaving(false);setSaveError(false);startedAt.current=Date.now();window.scrollTo({top:0,behavior:"smooth"});},[lesson.id]);
  const correct=choice===lesson.quiz.answer;
  const finish=async()=>{if(!correct||saving)return;setSaving(true);setSaveError(false);try{await complete(Math.floor((Date.now()-startedAt.current)/60_000));}catch{setSaveError(true);}finally{setSaving(false);}};
  return <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-5">
    <button onClick={()=>move(0)} className="mb-4 text-sm text-stone-500 hover:text-stone-200">← {TOTAL_LESSONS}단계 목록</button>
    <div className="mb-4 flex items-center gap-2"><span className="rounded-full bg-cyan-950 px-3 py-1 text-xs font-bold text-cyan-300">{lesson.id}/{TOTAL_LESSONS}</span><span className="rounded-full bg-dark-200 px-3 py-1 text-xs text-stone-400">{lesson.section}</span></div>
    <StudyFlowBar phase={flow.phase} paused={flow.paused} onPause={flow.setPaused} onPhase={flow.changePhase}/>
    {!flow.paused&&<>
    <article className="space-y-5 rounded-3xl border border-white/5 bg-dark-200 p-5 sm:p-7">
      <div><p className="mb-1 text-xs font-bold text-cyan-400">네트워크관리사 2급</p><h1 className="text-2xl font-black text-stone-100 sm:text-3xl">{lesson.title}</h1></div>
      {flow.phase==="story"&&<section className="rounded-2xl border border-cyan-900/50 bg-cyan-950/20 p-5"><p className="text-xs font-bold text-cyan-300">이어지는 이야기 · 가상의 운무학당 · {chapter?.title}</p>{chapter?.start===lesson.id&&<p className="mt-3 text-sm leading-8 text-stone-300">{chapter.introduction}</p>}<p className="mt-3 text-sm leading-8 text-stone-100">{scene.scene}</p></section>}
      {flow.phase==="concept"&&<>
      <section className="rounded-2xl bg-dark-100 p-5"><h2 className="font-bold text-cyan-300">이 장면을 실제 개념으로 풀어 읽기</h2><p className="mt-3 text-sm leading-7 text-stone-100">{scene.bridge}</p>{lesson.summary&&<p className="mt-3 text-sm leading-7 text-stone-300">{lesson.summary}</p>}<p className="mt-3 text-xs leading-6 text-stone-500">학당과 구조 요청은 이해를 돕는 가상 사건입니다. 실제 장비와 프로토콜은 아래 정의·명령·패킷 규칙으로 판단하세요.</p></section>
      <section><h2 className="mb-3 text-sm font-bold text-stone-100">필기·실기 핵심</h2><ul className="space-y-2">{lesson.points.map(p=><li key={p} className="rounded-xl bg-dark-100 px-4 py-3 text-sm leading-6 text-stone-300">• {p}</li>)}</ul></section>
      {lesson.lab&&<section><h2 className="mb-3 text-sm font-bold text-stone-100">실습·계산</h2><pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-6 text-emerald-300">{lesson.lab}</pre></section>}
      <aside className="rounded-xl border border-amber-900/60 bg-amber-950/20 px-4 py-3 text-sm leading-6 text-amber-200"><strong>시험 함정:</strong> {lesson.trap}</aside>
      </>}
      {flow.phase!=="practice"&&<button onClick={()=>flow.changePhase(flow.phase==="story"?"concept":"practice")} className="w-full rounded-xl bg-cyan-600 py-3 font-bold text-white">{flow.phase==="story"?"실제 개념 보기 →":"확인 문제 풀기 →"}</button>}
    </article>
    {flow.phase==="practice"&&<section className="mt-5 rounded-3xl border border-white/5 bg-dark-200 p-5 sm:p-7">
      <p className="mb-2 text-xs font-bold text-cyan-400">단계 확인 문제</p><h2 className="mb-4 font-bold leading-7 text-stone-100">{lesson.quiz.question}</h2>
      <div className="space-y-2">{lesson.quiz.options.map((o,i)=><button key={o} disabled={choice!==null} onClick={()=>{setChoice(i);if(i!==lesson.quiz.answer)onWrong(i);}} className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${choice===null?"border-white/5 bg-dark-100 text-stone-300 hover:border-cyan-700":i===lesson.quiz.answer?"border-emerald-700 bg-emerald-950/30 text-emerald-300":i===choice?"border-red-800 bg-red-950/30 text-red-300":"border-white/5 bg-dark-100 text-stone-600"}`}>{i+1}. {o}</button>)}</div>
      {choice!==null&&<div className={`mt-4 rounded-xl px-4 py-3 text-sm leading-6 ${correct?"bg-emerald-950/30 text-emerald-300":"bg-red-950/25 text-red-300"}`}>{correct?"정답입니다. ":"다시 기억하세요. "}{lesson.quiz.explanation}{!correct&&<button onClick={()=>setChoice(null)} className="mt-3 block rounded-lg border border-red-700 px-3 py-1.5 text-xs font-bold">다시 풀기</button>}</div>}
      {saveError&&<p role="alert" className="mt-4 text-sm text-red-300">진도를 저장하지 못했습니다. 연결을 확인한 뒤 다시 눌러 주세요.</p>}
      <button disabled={!correct||saving} onClick={finish} className="mt-4 w-full rounded-xl bg-cyan-600 py-3.5 font-bold text-white hover:bg-cyan-500 disabled:opacity-30">{saving?"저장 중...":saveError?"저장 다시 시도":done?"완료됨 · 다음 단계":"이 단계 완료하고 다음으로"}</button>
    </section>}
    <div className="mt-4 grid grid-cols-2 gap-3"><button disabled={lesson.id===1||saving} onClick={()=>move(lesson.id-1)} className="rounded-xl bg-dark-200 py-3 text-sm text-stone-400 disabled:opacity-30">← 이전</button><button disabled={lesson.id===TOTAL_LESSONS||saving} onClick={()=>move(lesson.id+1)} className="rounded-xl bg-dark-200 py-3 text-sm text-stone-400 disabled:opacity-30">다음 →</button></div>
    </>}
  </main>;
}

export default function NetworkPage(){
  const [selected,setSelected]=useState(0);const [progress,setProgress]=useState<Record<number,boolean>>({});const [query,setQuery]=useState("");const [section,setSection]=useState("전체");
  useEffect(()=>{setProgress(readProgress());api.learning.progress("network").then(rows=>setProgress(prev=>({...prev,...Object.fromEntries(rows.filter(row=>row.completed).map(row=>[Number(row.unit_id),true]))}))).catch(()=>{});const step=Number(new URLSearchParams(window.location.search).get("step"));if(step>=1&&step<=TOTAL_LESSONS)setSelected(step);},[]);
  const completed=Object.values(progress).filter(Boolean).length;
  const sections=["전체",...Array.from(new Set(NETWORK_CURRICULUM.map(x=>x.section)))];
  const filtered=useMemo(()=>NETWORK_CURRICULUM.filter(x=>(section==="전체"||x.section===section)&&`${x.title} ${x.points.join(" ")}`.toLowerCase().includes(query.toLowerCase())),[query,section]);
  const current=selected?NETWORK_CURRICULUM[selected-1]:null;
  const finish=async(id:number,durationMinutes:number)=>{const controller=new AbortController();const timeout=window.setTimeout(()=>controller.abort(),15_000);try{await api.learning.complete("network",String(id),{completed:true,score:100,duration_minutes:durationMinutes,title:NETWORK_CURRICULUM[id-1].title},controller.signal);}finally{window.clearTimeout(timeout);}const next={...readProgress(),...progress,[id]:true};try{writeUserStorage(STORAGE_KEY,JSON.stringify(next));}catch{/* Server progress is authoritative. */}setProgress(previous=>({...previous,[id]:true}));if(id===TOTAL_LESSONS)clearStudyCheckpoint("network");setSelected(id<TOTAL_LESSONS?id+1:0);};
  if(current)return <Lesson lesson={current} done={!!progress[current.id]} move={setSelected} complete={(minutes)=>finish(current.id,minutes)} onWrong={(choice)=>api.learning.addMistake({subject:"network",item_key:`lesson-${current.id}`,question:current.quiz.question,correct_answer:current.quiz.options[current.quiz.answer],user_answer:current.quiz.options[choice],explanation:current.quiz.explanation}).catch(()=>{})}/>;
  return <div className="min-h-dvh bg-dark-400"><header className="border-b border-white/5 bg-dark-300 px-5 pb-5 pt-10"><div className="mx-auto max-w-5xl"><Link href="/learn" className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-200">← 학습 선택</Link><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-cyan-400">Network Administrator Level 2 + Transport</p><h1 className="mt-1 text-3xl font-black text-stone-100">네트워크·TCP/UDP {TOTAL_LESSONS}단계</h1><p className="mt-2 text-sm text-stone-500">기존 100단계에 전송 계층·소켓·보안 심화 20단계 추가</p></div><div className="text-right"><p className="text-2xl font-black text-stone-100">{completed}<span className="text-sm text-stone-500">/{TOTAL_LESSONS}</span></p><p className="text-xs text-stone-600">완료</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-dark-100"><div className="h-full rounded-full bg-cyan-500" style={{width:`${completed/TOTAL_LESSONS*100}%`}}/></div><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="TCP, UDP, 서브넷, DNS, 소켓 검색..." className="rounded-xl border border-stone-700 bg-dark-200 px-4 py-3 text-sm text-stone-200 outline-none focus:border-cyan-600"/><select value={section} onChange={e=>setSection(e.target.value)} className="rounded-xl border border-stone-700 bg-dark-200 px-4 py-3 text-sm text-stone-300 outline-none">{sections.map(s=><option key={s}>{s}</option>)}</select></div></div></header>
    <main className="mx-auto grid max-w-5xl gap-3 px-4 py-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(x=><button key={x.id} onClick={()=>setSelected(x.id)} className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${progress[x.id]?"border-emerald-900 bg-emerald-950/15":"border-white/5 bg-dark-200 hover:border-cyan-800"}`}><div className="mb-2 flex items-center justify-between"><span className={`text-xs font-black ${progress[x.id]?"text-emerald-400":"text-cyan-400"}`}>{progress[x.id]?"✓":x.id}단계</span><span className="text-[10px] text-stone-600">{x.section}</span></div><h2 className="font-bold leading-6 text-stone-100">{x.title}</h2><p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{x.points[0]}</p></button>)}</main>
  </div>;
}
