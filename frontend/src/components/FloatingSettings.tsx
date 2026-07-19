"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { COMMON_TEXT } from "@/lib/i18n";

type Theme = "dark" | "light";

type Settings = {
  daily_goal_words: number;
  daily_goal_tasks: number;
  notification_hour: number;
  notification_enabled: boolean;
  theme: string;
  language_priority: string;
  ui_language: string;
  obsidian_enabled: boolean;
  obsidian_vault_path: string | null;
};

const STORAGE_KEY = "onetask-theme";

const readStoredTheme = (): Theme | null => {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" ? saved : null;
};

const applyDocumentTheme = (nextTheme: Theme) => {
  document.documentElement.dataset.theme = nextTheme;
  window.localStorage.setItem(STORAGE_KEY, nextTheme);
};

const SETTINGS_TEXT = {
  ko: {
    open: "설정",
    dialog: "환경설정",
    close: "닫기",
    title: "환경설정",
    loadError: "설정을 불러오지 못했습니다.",
    saved: "저장했습니다.",
    saveError: "저장하지 못했습니다.",
    syncDone: (count: number) => `Obsidian 동기화 완료: ${count}개 날짜`,
    syncError: "Obsidian 동기화 실패",
    theme: "테마",
    loading: "설정을 불러오는 중...",
    language: "표시 언어",
    obsidian: "Obsidian 연동",
    obsidianHelp: "날짜별 md 파일에 할 일 목록을 자동으로 만듭니다.",
    vaultPath: "Vault 폴더 경로",
    syncNow: "지금 전체 동기화",
    dailyWords: "하루 단어 목표",
    dailyTasks: "하루 할 일 목표",
    notification: "알림",
    notificationHelp: "복습 알림을 받을 시간을 정합니다.",
    notificationHour: "알림 시간",
  },
  zh: {
    open: "设置",
    dialog: "设置",
    close: "关闭",
    title: "设置",
    loadError: "无法加载设置。",
    saved: "已保存。",
    saveError: "保存失败。",
    syncDone: (count: number) => `Obsidian 同步完成：${count} 个日期`,
    syncError: "Obsidian 同步失败",
    theme: "主题",
    loading: "正在加载设置...",
    language: "显示语言",
    obsidian: "Obsidian 关联",
    obsidianHelp: "自动在每日 md 文件中生成待办列表。",
    vaultPath: "Vault 文件夹路径",
    syncNow: "立即全部同步",
    dailyWords: "每日单词目标",
    dailyTasks: "每日待办目标",
    notification: "通知",
    notificationHelp: "设置复习提醒时间。",
    notificationHour: "通知时间",
  },
} as const;

export function FloatingSettings() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const uiLanguage = settings?.ui_language === "zh" ? "zh" : "ko";
  const text = SETTINGS_TEXT[uiLanguage];
  const common = COMMON_TEXT[uiLanguage];

  useEffect(() => {
    const initialTheme = readStoredTheme() ?? "dark";
    setTheme(initialTheme);
    applyDocumentTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (!open || settings || loading) return;

    setLoading(true);
    api.settings.get()
      .then((data) => {
        const nextTheme = readStoredTheme() ?? (data.theme === "light" ? "light" : "dark");
        setSettings({ ...data, theme: nextTheme });
        setTheme(nextTheme);
        applyDocumentTheme(nextTheme);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : text.loadError))
      .finally(() => setLoading(false));
  }, [open, settings, loading, text.loadError]);

  const applyTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    applyDocumentTheme(nextTheme);
    if (settings) setSettings({ ...settings, theme: nextTheme });
  };

  const save = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage("");
    try {
      const updated = await api.settings.update({ ...settings, theme });
      setSettings(updated);
      window.dispatchEvent(new CustomEvent("onetask-settings-updated", { detail: updated }));
      setMessage(text.saved);
      setTimeout(() => setMessage(""), 2500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.saveError);
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
      window.dispatchEvent(new CustomEvent("onetask-settings-updated", { detail: updated }));
      const result = await api.settings.syncObsidian();
      setMessage(text.syncDone(result.synced_dates));
      setTimeout(() => setMessage(""), 2500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.syncError);
    }
    setSaving(false);
  };

  return (
    <>
      <button
        type="button"
        className="inline-settings-button"
        aria-label={text.open}
        onClick={() => setOpen(true)}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M19 13.2v-2.4l-2.1-.4a7 7 0 0 0-.6-1.5l1.2-1.8-1.7-1.7-1.8 1.2a7 7 0 0 0-1.5-.6L12.1 4h-2.4l-.4 2.1a7 7 0 0 0-1.5.6L6 5.5 4.3 7.2l1.2 1.8a7 7 0 0 0-.6 1.5l-2.1.4v2.4l2.1.4c.1.5.3 1 .6 1.5L4.3 17l1.7 1.7 1.8-1.2c.5.3 1 .5 1.5.6l.4 2.1h2.4l.4-2.1c.5-.1 1-.3 1.5-.6l1.8 1.2 1.7-1.7-1.2-1.8c.3-.5.5-1 .6-1.5l2.1-.4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
        <span>{text.open}</span>
      </button>

      {open && (
        <div className="settings-overlay" role="dialog" aria-modal="true" aria-label={text.dialog}>
          <button className="settings-backdrop" aria-label={text.close} onClick={() => setOpen(false)} />
          <section className="settings-panel">
            <div className="settings-panel__header">
              <div>
                <p className="settings-panel__eyebrow">onetask</p>
                <h2>{text.title}</h2>
              </div>
              <button className="settings-panel__close" onClick={() => setOpen(false)} aria-label={text.close}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {message && <div className="settings-message">{message}</div>}

            <div className="settings-section">
              <p className="settings-section__title">{text.theme}</p>
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

            {loading && <div className="settings-loading">{text.loading}</div>}

            {settings && (
              <>
                <div className="settings-section">
                  <p className="settings-section__title">{text.language}</p>
                  <div className="settings-segment">
                    {[
                      { value: "ko", label: "한국어" },
                      { value: "zh", label: "中文" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setSettings({ ...settings, ui_language: item.value })}
                        className={settings.ui_language === item.value ? "is-active" : ""}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-section">
                  <div className="settings-row">
                    <div>
                      <p className="settings-section__title">{text.obsidian}</p>
                      <p className="settings-help">{text.obsidianHelp}</p>
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
                    {text.vaultPath}
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
                    {text.syncNow}
                  </button>
                </div>

                <div className="settings-section settings-grid">
                  <label className="settings-label">
                    {text.dailyWords}
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={settings.daily_goal_words}
                      onChange={(event) => setSettings({ ...settings, daily_goal_words: Number(event.target.value) || 1 })}
                    />
                  </label>
                  <label className="settings-label">
                    {text.dailyTasks}
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
                      <p className="settings-section__title">{text.notification}</p>
                      <p className="settings-help">{text.notificationHelp}</p>
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
                    {text.notificationHour}
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
                  {saving ? common.saving : common.save}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
