"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Theme = "dark" | "light";

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

const STORAGE_KEY = "onetask-theme";

export function FloatingSettings() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initialTheme: Theme = saved === "light" ? "light" : "dark";
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  useEffect(() => {
    if (!open || settings || loading) return;

    setLoading(true);
    api.settings.get()
      .then((data) => {
        setSettings(data);
        const nextTheme: Theme = data.theme === "light" ? "light" : "dark";
        setTheme(nextTheme);
        document.documentElement.dataset.theme = nextTheme;
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "설정을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [open, settings, loading]);

  const applyTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    if (settings) setSettings({ ...settings, theme: nextTheme });
  };

  const save = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage("");
    try {
      const updated = await api.settings.update({ ...settings, theme });
      setSettings(updated);
      setMessage("저장했습니다.");
      setTimeout(() => setMessage(""), 2500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장하지 못했습니다.");
    }
    setSaving(false);
  };

  const syncObsidian = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage("");
    try {
      const updated = await api.settings.update({ ...settings, theme });
      setSettings(updated);
      const result = await api.settings.syncObsidian();
      setMessage(`Obsidian 동기화 완료: ${result.synced_dates}개 날짜`);
      setTimeout(() => setMessage(""), 2500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Obsidian 동기화 실패");
    }
    setSaving(false);
  };

  return (
    <>
      <button
        type="button"
        className="inline-settings-button"
        aria-label="환경설정 열기"
        onClick={() => setOpen(true)}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M19 13.2v-2.4l-2.1-.4a7 7 0 0 0-.6-1.5l1.2-1.8-1.7-1.7-1.8 1.2a7 7 0 0 0-1.5-.6L12.1 4h-2.4l-.4 2.1a7 7 0 0 0-1.5.6L6 5.5 4.3 7.2l1.2 1.8a7 7 0 0 0-.6 1.5l-2.1.4v2.4l2.1.4c.1.5.3 1 .6 1.5L4.3 17l1.7 1.7 1.8-1.2c.5.3 1 .5 1.5.6l.4 2.1h2.4l.4-2.1c.5-.1 1-.3 1.5-.6l1.8 1.2 1.7-1.7-1.2-1.8c.3-.5.5-1 .6-1.5l2.1-.4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
        <span>설정</span>
      </button>

      {open && (
        <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="환경설정">
          <button className="settings-backdrop" aria-label="환경설정 닫기" onClick={() => setOpen(false)} />
          <section className="settings-panel">
            <div className="settings-panel__header">
              <div>
                <p className="settings-panel__eyebrow">onetask</p>
                <h2>환경설정</h2>
              </div>
              <button className="settings-panel__close" onClick={() => setOpen(false)} aria-label="닫기">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {message && <div className="settings-message">{message}</div>}

            <div className="settings-section">
              <p className="settings-section__title">테마</p>
              <div className="settings-segment">
                {(["dark", "light"] as Theme[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => applyTheme(item)}
                    className={theme === item ? "is-active" : ""}
                  >
                    {item === "dark" ? "Dark" : "Light"}
                  </button>
                ))}
              </div>
            </div>

            {loading && <div className="settings-loading">설정을 불러오는 중...</div>}

            {settings && (
              <>
                <div className="settings-section">
                  <div className="settings-row">
                    <div>
                      <p className="settings-section__title">Obsidian 연동</p>
                      <p className="settings-help">날짜별 md 파일에 할 일 목록을 자동으로 만듭니다.</p>
                    </div>
                    <button
                      className={`settings-switch ${settings.obsidian_enabled ? "is-on" : ""}`}
                      onClick={() => setSettings({ ...settings, obsidian_enabled: !settings.obsidian_enabled })}
                      aria-pressed={settings.obsidian_enabled}
                    >
                      <span />
                    </button>
                  </div>

                  <label className="settings-label">
                    Vault 폴더 경로
                    <input
                      value={settings.obsidian_vault_path ?? ""}
                      onChange={(event) => setSettings({ ...settings, obsidian_vault_path: event.target.value })}
                      placeholder="C:\Users\me\Documents\ObsidianVault"
                    />
                  </label>

                  <button
                    className="settings-secondary-button"
                    onClick={syncObsidian}
                    disabled={saving || !settings.obsidian_enabled || !settings.obsidian_vault_path}
                  >
                    지금 전체 동기화
                  </button>
                </div>

                <div className="settings-section settings-grid">
                  <label className="settings-label">
                    하루 단어 목표
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={settings.daily_goal_words}
                      onChange={(event) => setSettings({ ...settings, daily_goal_words: Number(event.target.value) || 1 })}
                    />
                  </label>
                  <label className="settings-label">
                    하루 할 일 목표
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={settings.daily_goal_tasks}
                      onChange={(event) => setSettings({ ...settings, daily_goal_tasks: Number(event.target.value) || 1 })}
                    />
                  </label>
                </div>

                <div className="settings-section">
                  <div className="settings-row">
                    <div>
                      <p className="settings-section__title">알림</p>
                      <p className="settings-help">복습 알림을 받을 시간을 정합니다.</p>
                    </div>
                    <button
                      className={`settings-switch ${settings.notification_enabled ? "is-on" : ""}`}
                      onClick={() => setSettings({ ...settings, notification_enabled: !settings.notification_enabled })}
                      aria-pressed={settings.notification_enabled}
                    >
                      <span />
                    </button>
                  </div>
                  <label className="settings-label">
                    알림 시간
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={settings.notification_hour}
                      onChange={(event) => setSettings({ ...settings, notification_hour: Number(event.target.value) || 9 })}
                    />
                  </label>
                </div>

                <button className="settings-save-button" onClick={save} disabled={saving}>
                  {saving ? "저장 중..." : "저장"}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
