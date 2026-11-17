import Link from "next/link";
import TodayStudy from "@/components/TodayStudy";

export default function DailyCoursePage() {
  return <div className="min-h-dvh bg-dark-400 text-stone-100">
    <header className="border-b border-white/5 bg-dark-300 px-5 py-7">
      <div className="mx-auto max-w-3xl">
        <Link href="/learn" className="text-sm text-stone-300 hover:text-white">← 학습 선택</Link>
        <p className="mt-5 text-xs font-bold text-emerald-300">DAILY STUDY</p>
        <h1 className="mt-1 text-3xl font-black">오늘은 한 걸음</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-stone-300">주력 과목의 다음 단계나 짧은 단어 복습 하나부터 시작하세요. 다른 과목은 여유 있을 때 열어 볼 수 있습니다.</p>
      </div>
    </header>
    <main className="mx-auto max-w-3xl pb-12"><TodayStudy /></main>
  </div>;
}
