import { useState } from "react";

type Achievement = {
  id: number;
  code: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  requirement_value: number;
  progress: number;
  unlocked_at: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  streak: "스트릭",
  mastery: "습득",
  consistency: "일관성",
  speed: "속도",
};

const CATEGORY_COLOR: Record<string, string> = {
  streak: "bg-orange-900/30 text-orange-400 border-orange-800",
  mastery: "bg-purple-900/30 text-purple-400 border-purple-800",
  consistency: "bg-blue-900/30 text-blue-400 border-blue-800",
  speed: "bg-green-900/30 text-green-400 border-green-800",
};

export function AchievementBadge({ achievement, size = "md" }: { achievement: Achievement; size?: "sm" | "md" | "lg" }) {
  const [showDetails, setShowDetails] = useState(false);
  const isUnlocked = !!achievement.unlocked_at;

  const sizeClasses = {
    sm: { container: "p-3", icon: "text-xl", title: "text-xs" },
    md: { container: "p-4", icon: "text-2xl", title: "text-sm" },
    lg: { container: "p-5", icon: "text-3xl", title: "text-base" },
  }[size];

  return (
    <div
      className={`relative ${sizeClasses.container} rounded-2xl border transition-all ${
        isUnlocked
          ? "bg-dark-200 border-jeok-800 hover:border-jeok-600"
          : "bg-dark-300 border-stone-800 opacity-60"
      }`}
      onClick={() => setShowDetails(!showDetails)}
    >
      <div className="flex items-center gap-3">
        <div className={`${sizeClasses.icon} ${isUnlocked ? "" : "grayscale opacity-50"}`}>
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`${sizeClasses.title} font-semibold ${isUnlocked ? "text-stone-200" : "text-stone-500"} truncate`}>
            {achievement.title}
          </p>
          {!isUnlocked && achievement.requirement_value > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-stone-600 mb-1">
                <span>진도</span>
                <span>{Math.min(achievement.progress, achievement.requirement_value)} / {achievement.requirement_value}</span>
              </div>
              <div className="h-1.5 bg-dark-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-jeok-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (achievement.progress / achievement.requirement_value) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
        {isUnlocked && <span className="text-xs text-green-400">✓</span>}
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${CATEGORY_COLOR[achievement.category]}`}>
            {CATEGORY_LABEL[achievement.category] || achievement.category}
          </span>
          <p className="text-xs text-stone-500">{achievement.description}</p>
          {isUnlocked && achievement.unlocked_at && (
            <p className="text-xs text-stone-600">
              {new Date(achievement.unlocked_at).toLocaleDateString("ko-KR")}에 달성
            </p>
          )}
        </div>
      )}
    </div>
  );
}
