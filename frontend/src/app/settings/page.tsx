"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Settings = {
  daily_goal_words: number;
  daily_goal_tasks: number;
  notification_hour: number;
  notification_enabled: boolean;
  theme: string;
  language_priority: string;
  obsidian_enabled: boolean;
  obsidian_vault_path: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingObsidian, setSyncingObsidian] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.settings.get();
      setSettings(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    try {
      await api.settings.update(settings);
      setMessage("설정이 저장되었습니다.");
      if (settings.theme !== "dark") {
        document.documentElement.classList.toggle("dark", settings.theme === "dark");
      }
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setMessage((e instanceof Error ? e.message : String(e)) || "저장 실패");
    }
    setSaving(false);
  };

  const handleObsidianSync = async () => {
    setSyncingObsidian(true);
    setMessage("");
    try {
      if (settings) {
        await api.settings.update(settings);
      }
      const result = await api.settings.syncObsidian();
      setMessage(`Obsidian 동기화 완료: ${result.synced_dates}개 날짜`);
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setMessage((e instanceof Error ? e.message : String(e)) || "Obsidian 동기화 실패");
    }
    setSyncingObsidian(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-dark-400 text-stone-600 text-sm">
        불러오는 중...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-dark-400 text-stone-600 text-sm">
        설정을 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      <div className="px-6 pt-10 pb-5 bg-dark-300 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-all"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-stone-200">설정</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-4 overflow-y-auto">
        {message && (
          <div className={`px-4 py-3 rounded-xl text-sm ${
            message.includes("실패") ? "bg-jeok-950 text-jeok-400 border border-jeok-800" : "bg-green-950 text-green-400 border border-green-800"
          }`}>
            {message}
          </div>
        )}

        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4 space-y-4">
          <p className="text-sm font-semibold text-stone-200">프로필</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-jeok-900 flex items-center justify-center text-xl font-bold text-jeok-300">
              O
            </div>
            <div>
              <p className="text-stone-200 font-medium">onetask</p>
              <p className="text-xs text-stone-600">
                개인 학습 + 일정 대시보드
              </p>
            </div>
          </div>
        </div>

        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4 space-y-4">
          <p className="text-sm font-semibold text-stone-200">일일 목표</p>
          <div>
            <label className="text-xs text-stone-600 block mb-1.5">단어 복습 목표 (1-100개)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.daily_goal_words}
              onChange={(e) => setSettings({ ...settings, daily_goal_words: parseInt(e.target.value) || 1 })}
              className="w-full bg-dark-100 border border-stone-700 focus:border-jeok-600 rounded-xl px-4 py-3 text-sm text-stone-200 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1.5">할일 완료 목표 (1-20개)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.daily_goal_tasks}
              onChange={(e) => setSettings({ ...settings, daily_goal_tasks: parseInt(e.target.value) || 1 })}
              className="w-full bg-dark-100 border border-stone-700 focus:border-jeok-600 rounded-xl px-4 py-3 text-sm text-stone-200 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4 space-y-4">
          <p className="text-sm font-semibold text-stone-200">알림</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-300">푸시 알림</p>
              <p className="text-xs text-stone-600 mt-0.5">복습 알림 받기</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, notification_enabled: !settings.notification_enabled })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.notification_enabled ? "bg-jeok-600" : "bg-dark-100"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.notification_enabled ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {settings.notification_enabled && (
            <div>
              <label className="text-xs text-stone-600 block mb-1.5">알림 시간 (0-23시)</label>
              <input
                type="number"
                min="0"
                max="23"
                value={settings.notification_hour}
                onChange={(e) => setSettings({ ...settings, notification_hour: parseInt(e.target.value) || 9 })}
                className="w-full bg-dark-100 border border-stone-700 focus:border-jeok-600 rounded-xl px-4 py-3 text-sm text-stone-200 outline-none transition-colors"
              />
            </div>
          )}
        </div>

        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4 space-y-4">
          <p className="text-sm font-semibold text-stone-200">테마</p>
          <div className="flex gap-2">
            {["dark", "light"].map((theme) => (
              <button
                key={theme}
                onClick={() => setSettings({ ...settings, theme })}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                  settings.theme === theme
                    ? "bg-jeok-600 text-white"
                    : "bg-dark-100 text-stone-500 hover:bg-dark-100/80"
                }`}
              >
                {theme === "dark" ? "다크" : "라이트"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4 space-y-4">
          <p className="text-sm font-semibold text-stone-200">언어 우선순위</p>
          <p className="text-xs text-stone-600">쉼표로 구분하여 순서를 지정하세요 (zh,en,ja)</p>
          <input
            type="text"
            value={settings.language_priority}
            onChange={(e) => setSettings({ ...settings, language_priority: e.target.value })}
            className="w-full bg-dark-100 border border-stone-700 focus:border-jeok-600 rounded-xl px-4 py-3 text-sm text-stone-200 outline-none transition-colors"
            placeholder="zh,en,ja"
          />
        </div>

        <div className="bg-dark-200 border border-white/5 rounded-2xl px-5 py-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-stone-200">Obsidian 연결</p>
              <p className="text-xs text-stone-600 mt-0.5">날짜별 md 파일에 onetask 할 일 목록을 만듭니다.</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, obsidian_enabled: !settings.obsidian_enabled })}
              className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                settings.obsidian_enabled ? "bg-jeok-600" : "bg-dark-100"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.obsidian_enabled ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Vault 폴더 경로</label>
            <input
              type="text"
              value={settings.obsidian_vault_path ?? ""}
              onChange={(e) => setSettings({ ...settings, obsidian_vault_path: e.target.value })}
              className="w-full bg-dark-100 border border-stone-700 focus:border-jeok-600 rounded-xl px-4 py-3 text-sm text-stone-200 outline-none transition-colors"
              placeholder="C:\\Users\\me\\Documents\\ObsidianVault"
            />
            <p className="text-xs text-stone-700 mt-2">예: 2026-07-14.md 안에 onetask 관리 구간이 생성됩니다.</p>
          </div>

          <button
            onClick={handleObsidianSync}
            disabled={syncingObsidian || !settings.obsidian_enabled || !settings.obsidian_vault_path}
            className="w-full py-3 bg-dark-100 hover:bg-dark-100/80 text-stone-300 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {syncingObsidian ? "동기화 중..." : "지금 전체 동기화"}
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-jeok-600 hover:bg-jeok-500 text-white rounded-2xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
