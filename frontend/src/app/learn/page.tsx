"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useUiLanguage, type UiLanguage } from "@/lib/i18n";
import { latestStudyCheckpoint, STORY_COURSES, type StoryCourse, type StudyCheckpoint } from "@/lib/studyCheckpoint";
import { latestServerContinuation, summarizeCourseProgress, type CourseSummary } from "./courseProgress";
import styles from "./page.module.css";

type Category = "all" | "language" | "build" | "exam" | "tools";
type Copy = Record<UiLanguage, string>;
type LearningLink = { href: string; symbol: string; title: Copy; description: Copy };
type LearningSection = { id: Exclude<Category, "all">; title: Copy; subtitle: Copy; links: LearningLink[] };

const daily: LearningLink = { href: "/daily-course", symbol: "✓", title: { ko: "추천 하루 학습", zh: "每日推荐学习" }, description: { ko: "중국어·영어·집중 과목을 오늘 가능한 시간에 맞춰", zh: "按今天的时间安排中文、英语与重点科目" } };

const sections: LearningSection[] = [
  { id: "language", title: { ko: "언어", zh: "语言" }, subtitle: { ko: "소리와 문장을 익히는 길", zh: "从声音到句子的学习路线" }, links: [
    { href: "/words", symbol: "文", title: { ko: "단어 암기장", zh: "单词记忆本" }, description: { ko: "중국어·영어 단어 카드 복습", zh: "复习中文与英语单词卡片" } },
    { href: "/english-basics", symbol: "A1", title: { ko: "영어 완전 기초", zh: "英语零基础" }, description: { ko: "하린의 교역문 이야기와 단어 직접 쓰기", zh: "荷凛的商门故事与单词默写" } },
    { href: "/english-phrases", symbol: "Ex", title: { ko: "영어 표현", zh: "英语表达" }, description: { ko: "예문·빈칸·대화로 연습", zh: "通过例句、填空与对话练习" } },
    { href: "/hsk5", symbol: "H5", title: { ko: "HSK5 한 달 코스", zh: "HSK5 一个月课程" }, description: { ko: "HSK4 공백 보강부터 모의고사까지", zh: "从 HSK4 查缺补漏到模拟考试" } },
  ] },
  { id: "build", title: { ko: "개발과 수학", zh: "编程与数学" }, subtitle: { ko: "직접 만들며 원리를 이해하는 길", zh: "边动手边理解原理" }, links: [
    { href: "/rust", symbol: "Rs", title: { ko: "Rust 완전 기초", zh: "Rust 系统学习" }, description: { ko: "서윤의 결계 이야기·소유권부터 TCP까지", zh: "徐允的结界故事：从所有权到 TCP" } },
    { href: "/cpp", symbol: "C++", title: { ko: "C++와 TCP/UDP", zh: "C++ 与 TCP/UDP" }, description: { ko: "민재의 통신소 복구·기초부터 실전까지 40단계", zh: "珉在修复通信站：从基础到实践的 40 阶段" } },
    { href: "/csharp", symbol: "C#", title: { ko: "C# · C++ 다음 과정", zh: "C# · C++ 后续课程" }, description: { ko: "유나의 기록관·.NET 기초부터 웹 API까지", zh: "有娜的记录馆：从 .NET 基础到 Web API" } },
    { href: "/python", symbol: "Py", title: { ko: "Python AI", zh: "Python AI" }, description: { ko: "변수부터 신경망까지 10단계", zh: "从变量到神经网络的 10 阶段" } },
    { href: "/math", symbol: "∫", title: { ko: "AI 미적분", zh: "AI 微积分" }, description: { ko: "중학생도 이해하는 10단계", zh: "容易理解的 10 阶段" } },
  ] },
  { id: "exam", title: { ko: "자격증", zh: "资格考试" }, subtitle: { ko: "개념을 연결하고 문제로 확인하는 길", zh: "串联概念并通过题目检验" }, links: [
    { href: "/sqld", symbol: "SQL", title: { ko: "SQLD 합격 100단계", zh: "SQLD 合格 100 阶段" }, description: { ko: "지안의 기록학교·모델링과 SQL", zh: "智安的档案学校：建模与 SQL" } },
    { href: "/network", symbol: "NET", title: { ko: "네트워크관리사 2급", zh: "网络管理员 2级" }, description: { ko: "도윤의 운무학당·네트워크와 TCP/UDP", zh: "道允的云雾学堂：网络与 TCP/UDP" } },
  ] },
  { id: "tools", title: { ko: "찾아보기", zh: "查找与记录" }, subtitle: { ko: "배운 것을 다시 찾고 확인하기", zh: "重新查找并回顾所学" }, links: [
    { href: "/search", symbol: "⌕", title: { ko: "단어 검색", zh: "搜索单词" }, description: { ko: "찾아서 즐겨찾기에 넣기", zh: "查找并收藏单词" } },
    { href: "/stats", symbol: "◷", title: { ko: "학습 통계", zh: "学习统计" }, description: { ko: "과목별 진행 기록 보기", zh: "查看各科目进度" } },
  ] },
];

