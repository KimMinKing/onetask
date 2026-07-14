// 브라우저와 서버 모두 상대 경로 사용
const BASE = "/api";

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("onetask_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type Urgency = "high" | "normal" | "low";
export type Status = "todo" | "done";

export interface Task {
  id: number;
  title: string;
  category: string | null;
  urgency: Urgency;
  order: number;
  status: Status;
  done_at: string | null;
  due_at: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  event_date: string;   // "YYYY-MM-DD"
  event_time: string | null; // "HH:MM"
  created_at: string;
  rrule: string | null;
  recurring_until: string | null;
  color: string | null;
}

export interface Category {
  id: number;
  name: string;
}

export interface JapaneseWord {
  id: number;
  expression: string;
  reading: string;
  meaning: string;
  meaning_zh: string | null;
  jlpt_level: string | null;
  example_jp: string | null;
  example_ko: string | null;
  example_zh: string | null;
  state: number;
  reps: number;
  lapses: number;
  due: string;
  is_due: boolean;
  is_favorite: boolean;
}

export interface EnglishWord {
  id: number;
  word: string;
  meaning: string;
  meaning_zh: string | null;
  level: string | null;
  example_en: string | null;
  example_ko: string | null;
  example_zh: string | null;
  state: number;
  reps: number;
  lapses: number;
  due: string;
  is_due: boolean;
  is_favorite: boolean;
}

export interface Word {
  id: number;
  chinese: string;
  pinyin: string;
  meaning: string;
  example_zh: string | null;
  example_ko: string | null;
  example_pinyin: string | null;
  audio_path: string | null;
  image_path: string | null;
  hsk_level: number | null;
  created_at: string;
  state: number;       // 0=New 1=Learning 2=Review 3=Relearning
  reps: number;
  lapses: number;
  due: string;
  is_due: boolean;
  is_favorite: boolean;
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem("onetask_token");
    localStorage.removeItem("onetask_user");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const authApi = {
  status: () => fetch(`${BASE}/auth/status`).then((r) => r.json()) as Promise<{ has_users: boolean }>,
  login: (username: string, password: string) =>
    fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).detail || "로그인 실패");
      return r.json() as Promise<{ access_token: string; is_master: boolean; username: string }>;
    }),
  signup: (username: string, password: string, ui_language?: string) =>
    fetch(`${BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, ui_language }),
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).detail || "가입 실패");
      return r.json() as Promise<{ access_token: string; is_master: boolean; username: string }>;
    }),
};

export const api = {
  tasks: {
    list: (status?: Status) =>
      req<Task[]>(`/tasks/${status ? `?status=${status}` : ""}`),
    create: (data: { title: string; category?: string; urgency?: Urgency; due_at?: string; rrule?: string }) =>
      req<Task>("/tasks/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Task>) =>
      req<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      req<{ ok: boolean }>(`/tasks/${id}`, { method: "DELETE" }),
    reorder: (ids: number[]) =>
      req<{ ok: boolean }>("/tasks/reorder", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
    history: (year: number, month: number) =>
      req<Task[]>(`/tasks/history?year=${year}&month=${month}`),
    scheduled: (year: number, month: number) =>
      req<Task[]>(`/tasks/scheduled?year=${year}&month=${month}`),
  },
  calendarEvents: {
    list: (year: number, month: number) =>
      req<CalendarEvent[]>(`/calendar-events/?year=${year}&month=${month}`),
    create: (data: { title: string; event_date: string; event_time?: string; color?: string; rrule?: string }) =>
      req<CalendarEvent>("/calendar-events/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: { title?: string; event_date?: string; event_time?: string; color?: string; rrule?: string }) =>
      req<CalendarEvent>(`/calendar-events/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      req<{ ok: boolean }>(`/calendar-events/${id}`, { method: "DELETE" }),
    move: (id: number, newDate: string) =>
      req<CalendarEvent>(`/calendar-events/${id}/move?new_date=${newDate}`, { method: "POST" }),
  },
  categories: {
    list: () => req<Category[]>("/categories/"),
    create: (name: string) =>
      req<Category>("/categories/", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    delete: (id: number) =>
      req<{ ok: boolean }>(`/categories/${id}`, { method: "DELETE" }),
  },
  words: {
    list: (hsk_level?: number) => req<Word[]>(`/words/${hsk_level ? `?hsk_level=${hsk_level}` : ""}`),
    due: (hsk_level?: number) => req<Word[]>(`/words/due${hsk_level ? `?hsk_level=${hsk_level}` : ""}`),
    stats: (hsk_level?: number) => req<{ total: number; reviewed: number; new: number; due: number; today: number }>(`/words/stats${hsk_level ? `?hsk_level=${hsk_level}` : ""}`),
    today: (hsk_level?: number) => req<Word[]>(`/words/today${hsk_level ? `?hsk_level=${hsk_level}` : ""}`),
    create: (data: { chinese: string; pinyin: string; meaning: string; example_zh?: string; example_ko?: string }) =>
      req<Word>("/words/", { method: "POST", body: JSON.stringify(data) }),
    review: (id: number, knew: boolean) =>
      req<{ word_id: number; knew: boolean; next_due: string; state: number; reps: number }>(
        `/words/${id}/review`,
        { method: "POST", body: JSON.stringify({ knew }) }
      ),
    daily: () => req<Word[]>("/words/daily"),
    favorite: (id: number) =>
      req<{ word_id: number; is_favorite: boolean }>(`/words/${id}/favorite`, { method: "POST" }),
    favorites: (hsk_level?: number) =>
      req<Word[]>(`/words/favorites${hsk_level ? `?hsk_level=${hsk_level}` : ""}`),
    delete: (id: number) =>
      req<{ ok: boolean }>(`/words/${id}`, { method: "DELETE" }),
  },
  stats: {
    overview: () => req<{
      zh_streak: number; en_streak: number; ja_streak: number;
      zh_today: number; en_today: number; ja_today: number;
      zh_levels: { level: string; total: number; reviewed: number; mastered: number }[];
      en_levels: { level: string; total: number; reviewed: number; mastered: number }[];
      ja_levels: { level: string; total: number; reviewed: number; mastered: number }[];
    }>("/stats/overview"),
    history: (days = 90) => req<{ date: string; count: number }[]>(`/stats/history?days=${days}`),
  },
  englishWords: {
    list: (level?: string) => req<EnglishWord[]>(`/english-words/${level ? `?level=${level}` : ""}`),
    due: (level?: string) => req<EnglishWord[]>(`/english-words/due${level ? `?level=${level}` : ""}`),
    stats: (level?: string) => req<{ total: number; reviewed: number; new: number; due: number; today: number }>(`/english-words/stats${level ? `?level=${level}` : ""}`),
    today: (level?: string) => req<EnglishWord[]>(`/english-words/today${level ? `?level=${level}` : ""}`),
    review: (id: number, knew: boolean) =>
      req<{ word_id: number; knew: boolean; next_due: string; state: number; reps: number }>(
        `/english-words/${id}/review`,
        { method: "POST", body: JSON.stringify({ knew }) }
      ),
    daily: () => req<EnglishWord[]>("/english-words/daily"),
    favorite: (id: number) =>
      req<{ word_id: number; is_favorite: boolean }>(`/english-words/${id}/favorite`, { method: "POST" }),
    translateZh: (id: number) =>
      req<{ word_id: number; meaning_zh: string | null; example_zh: string | null }>(`/english-words/${id}/translate-zh`, { method: "POST" }),
    favorites: (level?: string) =>
      req<EnglishWord[]>(`/english-words/favorites${level ? `?level=${level}` : ""}`),
  },
  push: {
    test: (title?: string, body?: string) =>
      req<{ sent: number }>("/push/test", {
        method: "POST",
        body: JSON.stringify({ title: title ?? "onetask 테스트", body: body ?? "푸시 알림이 정상 작동합니다!" }),
      }),
  },
  admin: {
    overview: () => req<{
      words: {
        zh: { total: number; by_level: Record<string, number>; reviewed: number };
        en: { total: number; by_level: Record<string, number>; reviewed: number };
        ja: { total: number; by_level: Record<string, number>; reviewed: number };
      };
      tasks: { todo: number; done: number };
      calendar: { total: number };
      users: { id: number; username: string; is_master: boolean }[];
    }>("/admin/overview"),
  },
  japaneseWords: {
    list: (jlpt_level?: string) => req<JapaneseWord[]>(`/japanese-words/list${jlpt_level ? `?jlpt_level=${jlpt_level}` : ""}`),
    due: (jlpt_level?: string) => req<JapaneseWord[]>(`/japanese-words/due${jlpt_level ? `?jlpt_level=${jlpt_level}` : ""}`),
    stats: (jlpt_level?: string) => req<{ total: number; reviewed: number; new: number; due: number; today: number }>(`/japanese-words/stats${jlpt_level ? `?jlpt_level=${jlpt_level}` : ""}`),
    today: (jlpt_level?: string) => req<JapaneseWord[]>(`/japanese-words/today${jlpt_level ? `?jlpt_level=${jlpt_level}` : ""}`),
    daily: () => req<JapaneseWord[]>("/japanese-words/daily"),
    review: (id: number, knew: boolean) =>
      req<{ word_id: number; knew: boolean; next_due: string; state: number; reps: number }>(
        `/japanese-words/${id}/review`,
        { method: "POST", body: JSON.stringify({ knew }) }
      ),
    favorite: (id: number) =>
      req<{ word_id: number; is_favorite: boolean }>(`/japanese-words/${id}/favorite`, { method: "POST" }),
    translateZh: (id: number) =>
      req<{ word_id: number; meaning_zh: string | null; example_zh: string | null }>(`/japanese-words/${id}/translate-zh`, { method: "POST" }),
    favorites: (jlpt_level?: string) =>
      req<JapaneseWord[]>(`/japanese-words/favorites${jlpt_level ? `?jlpt_level=${jlpt_level}` : ""}`),
  },
  achievements: {
    list: () => req<{
      id: number;
      code: string;
      title: string;
      description: string;
      category: string;
      icon: string;
      requirement_value: number;
      unlocked: boolean;
    }[]>("/achievements/"),
    check: () => req<{
      streak: number;
      mastery: number;
      reviews: number;
      new_unlocks: number;
    }>("/achievements/check", { method: "POST" }),
    stats: () => req<{
      total: number;
      unlocked: number;
      completion_rate: number;
      by_category: { category: string; total: number; unlocked: number }[];
    }>("/achievements/stats"),
  },
  search: {
    global: (params: { q?: string; lang?: string; level?: string; state?: number; favorites_only?: true; due_only?: true }) => {
      const query = new URLSearchParams();
      if (params.q) query.set("q", params.q);
      if (params.lang) query.set("lang", params.lang);
      if (params.level) query.set("level", params.level);
      if (params.state !== undefined) query.set("state", params.state.toString());
      if (params.favorites_only) query.set("favorites_only", "true");
      if (params.due_only) query.set("due_only", "true");
      return req<{
        tasks: Task[];
        chinese: Word[];
        english: EnglishWord[];
        japanese: JapaneseWord[];
      }>(`/search?${query.toString()}`).then(({ chinese, english, japanese }) => [
        ...chinese.map(w => ({ ...w, type: "chinese" as const })),
        ...english.map(w => ({ ...w, type: "english" as const })),
        ...japanese.map(w => ({ ...w, type: "japanese" as const })),
      ]);
    },
  },
  settings: {
    get: () => req<{
      daily_goal_words: number;
      daily_goal_tasks: number;
      notification_hour: number;
      notification_enabled: boolean;
      theme: string;
      language_priority: string;
      ui_language: string;
      obsidian_enabled: boolean;
      obsidian_vault_path: string | null;
    }>("/settings/"),
    update: (data: {
      daily_goal_words?: number;
      daily_goal_tasks?: number;
      notification_hour?: number;
      notification_enabled?: boolean;
      theme?: string;
      language_priority?: string;
      ui_language?: string;
      obsidian_enabled?: boolean;
      obsidian_vault_path?: string | null;
    }) =>
      req<{
        daily_goal_words: number;
        daily_goal_tasks: number;
        notification_hour: number;
        notification_enabled: boolean;
        theme: string;
        language_priority: string;
        ui_language: string;
        obsidian_enabled: boolean;
        obsidian_vault_path: string | null;
      }>("/settings/", { method: "PUT", body: JSON.stringify(data) }),
    syncObsidian: () =>
      req<{ ok: boolean; synced_dates: number }>("/settings/obsidian/sync", { method: "POST" }),
  },
  quizzes: {
    exampleQuiz: (wordLang: string) =>
      req<{
        question: string;
        options: string[];
        correct_answer: string;
        word_id: number;
        word_lang: string;
        quiz_type: string;
      }>(`/quizzes/example-quiz?word_lang=${wordLang}`),
    sentenceCompletion: (wordLang: string) =>
      req<{
        question: string;
        options: string[];
        correct_answer: string;
        word_id: number;
        word_lang: string;
        quiz_type: string;
      }>(`/quizzes/sentence-completion?word_lang=${wordLang}`),
    checkPronunciation: (wordLang: string) =>
      req<{
        word_id: number;
        word_lang: string;
        target_word: string;
        instruction: string;
        quiz_type: string;
      }>(`/quizzes/pronunciation/check?word_lang=${wordLang}`),
    submitAnswer: (data: {
      word_id: number;
      word_lang: string;
      quiz_type: string;
      answer: string;
      correct: boolean;
    }) =>
      req<{ correct: boolean; word_id: number; quiz_type: string }>(
        "/quizzes/answer",
        { method: "POST", body: JSON.stringify(data) }
      ),
  },
};
