"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type LangTab = "zh" | "en" | "ja";

type Overview = {
  zh_streak: number; en_streak: number; ja_streak: number;
  zh_today: number; en_today: number; ja_today: number;
  zh_levels: { level: string; total: number; reviewed: number; mastered: number }[];
  en_levels: { level: string; total: number; reviewed: number; mastered: number }[];
  ja_levels: { level: string; total: number; reviewed: number; mastered: number }[];
};

type Achievement = {
  id: number;
  code: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  requirement_value: number;
  unlocked: boolean;
};

function ProgressBar({ value, max, color = "bg-jeok-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 bg-dark-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Heatmap({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.count), 1);
  const getColor = (count: number) => {
    if (count === 0) return "bg-dark-100";
    const ratio = count / max;
    if (ratio < 0.25) return "bg-jeok-900";
    if (ratio < 0.5)  return "bg-jeok-700";
    if (ratio < 0.75) return "bg-jeok-600";
    return "bg-jeok-400";
  };

  // 13주 × 7일 그리드 (일요일 시작)
  const weeks: { date: string; count: number }[][] = [];
  // 첫 날의 요일에 맞춰 앞에 빈칸 추가
  const firstDay = new Date(data[0].date).getDay();
  const padded = [...Array(firstDay).fill(null), ...data];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7) as { date: string; count: number }[]);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4">
      <p className="text-sm font-semibold text-stone-200 mb-3">최근 90일 학습 기록</p>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) =>
              day ? (
                <div
                  key={di}
                  title={`${day.date}: ${day.count}개`}
                  className={`w-3 h-3 rounded-sm ${getColor(day.count)} ${day.date === today ? "ring-1 ring-jeok-400" : ""}`}
                />
              ) : (
                <div key={di} className="w-3 h-3" />
              )
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-xs text-stone-700">적음</span>
        {["bg-dark-100", "bg-jeok-900", "bg-jeok-700", "bg-jeok-600", "bg-jeok-400"].map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span className="text-xs text-stone-700">많음</span>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [history, setHistory] = useState<{ date: string; count: number }[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementStats, setAchievementStats] = useState<{
    total: number;
    unlocked: number;
    completion_rate: number;
    by_category: { category: string; total: number; unlocked: number }[];
  } | null>(null);
  const [tab, setTab] = useState<LangTab>("zh");

  useEffect(() => {
    api.stats.overview().then(setData).catch(() => {});
    api.stats.history().then(setHistory).catch(() => {});
    api.achievements.list().then(setAchievements).catch(() => {});
    api.achievements.stats().then(setAchievementStats).catch(() => {});
  }, []);

  if (!data) return (
    <div className="flex min-h-dvh items-center justify-center bg-dark-400 text-stone-600 text-sm">불러오는 중...</div>
  );

  const levels = tab === "zh" ? data.zh_levels : tab === "ja" ? data.ja_levels : data.en_levels;
  const streak = tab === "zh" ? data.zh_streak : tab === "ja" ? data.ja_streak : data.en_streak;
  const today  = tab === "zh" ? data.zh_today  : tab === "ja" ? data.ja_today  : data.en_today;
  const totalAll    = levels.reduce((s, l) => s + l.total, 0);
  const reviewedAll = levels.reduce((s, l) => s + l.reviewed, 0);
  const masteredAll = levels.reduce((s, l) => s + l.mastered, 0);

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      {/* 헤더 */}
      <div className="px-6 pt-10 pb-5 bg-dark-300 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-all">
            ←
          </button>
          <h1 className="text-2xl font-bold text-stone-200">학습 통계</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-4 overflow-y-auto">
        {/* 히트맵 */}
        <Heatmap data={history} />

        {/* 업적 섹션 */}
        {achievementStats && (
          <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold text-stone-200">업적</p>
              <p className="text-xs text-stone-500">{achievementStats.unlocked} / {achievementStats.total}개 해금</p>
            </div>
            <ProgressBar value={achievementStats.unlocked} max={achievementStats.total} color="bg-purple-500" />

            {/* 카테고리별 업적 */}
            <div className="mt-4 space-y-2">
              {achievementStats.by_category.map((cat) => {
                const catLabel: Record<string, string> = {
                  streak: "🔥 연속 학습",
                  mastery: "📚 단어 습득",
                  consistency: "🔄 복습 달성",
                };
                const catUnlocked = achievements.filter((a) => a.category === cat.category && a.unlocked);
                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-xs text-stone-400 w-20">{catLabel[cat.category] || cat.category}</span>
                    <div className="flex-1 h-1.5 bg-dark-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-700 rounded-full transition-all duration-500"
                        style={{ width: `${(cat.unlocked / (cat.total || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-stone-600">{cat.unlocked}/{cat.total}</span>
                  </div>
                );
              })}
            </div>

            {/* 해금된 업적 표시 */}
            {achievements.filter((a) => a.unlocked).length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-700">
                <p className="text-xs text-stone-500 mb-2">해금된 업적</p>
                <div className="flex flex-wrap gap-2">
                  {achievements.filter((a) => a.unlocked).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-1.5 bg-purple-900/30 border border-purple-800 rounded-full px-3 py-1"
                      title={a.description}
                    >
                      <span>{a.icon}</span>
                      <span className="text-xs text-purple-300">{a.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 언어 탭 */}
        <div className="flex bg-dark-200 rounded-2xl p-1 gap-1">
          {(["zh", "en", "ja"] as LangTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === t ? "bg-jeok-600 text-white shadow-lg shadow-jeok-900/50" : "text-stone-500 hover:text-stone-300"}`}>
              {t === "zh" ? "중국어" : t === "en" ? "영어" : "일본어"}
            </button>
          ))}
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-dark-200 border border-white/5 rounded-2xl px-4 py-4 text-center">
            <p className="text-2xl font-bold text-jeok-400">{streak}</p>
            <p className="text-xs text-stone-500 mt-1">연속 학습일</p>
          </div>
          <div className="bg-dark-200 border border-white/5 rounded-2xl px-4 py-4 text-center">
            <p className="text-2xl font-bold text-green-400">{today}</p>
            <p className="text-xs text-stone-500 mt-1">오늘 복습</p>
          </div>
          <div className="bg-dark-200 border border-white/5 rounded-2xl px-4 py-4 text-center">
            <p className="text-2xl font-bold text-stone-200">{masteredAll}</p>
            <p className="text-xs text-stone-500 mt-1">완전 습득</p>
          </div>
        </div>

        {/* 전체 진행률 */}
        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold text-stone-200">전체 진행률</p>
            <p className="text-xs text-stone-500">{reviewedAll} / {totalAll}개</p>
          </div>
          <ProgressBar value={reviewedAll} max={totalAll} color="bg-jeok-500" />
          <div className="flex justify-between text-xs text-stone-600">
            <span>학습 시작 {Math.round((reviewedAll / (totalAll || 1)) * 100)}%</span>
            <span>완전 습득 {Math.round((masteredAll / (totalAll || 1)) * 100)}%</span>
          </div>
        </div>

        {/* 레벨별 진행률 */}
        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4 space-y-4">
          <p className="text-sm font-semibold text-stone-200">레벨별 진행률</p>
          {levels.map((l) => (
            <div key={l.level} className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-300 font-medium">{l.level}</span>
                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <span className="text-jeok-500">{l.reviewed}학습</span>
                  <span>·</span>
                  <span className="text-green-600">{l.mastered}습득</span>
                  <span>/ {l.total}</span>
                </div>
              </div>
              <div className="relative h-1.5 bg-dark-100 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-jeok-800 rounded-full transition-all duration-500"
                  style={{ width: `${(l.reviewed / (l.total || 1)) * 100}%` }} />
                <div className="absolute inset-y-0 left-0 bg-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${(l.mastered / (l.total || 1)) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