const courseForPath = Object.entries(STORY_COURSES).reduce<Record<string, StoryCourse>>((result, [subject, course]) => {
  result[course.path] = subject as StoryCourse;
  return result;
}, {});

const phaseNames: Record<StudyCheckpoint["phase"], Copy> = {
  story: { ko: "이야기", zh: "故事" }, concept: { ko: "개념", zh: "概念" }, practice: { ko: "확인 문제", zh: "练习题" },
};

export default function LearnPage() {
  const language = useUiLanguage();
  const [recent, setRecent] = useState<StudyCheckpoint | null>(null);
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [courseProgress, setCourseProgress] = useState<Record<StoryCourse, CourseSummary> | null>(null);
  const [serverContinue, setServerContinue] = useState<{ subject: StoryCourse; step: number; updatedAt: number } | null>(null);

  useEffect(() => {
    setRecent(latestStudyCheckpoint());
    api.learning.progress().then(rows => {
      const summaries = summarizeCourseProgress(rows);
      setCourseProgress(summaries);
      setServerContinue(latestServerContinuation(rows, summaries));
    }).catch(() => { /* Course links work even if progress is unavailable. */ });
  }, []);

  const visibleSections = useMemo(() => sections
    .filter(section => category === "all" || category === section.id)
    .map(section => ({ ...section, links: section.links.filter(item =>
      `${section.title.ko} ${section.title.zh} ${section.subtitle.ko} ${section.subtitle.zh} ${item.title.ko} ${item.title.zh} ${item.description.ko} ${item.description.zh}`.toLowerCase().includes(query.trim().toLowerCase())
    ) }))
    .filter(section => section.links.length > 0), [category, query]);

  const labels: Record<Category, Copy> = {
    all: { ko: "전체", zh: "全部" }, language: { ko: "언어", zh: "语言" },
    build: { ko: "개발·수학", zh: "编程·数学" }, exam: { ko: "자격증", zh: "资格考试" }, tools: { ko: "찾아보기", zh: "查找" },
  };
  const localIsNewest = recent && (!serverContinue || recent.updatedAt >= serverContinue.updatedAt);
  const continuation = localIsNewest ? { subject: recent.subject, step: recent.step, phase: recent.phase, title: recent.title } : serverContinue ? { subject: serverContinue.subject, step: serverContinue.step, phase: null, title: null } : null;

  return <main className={styles.page}>
    <div className={styles.shell}>
      <Link href="/" className={styles.back}>← {language === "ko" ? "홈으로" : "返回首页"}</Link>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>LEARNING / {language === "ko" ? "나의 학습 서가" : "我的学习书架"}</p>
          <h1>{language === "ko" ? <>오늘은<br/><em>한 과목부터.</em></> : <>今天从<br/><em>一门课开始。</em></>}</h1>
          <p className={styles.heroDescription}>{language === "ko" ? "읽고, 풀고, 직접 만들어 보세요. 멈췄던 곳이 있다면 그 자리에서 다시 시작할 수 있어요." : "阅读、练习并亲手尝试。随时从上次停下的地方继续。"}</p>
          <Link href={daily.href} className={styles.dailyButton}><span className={styles.dailyButtonIcon}>{daily.symbol}</span><span><strong>{daily.title[language]}</strong><small>{daily.description[language]}</small></span><span aria-hidden="true">↗</span></Link>
        </div>
        <div className={styles.heroArt} aria-hidden="true"><div className={styles.orbitOne}/><div className={styles.orbitTwo}/><div className={styles.orbitThree}/><span className={styles.heroArtCenter}>01</span><span className={styles.heroArtNote}>START<br/>HERE</span></div>
      </header>

      {continuation && <Link href={`${STORY_COURSES[continuation.subject].path}?step=${continuation.step}`} className={styles.resume}>
        <div className={styles.resumeMarker} aria-hidden="true">↗</div>
        <div className={styles.resumeBody}><p className={styles.resumeLabel}>{language === "ko" ? "이어서 읽기" : "继续学习"} <span>· {continuation.phase ? `${phaseNames[continuation.phase][language]} ${language === "ko" ? "부터" : "开始"}` : language === "ko" ? "서버에 저장된 다음 단계" : "服务器保存的下一阶段"}</span></p><h2>{STORY_COURSES[continuation.subject].label}</h2><p>{continuation.step}{language === "ko" ? "단계" : "阶段"}{continuation.title ? ` · ${continuation.title}` : language === "ko" ? "부터 시작" : "开始"}</p></div>
        <span className={styles.resumeArrow} aria-hidden="true">→</span>
      </Link>}

      <section className={styles.library} aria-labelledby="learn-library-heading">
        <div className={styles.libraryHeading}><div><p className={styles.sectionEyebrow}>EXPLORE THE LIBRARY</p><h2 id="learn-library-heading">{language === "ko" ? "배우고 싶은 길 고르기" : "选择想学的方向"}</h2><p>{language === "ko" ? "한 번에 하나만 골라도 충분해요. 언제든 다른 과목으로 옮길 수 있습니다." : "一次选择一门即可，随时可以切换。"}</p></div><span className={styles.libraryCount}>{sections.reduce((sum, section) => sum + section.links.length, 0)} {language === "ko" ? "개의 길" : "门课程"}</span></div>
        <div className={styles.controls}>
          <div className={styles.filters} role="group" aria-label={language === "ko" ? "과목 분류" : "课程分类"}>
            {(Object.keys(labels) as Category[]).map(id => <button key={id} type="button" onClick={() => setCategory(id)} aria-pressed={category === id} className={category === id ? styles.filterActive : styles.filter}>{labels[id][language]}</button>)}
          </div>
          <div className={styles.search}>
            <span aria-hidden="true">⌕</span>
            <label htmlFor="learning-search" className={styles.srOnly}>{language === "ko" ? "학습 과정 검색" : "搜索课程"}</label>
            <input id="learning-search" value={query} onChange={event => { setQuery(event.target.value); setCategory("all"); }} placeholder={language === "ko" ? "과목이나 주제로 찾기" : "搜索课程或主题"}/>
            {query && <button type="button" onClick={() => setQuery("")} aria-label={language === "ko" ? "검색어 지우기" : "清除搜索"}>×</button>}
          </div>
        </div>
        <div className={styles.sections}>{visibleSections.length ? visibleSections.map(section => <section key={section.id} className={styles.section} data-tone={section.id}>
          <div className={styles.sectionHeading}><div className={styles.sectionTitle}><span className={styles.sectionLine}/><div><h3>{section.title[language]}</h3><p>{section.subtitle[language]}</p></div></div><span className={styles.sectionCount}>{String(section.links.length).padStart(2, "0")}</span></div>
          <div className={styles.cards}>{section.links.map((item, index) => {
            const subject = courseForPath[item.href];
            const progress = subject ? courseProgress?.[subject] : undefined;
            const total = subject ? STORY_COURSES[subject].total : undefined;
            const href = subject && progress && progress.completed > 0 && progress.next !== null ? `${item.href}?step=${progress.next}` : item.href;
            return <Link key={item.href} href={href} className={styles.card}>
              <span className={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</span><span className={styles.symbol} aria-hidden="true">{item.symbol}</span>
              <span className={styles.cardCopy}><strong>{item.title[language]}</strong><span>{item.description[language]}</span>{progress && total !== undefined && <span className={styles.progress}><span className={styles.progressTrack}><span style={{ width: `${Math.min(100, progress.completed / total * 100)}%` }}/></span><small>{progress.completed}/{total}{progress.completed > 0 && progress.next !== null ? ` · ${language === "ko" ? "다음" : "下一步"} ${progress.next}` : ""}</small></span>}</span>
              <span className={styles.cardArrow} aria-hidden="true">↗</span>
            </Link>;
          })}</div>
        </section>) : <p className={styles.empty}>{language === "ko" ? "맞는 과정이 없어요. 다른 단어로 찾아보세요." : "没有找到课程，请换个词搜索。"}</p>}</div>
      </section>
    </div>
  </main>;
}
