"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SQLD_CURRICULUM } from "../sqld/curriculum";
import { NETWORK_CURRICULUM } from "../network/curriculum";

type Subject="zh"|"ja"|"db"|"network";
type Progress=Record<number,Partial<Record<Subject,boolean>>>;
const STORAGE_KEY="recommended_daily_course_v1";
const SUBJECTS:Subject[]=["zh","ja","db","network"];
const META={zh:{icon:"中",name:"중국어 HSK 4급",color:"text-red-300",bg:"bg-red-950/30",minutes:25},ja:{icon:"あ",name:"일본어 기초",color:"text-pink-300",bg:"bg-pink-950/30",minutes:20},db:{icon:"DB",name:"SQLD",color:"text-violet-300",bg:"bg-violet-950/30",minutes:25},network:{icon:"NET",name:"네트워크관리사 2급",color:"text-cyan-300",bg:"bg-cyan-950/30",minutes:25}} as const;
const HSK4_TOPICS=["방향보어와 결과보어","把자문","被자문","비교문 比·没有","정도보어 得","가능보어","虽然…但是…","不但…而且…","只要…就…","只有…才…","如果…就…","即使…也…","一边…一边…","越来越·越…越…","除了…以外","是…的 강조","연동문과 겸어문","접속사 因此·所以","시간 표현과 了","过·着 경험과 상태"];
const HSK4_THEMES=["학교와 학습","직장과 업무","가족과 관계","식사와 건강","쇼핑과 소비","여행과 교통","날씨와 환경","취미와 운동","감정과 의견","사회생활"];
const KANA_ROWS=["あ행 あいうえお","か행 かきくけこ","さ행 さしすせそ","た행 たちつてと","な행 なにぬねの","は행 はひふへほ","ま행 まみむめも","や행 やゆよ","ら행 らりるれろ","わ행 わをん","가타카나 ア행","가타카나 カ행","가타카나 サ행","가타카나 タ행","가타카나 ナ행","가타카나 ハ행","가타카나 マ행","가타카나 ヤ·ラ·ワ행","탁음 が·ざ·だ·ば행","반탁음 ぱ행","요음 きゃ·しゅ·ちょ","촉음 작은 っ","장음과 ー","히라가나 종합 복습","가타카나 종합 복습"];
const N5_TOPICS=["인사와 자기소개","숫자·나이·시간","가족과 사람","학교와 교실","집과 생활용품","음식과 주문","요일과 날짜","교통과 길 찾기","쇼핑과 가격","날씨와 계절","い형용사","な형용사","동사 ます형","조사 は·が·を","조사 に·で·へ","존재 あります·います","て형 기초","과거형과 부정형","좋아함과 능력","N5 문장 종합"];

function chinese(day:number){const topic=HSK4_TOPICS[(day-1)%HSK4_TOPICS.length];const theme=HSK4_THEMES[Math.floor((day-1)/2)%HSK4_THEMES.length];return {title:`${topic} · ${theme}`,detail:`HSK 4급 단어 15개를 소리 내어 읽고 ${topic} 문장 5개를 만든 뒤, 카드 복습을 완료하세요.`,href:"/words?hsk=4"};}
function japanese(day:number){if(day<=25)return {title:KANA_ROWS[day-1],detail:"문자 모양과 소리를 연결하고 발음 버튼으로 3회 확인한 뒤 카드에서 알았음/몰랐음을 기록하세요.",href:"/words?course=kana"};const topic=N5_TOPICS[(day-26)%N5_TOPICS.length];return {title:`JLPT N5 · ${topic}`,detail:`N5 단어 12개와 ${topic} 예문을 읽고, 일본어 음성을 따라 말한 뒤 복습 카드를 완료하세요.`,href:"/words?ja=N5"};}

