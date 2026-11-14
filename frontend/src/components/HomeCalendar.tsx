"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type CalendarEvent, type Task } from "@/lib/api";
import { COMMON_TEXT, useUiLanguage } from "@/lib/i18n";

type MonthData = { done: Task[]; scheduled: Task[]; events: CalendarEvent[] };

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function HomeCalendar({ tasks }: { tasks: Task[] }) {
  const language = useUiLanguage();
  const labels = COMMON_TEXT[language];
  const [initial] = useState(() => new Date());
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth() + 1);
  const [selected, setSelected] = useState(dateKey(initial));
  const [data, setData] = useState<MonthData | null>(null);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.tasks.history(year, month), api.tasks.scheduled(year, month), api.calendarEvents.list(year, month)])
      .then(([done, scheduled, events]) => { if (active) { setData({ done, scheduled, events }); setError(false); } })
      .catch(() => { if (active) { setData(null); setError(true); } });
    return () => { active = false; };
  }, [year, month, tasks]);

  const moveMonth = (amount: number) => {
    const next = new Date(year, month - 1 + amount, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
    setSelected(dateKey(next));
    setData(null);
    setAdding(false);
  };

  const createEvent = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await api.calendarEvents.create({ title: title.trim(), event_date: selected, event_time: time || undefined, color: "#3B82F6" });
      const events = await api.calendarEvents.list(year, month);
      setData(previous => previous ? { ...previous, events } : previous);
      setTitle(""); setTime(""); setAdding(false); setError(false);
    } catch { setError(true); }
    finally { setSaving(false); }
  };

  const first = new Date(year, month - 1, 1).getDay();
  const last = new Date(year, month, 0).getDate();
  const dateFor = (day: number) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const doneOn = (key: string) => data?.done.filter(task => task.done_at && dateKey(new Date(task.done_at)) === key) ?? [];
  const scheduledOn = (key: string) => data?.scheduled.filter(task => task.due_at && dateKey(new Date(task.due_at)) === key) ?? [];
  const eventsOn = (key: string) => data?.events.filter(event => event.event_date === key) ?? [];
  const dayEvents = eventsOn(selected);
  const dayScheduled = scheduledOn(selected);
  const dayDone = doneOn(selected);

  return <section aria-label={labels.calendar} className="rounded-2xl bg-dark-300 p-1 text-stone-200">
    <p className="mb-2 text-xs font-bold text-jeok-300">{labels.calendar}</p>
    <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={() => moveMonth(-1)} aria-label={language === "ko" ? "이전 달" : "上个月"} className="rounded-lg px-2 py-1 text-lg hover:bg-dark-100">‹</button>
      <h2 className="text-sm font-bold">{new Date(year, month - 1, 1).toLocaleDateString(language === "ko" ? "ko-KR" : "zh-CN", { year: "numeric", month: "long" })}</h2>
      <button type="button" onClick={() => moveMonth(1)} aria-label={language === "ko" ? "다음 달" : "下个月"} className="rounded-lg px-2 py-1 text-lg hover:bg-dark-100">›</button>
    </div>
    <div className="mt-2 grid grid-cols-7 text-center text-xs text-stone-500">{labels.weekdays.map(day => <span key={day}>{day}</span>)}</div>
    <div className="mt-1 grid grid-cols-7 gap-1">
      {Array.from({ length: first }, (_, index) => <span key={`empty-${index}`} />)}
      {Array.from({ length: last }, (_, index) => {
        const day = index + 1;
        const key = dateFor(day);
        const isToday = key === dateKey(initial);
        const hasDone = doneOn(key).length > 0;
        const hasScheduled = scheduledOn(key).length > 0;
        const hasEvent = eventsOn(key).length > 0;
        return <button key={key} type="button" onClick={() => { setSelected(key); setAdding(false); }} aria-label={key} aria-pressed={selected === key}
          className={`flex min-h-10 flex-col items-center justify-center rounded-lg text-xs hover:bg-dark-100 ${selected === key ? "bg-jeok-700 text-white" : isToday ? "border border-jeok-700 text-jeok-300" : "text-stone-300"}`}>
          <span>{day}</span><span className="mt-0.5 flex h-1 gap-0.5">{hasDone && <i className="h-1 w-1 rounded-full bg-green-400" />}{hasScheduled && <i className="h-1 w-1 rounded-full bg-jeok-400" />}{hasEvent && <i className="h-1 w-1 rounded-full bg-blue-400" />}</span>
        </button>;
      })}
    </div>
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-bold">{selected}</h3><button type="button" onClick={() => setAdding(value => !value)} className="text-xs text-blue-300">{language === "ko" ? "+ 일정 추가" : "+ 添加日程"}</button></div>
      {adding && <div className="mt-2 space-y-2"><input aria-label={language === "ko" ? "일정 제목" : "日程标题"} value={title} onChange={event => setTitle(event.target.value)} placeholder={language === "ko" ? "일정 제목" : "日程标题"} className="w-full rounded-lg border border-white/10 bg-dark-200 px-3 py-2 text-sm" /><div className="flex gap-2"><input aria-label={language === "ko" ? "일정 시간" : "日程时间"} type="time" value={time} onChange={event => setTime(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-dark-200 px-2 text-sm" /><button type="button" disabled={!title.trim() || saving} onClick={createEvent} className="rounded-lg bg-blue-600 px-3 py-2 text-xs disabled:opacity-40">{saving ? "..." : language === "ko" ? "저장" : "保存"}</button></div></div>}
      {error && <p role="alert" className="mt-2 text-xs text-red-300">{language === "ko" ? "캘린더를 불러오거나 저장하지 못했습니다." : "无法加载或保存日历。"}</p>}
      {!data && !error && <p className="mt-2 text-xs text-stone-500">{language === "ko" ? "일정을 불러오는 중..." : "正在加载日程..."}</p>}
      {data && <div className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
        {dayEvents.map(event => <p key={`event-${event.id}`} className="rounded-lg bg-dark-200 px-3 py-2" style={{ borderLeft: `3px solid ${event.color || "#3B82F6"}` }}>{event.event_time && `${event.event_time} · `}{event.title}</p>)}
        {dayScheduled.map(task => <p key={`scheduled-${task.id}`} className="rounded-lg border-l-[3px] border-jeok-500 bg-dark-200 px-3 py-2">{task.title}</p>)}
        {dayDone.map(task => <p key={`done-${task.id}`} className="rounded-lg border-l-[3px] border-green-500 bg-dark-200 px-3 py-2">✓ {task.title}</p>)}
        {!dayEvents.length && !dayScheduled.length && !dayDone.length && <p className="py-3 text-stone-500">{language === "ko" ? "이날 기록이 없습니다." : "这天没有记录。"}</p>}
      </div>}
    </div>
    <Link href="/calendar" className="mt-3 block text-right text-xs text-cyan-300 hover:underline">{language === "ko" ? "주·일 보기와 일정 관리 →" : "周/日视图与日程管理 →"}</Link>
  </section>;
}
