"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUiLanguage, type UiLanguage } from "@/lib/i18n";
import { latestStudyCheckpoint, STORY_COURSES, type StudyCheckpoint } from "@/lib/studyCheckpoint";

type LearningLink = {
  href: string;
  symbol: string;
  title: Record<UiLanguage, string>;
  description: Record<UiLanguage, string>;
};

const sections: { title: Record<UiLanguage, string>; links: LearningLink[] }[] = [
  {
    title: { ko: "오늘 시작하기", zh: "今天开始" },
    links: [
      { href: "/daily-course", symbol: "✓", title: { ko: "추천 하루 학습", zh: "每日推荐学习" }, description: { ko: "중국어·영어·집중 과목을 시간에 맞춰", zh: "按时间安排中文、英语与重点科目" } },
    ],
  },
  {
    title: { ko: "언어", zh: "语言" },
    links: [
      { href: "/words", symbol: "文", title: { ko: "단어 암기장", zh: "单词记忆本" }, description: { ko: "중국어·영어 단어 카드 복습", zh: "复习中文与英语单词卡片" } },
      { href: "/english-basics", symbol: "A1", title: { ko: "영어 완전 기초", zh: "英语零基础" }, description: { ko: "하린의 교역문 이야기와 단어 직접 쓰기", zh: "荷凛的商门故事与单词默写" } },
      { href: "/english-phrases", symbol: "Ex", title: { ko: "영어 표현", zh: "英语表达" }, description: { ko: "예문·빈칸·대화로 연습", zh: "通过例句、填空与对话练习" } },
      { href: "/hsk5", symbol: "H5", title: { ko: "HSK5 한 달 코스", zh: "HSK5 一个月课程" }, description: { ko: "HSK4 공백 보강부터 모의고사까지", zh: "从 HSK4 查缺补漏到模拟考试" } },
    ],
  },
  {
    title: { ko: "프로그래밍과 수학", zh: "编程与数学" },
    links: [
      { href: "/rust", symbol: "Rs", title: { ko: "Rust 완전 기초", zh: "Rust 系统学习" }, description: { ko: "서윤의 결계 이야기·소유권부터 TCP까지", zh: "徐允的结界故事：从所有权到 TCP" } },
      { href: "/cpp", symbol: "C++", title: { ko: "C++와 TCP/UDP", zh: "C++ 与 TCP/UDP" }, description: { ko: "민재의 통신소 복구·메모리부터 소켓까지", zh: "珉在修复通信站：从内存到套接字" } },
      { href: "/python", symbol: "Py", title: { ko: "Python AI", zh: "Python AI" }, description: { ko: "변수부터 신경망까지 10단계", zh: "从变量到神经网络的 10 阶段" } },
      { href: "/math", symbol: "∫", title: { ko: "AI 미적분", zh: "AI 微积分" }, description: { ko: "중학생도 이해하는 10단계", zh: "容易理解的 10 阶段" } },
    ],
  },
  {
    title: { ko: "자격증", zh: "资格考试" },
    links: [
      { href: "/sqld", symbol: "SQL", title: { ko: "SQLD 합격 100단계", zh: "SQLD 合格 100 阶段" }, description: { ko: "지안의 기록학교·모델링과 SQL", zh: "智安的档案学校：建模与 SQL" } },
      { href: "/network", symbol: "NET", title: { ko: "네트워크관리사 2급", zh: "网络管理员 2级" }, description: { ko: "도윤의 운무학당·네트워크와 TCP/UDP", zh: "道允的云雾学堂：网络与 TCP/UDP" } },
    ],
  },
  {
    title: { ko: "찾아보기", zh: "查找与记录" },
    links: [
      { href: "/search", symbol: "⌕", title: { ko: "단어 검색", zh: "搜索单词" }, description: { ko: "찾아서 즐겨찾기에 넣기", zh: "查找并收藏单词" } },
      { href: "/stats", symbol: "◷", title: { ko: "학습 통계", zh: "学习统计" }, description: { ko: "과목별 진행 기록 보기", zh: "查看各科目进度" } },
    ],
  },
];

export default function LearnPage() {
  const language = useUiLanguage();
  const [recent, setRecent] = useState<StudyCheckpoint | null>(null);
  useEffect(() => setRecent(latestStudyCheckpoint()), []);

  return <main className="min-h-dvh bg-dark-400 px-4 pb-12 pt-8 text-stone-100">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="text-sm text-stone-400 hover:text-stone-100">← {language === "ko" ? "홈" : "首页"}</Link>
      <h1 className="mt-5 text-3xl font-black">{language === "ko" ? "학습하기" : "开始学习"}</h1>
      <p className="mt-2 text-sm leading-6 text-stone-400">{language === "ko" ? "오늘 하고 싶은 과목을 하나 골라 시작하세요. 기존 진도는 각 과목에 그대로 있습니다." : "选择今天想学的一门科目。各科目原有进度会保留。"}</p>
      {recent && <Link href={`${STORY_COURSES[recent.subject].path}?step=${recent.step}`} className="mt-7 block rounded-2xl border border-emerald-700/60 bg-emerald-950/30 p-5 hover:border-emerald-400">
        <p className="text-xs font-bold text-emerald-300">{language === "ko" ? "지난 지점 이어하기" : "继续上次学习"}</p>
        <p className="mt-2 font-bold text-stone-100">{STORY_COURSES[recent.subject].label} · {recent.step}단계 · {recent.title}</p>
        <p className="mt-1 text-sm text-stone-400">{recent.phase === "story" ? "이야기" : recent.phase === "concept" ? "개념" : "확인"}부터 이어집니다. 입력 중인 답도 이 기기에 저장돼 있습니다.</p>
      </Link>}
      <div className="mt-8 space-y-9">
        {sections.map(section => <section key={section.title.ko}>
          <h2 className="mb-3 text-lg font-bold">{section.title[language]}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.links.map(item => <Link key={item.href} href={item.href} className="group flex min-h-24 items-center gap-4 rounded-2xl border border-white/5 bg-dark-200 p-4 transition-colors hover:border-emerald-800 hover:bg-dark-100">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-950/60 text-sm font-black text-emerald-300">{item.symbol}</span>
              <span className="min-w-0"><span className="block font-semibold">{item.title[language]}</span><span className="mt-1 block text-xs leading-5 text-stone-400">{item.description[language]}</span></span>
              <span className="ml-auto text-stone-600 group-hover:text-emerald-400">→</span>
            </Link>)}
          </div>
        </section>)}
      </div>
    </div>
  </main>;
}