export default function DailyCoursePage(){
  const router=useRouter();const [day,setDay]=useState(1);const [progress,setProgress]=useState<Progress>({});
  useEffect(()=>{try{const saved:Progress=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");setProgress(saved);const next=Array.from({length:100},(_,i)=>i+1).find(d=>!SUBJECTS.every(s=>saved[d]?.[s]));setDay(next||100);}catch{}},[]);
  const completedDays=useMemo(()=>Array.from({length:100},(_,i)=>i+1).filter(d=>SUBJECTS.every(s=>progress[d]?.[s])).length,[progress]);
  const tasks={zh:chinese(day),ja:japanese(day),db:{title:`${day}단계 · ${SQLD_CURRICULUM[day-1].title}`,detail:SQLD_CURRICULUM[day-1].points[0],href:`/sqld?step=${day}`},network:{title:`${day}단계 · ${NETWORK_CURRICULUM[day-1].title}`,detail:NETWORK_CURRICULUM[day-1].points[0],href:`/network?step=${day}`}};
  const toggle=(subject:Subject)=>{const next={...progress,[day]:{...progress[day],[subject]:!progress[day]?.[subject]}};setProgress(next);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));};
  const todayDone=SUBJECTS.every(s=>progress[day]?.[s]);
  return <div className="min-h-dvh bg-dark-400"><header className="border-b border-white/5 bg-dark-300 px-5 pb-5 pt-10"><div className="mx-auto max-w-4xl"><button onClick={()=>router.back()} className="mb-4 text-sm text-stone-500">← 홈으로</button><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-emerald-400">매일 약 95분</p><h1 className="mt-1 text-3xl font-black text-stone-100">추천 하루 학습</h1><p className="mt-2 text-sm text-stone-500">HSK 4급 · 일본어 기초 · SQLD · 네트워크관리사</p></div><div className="text-right"><p className="text-2xl font-black text-stone-100">{completedDays}<span className="text-sm text-stone-600">/100일</span></p><p className="text-xs text-stone-600">완료</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-dark-100"><div className="h-full bg-emerald-500" style={{width:`${completedDays}%`}}/></div></div></header>
    <main className="mx-auto max-w-4xl px-4 py-5"><div className="mb-5 flex items-center justify-between rounded-2xl bg-dark-200 p-3"><button disabled={day===1} onClick={()=>setDay(day-1)} className="rounded-xl px-4 py-2 text-stone-400 disabled:opacity-30">←</button><div className="text-center"><p className="text-xl font-black text-stone-100">{day}일차</p><p className={`text-xs ${todayDone?"text-emerald-400":"text-stone-600"}`}>{todayDone?"오늘 학습 완료 ✓":"네 과목을 하나씩 완료하세요"}</p></div><button disabled={day===100} onClick={()=>setDay(day+1)} className="rounded-xl px-4 py-2 text-stone-400 disabled:opacity-30">→</button></div>
      <div className="space-y-3">{SUBJECTS.map(subject=>{const meta=META[subject],task=tasks[subject],done=!!progress[day]?.[subject];return <article key={subject} className={`rounded-2xl border p-4 ${done?"border-emerald-800 bg-emerald-950/15":"border-white/5 bg-dark-200"}`}><div className="flex items-start gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black ${meta.bg} ${meta.color}`}>{meta.icon}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className={`text-xs font-bold ${meta.color}`}>{meta.name}</p><span className="text-[10px] text-stone-600">{meta.minutes}분</span></div><h2 className="mt-1 font-bold leading-6 text-stone-100">{task.title}</h2><p className="mt-1 text-xs leading-5 text-stone-500">{task.detail}</p></div></div><div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><Link href={task.href} className="rounded-xl bg-dark-100 py-3 text-center text-sm font-bold text-stone-300 hover:text-white">학습 화면 열기 →</Link><button onClick={()=>toggle(subject)} className={`rounded-xl px-5 text-sm font-bold ${done?"bg-emerald-700 text-white":"border border-stone-700 text-stone-400"}`}>{done?"완료 ✓":"완료 체크"}</button></div></article>})}</div>
      <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">{Array.from({length:100},(_,i)=>i+1).map(d=><button key={d} onClick={()=>setDay(d)} className={`aspect-square rounded-lg text-[10px] font-bold ${d===day?"ring-2 ring-emerald-400":SUBJECTS.every(s=>progress[d]?.[s])?"bg-emerald-800 text-white":"bg-dark-200 text-stone-600"}`}>{d}</button>)}</div>
    </main></div>;
}
