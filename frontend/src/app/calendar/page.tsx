"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, Task, CalendarEvent } from "@/lib/api";
import WeekView from "@/components/WeekView";
import DayView from "@/components/DayView";
import RecurrencePicker from "@/components/RecurrencePicker";
import { COMMON_TEXT, useUiLanguage } from "@/lib/i18n";

type ViewMode = "month" | "week" | "day";

export default function CalendarPage() {
  const router = useRouter();
  const uiLanguage = useUiLanguage();
  const text = COMMON_TEXT[uiLanguage];
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // 이벤트 추가/수정 폼
  const [addingEvent, setAddingEvent] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");
  const [newRRule, setNewRRule] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editColor, setEditColor] = useState("#3B82F6");
  const [editRRule, setEditRRule] = useState<string | null>(null);

  const COLORS = [
    { value: "#3B82F6", class: "bg-blue-500" },
    { value: "#EF4444", class: "bg-red-500" },
    { value: "#10B981", class: "bg-green-500" },
    { value: "#F59E0B", class: "bg-yellow-500" },
    { value: "#8B5CF6", class: "bg-purple-500" },
    { value: "#EC4899", class: "bg-pink-500" },
  ];

  const load = (y: number, m: number) => {
    Promise.all([
      api.tasks.history(y, m),
      api.tasks.scheduled(y, m),
      api.calendarEvents.list(y, m),
    ]).then(([done, scheduled, evts]) => {
      setDoneTasks(done);
      setScheduledTasks(scheduled);
      setEvents(evts);
    }).catch(() => {});
  };

  useEffect(() => { load(year, month); }, [year, month]);

  const prevMonth = () => {
    const [y, m] = month === 1 ? [year - 1, 12] : [year, month - 1];
    setYear(y); setMonth(m); setSelectedDay(null);
  };
  const nextMonth = () => {
    const [y, m] = month === 12 ? [year + 1, 1] : [year, month + 1];
    setYear(y); setMonth(m); setSelectedDay(null);
  };

  // 날짜별 그룹
  const doneByDay: Record<number, Task[]> = {};
  doneTasks.forEach((t) => {
    if (!t.done_at) return;
    const d = new Date(t.done_at).getDate();
    (doneByDay[d] ??= []).push(t);
  });

  const scheduledByDay: Record<number, Task[]> = {};
  scheduledTasks.forEach((t) => {
    if (!t.due_at) return;
    const d = new Date(t.due_at).getDate();
    (scheduledByDay[d] ??= []).push(t);
  });

  const eventsByDay: Record<number, CalendarEvent[]> = {};
  events.forEach((e) => {
    const d = parseInt(e.event_date.split("-")[2]);
    (eventsByDay[d] ??= []).push(e);
  });

  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthLabel = new Date(year, month - 1).toLocaleDateString(uiLanguage === "zh" ? "zh-CN" : "ko-KR", { year: "numeric", month: "long" });

  const selectedDateStr = selectedDay
    ? `${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;

  const selectedDone = selectedDay ? (doneByDay[selectedDay] ?? []) : [];
  const selectedScheduled = selectedDay ? (scheduledByDay[selectedDay] ?? []) : [];
  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  const addEvent = async () => {
    if (!newTitle.trim() || !selectedDateStr) return;
    const created = await api.calendarEvents.create({
      title: newTitle.trim(),
      event_date: selectedDateStr,
      event_time: newTime || undefined,
      color: newColor,
      rrule: newRRule || undefined,
    });
    setEvents((prev) => [...prev, created]);
    setNewTitle(""); setNewTime(""); setNewColor("#3B82F6"); setNewRRule(null); setAddingEvent(false);
  };

  const deleteEvent = async (id: number) => {
    await api.calendarEvents.delete(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const startEditEvent = (e: CalendarEvent) => {
    setEditingEventId(e.id);
    setEditTitle(e.title);
    setEditTime(e.event_time ?? "");
    setEditColor(e.color ?? "#3B82F6");
    setEditRRule(e.rrule ?? null);
  };

  const handleEventMove = async (eventId: number, newDate: string) => {
    try {
      await api.calendarEvents.move(eventId, newDate);
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, event_date: newDate } : e));
    } catch {
      // 실패 시 무시
    }
  };

  const saveEditEvent = async () => {
    if (!editTitle.trim() || editingEventId === null) return;
    const updated = await api.calendarEvents.update(editingEventId, {
      title: editTitle.trim(),
      event_time: editTime || undefined,
      color: editColor,
      rrule: editRRule || undefined,
    });
    setEvents((prev) => prev.map((e) => e.id === editingEventId ? updated : e));
    setEditingEventId(null);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-dark-400">
      {/* 헤더 */}
      <div className="px-6 pt-10 pb-5 bg-dark-300 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 transition-all">
            ←
          </button>
          <h1 className="text-2xl font-bold text-stone-200">{text.calendar}</h1>
        </div>
        <div className="flex gap-2 mt-3">
          <span className="flex items-center gap-1.5 bg-dark-200 rounded-full px-3 py-1.5 text-xs font-medium text-stone-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            {text.completedCount(doneTasks.length)}
          </span>
          <span className="flex items-center gap-1.5 bg-dark-200 rounded-full px-3 py-1.5 text-xs font-medium text-stone-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
            {text.eventCount(events.length)}
          </span>
        </div>

        {/* 뷰 모드 토글 */}
        <div className="flex gap-1 mt-3">
          {([
            { value: "month" as ViewMode, label: text.byMonth },
            { value: "week" as ViewMode, label: text.byWeek },
            { value: "day" as ViewMode, label: text.byDay },
          ]).map((mode) => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === mode.value
                  ? "bg-jeok-600 text-white"
                  : "bg-dark-200 text-stone-500 hover:text-stone-300"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-5 pb-6">
        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth}
            className="w-9 h-9 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 text-lg transition-all">‹</button>
          <span className="text-sm font-semibold text-stone-200">{monthLabel}</span>
          <button onClick={nextMonth}
            className="w-9 h-9 rounded-xl bg-dark-200 hover:bg-dark-100 flex items-center justify-center text-stone-400 hover:text-stone-200 text-lg transition-all">›</button>
        </div>

        {/* 주/일 뷰 */}
        {(viewMode === "week" || viewMode === "day") && selectedDay !== null && (
          <>
            {viewMode === "week" ? (
              <WeekView
                year={year}
                month={month}
                day={selectedDay}
                events={events}
                doneTasks={doneTasks}
                scheduledTasks={scheduledTasks}
                onDateClick={setSelectedDay}
                onEventMove={handleEventMove}
              />
            ) : (
              <DayView
                year={year}
                month={month}
                day={selectedDay}
                events={events}
                doneTasks={doneTasks}
                scheduledTasks={scheduledTasks}
                onEventMove={handleEventMove}
              />
            )}
          </>
        )}

        {/* 월별 뷰 */}
        {viewMode === "month" && (
          <>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {text.weekdays.map((d, i) => (
            <div key={d} className={`text-center text-xs py-1 font-medium
              ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-stone-600"}`}>{d}</div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dow = (firstDow + i) % 7;
            const isToday = year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();
            const isSelected = day === selectedDay;
            const doneCount = doneByDay[day]?.length ?? 0;
            const hasScheduled = (scheduledByDay[day]?.length ?? 0) > 0;
            const hasEvent = (eventsByDay[day]?.length ?? 0) > 0;
            const hasAnything = doneCount > 0 || hasScheduled || hasEvent;

            return (
              <button key={day}
                onClick={() => { setSelectedDay(day === selectedDay ? null : day); setAddingEvent(false); }}
                className={`h-10 flex flex-col items-center justify-center rounded-lg transition-all
                  ${isSelected ? "bg-jeok-600" : isToday ? "bg-dark-100 border border-jeok-700" : hasAnything ? "bg-dark-200 hover:bg-dark-100" : "hover:bg-dark-200"}`}
              >
                <span className={`text-xs font-medium leading-none
                  ${isSelected ? "text-white" : isToday ? "text-jeok-300" : dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : hasAnything ? "text-stone-200" : "text-stone-600"}`}>
                  {day}
                </span>
                {(doneCount > 0 || hasScheduled || hasEvent) && (
                  <div className="flex gap-0.5 mt-0.5">
                    {doneCount > 0 && <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-white/60" : "bg-green-500"}`} />}
                    {hasScheduled && <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-white/60" : "bg-jeok-400"}`} />}
                    {hasEvent && <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-white/60" : "bg-blue-400"}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 선택된 날짜 상세 */}
        {selectedDay !== null && (
          <div className="mt-5 space-y-4">

            {/* 일정 섹션 (이벤트 + 스케줄된 투두) */}
            {(selectedEvents.length > 0 || selectedScheduled.length > 0 || true) && (
              <div>
                <div className="flex items-center justify-between px-1 mb-2">
                  <p className="text-xs text-stone-500 font-medium">{text.scheduleOn(month, selectedDay)}</p>
                  <button
                    onClick={() => setAddingEvent((v) => !v)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {text.addEvent}
                  </button>
                </div>

                {/* 이벤트 추가 폼 */}
                {addingEvent && (
                  <div className="bg-dark-200 border border-blue-900 rounded-2xl px-4 py-3 mb-2 space-y-3">
                    <input
                      autoFocus
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addEvent()}
                      placeholder={text.eventTitle}
                      className="w-full text-sm text-stone-100 placeholder-stone-600 bg-transparent border-b border-stone-700 pb-1.5 outline-none focus:border-blue-600 transition-colors"
                    />
                    <div className="flex items-center gap-3">
                      {/* 시간 선택 */}
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="text-xs text-stone-300 border border-stone-700 rounded-lg px-2 py-1 outline-none bg-dark-300 focus:border-blue-600 transition-colors"
                        />
                        <span className="text-xs text-stone-600">{text.time}</span>
                      </div>

                      {/* 색상 선택 */}
                      <div className="flex items-center gap-1.5">
                        {COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setNewColor(c.value)}
                            className={`w-5 h-5 rounded-full ${c.class} ${
                              newColor === c.value ? "ring-2 ring-white ring-offset-1 ring-offset-dark-200" : "opacity-60"
                            } transition-all`}
                          />
                        ))}
                      </div>

                      {/* 반복 설정 */}
                      <div className="ml-auto">
                        <RecurrencePicker value={newRRule} onChange={setNewRRule} />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={() => { setAddingEvent(false); setNewTitle(""); setNewTime(""); setNewColor("#3B82F6"); setNewRRule(null); }}
                        className="text-xs text-stone-600 hover:text-stone-400 px-3 py-1 rounded-full transition-colors">{text.cancel}</button>
                      <button onClick={addEvent} disabled={!newTitle.trim()}
                        className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-4 py-1 rounded-full disabled:opacity-30 transition-colors">{text.save}</button>
                    </div>
                  </div>
                )}

                {/* 캘린더 이벤트 목록 */}
                {selectedEvents.map((e) => (
                  editingEventId === e.id ? (
                    <div key={e.id} className="bg-dark-200 border border-blue-900 rounded-2xl px-4 py-3 mb-1.5 space-y-3">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(ev) => setEditTitle(ev.target.value)}
                        onKeyDown={(ev) => { if (ev.key === "Enter") saveEditEvent(); if (ev.key === "Escape") setEditingEventId(null); }}
                        className="w-full text-sm text-stone-100 placeholder-stone-600 bg-transparent border-b border-stone-700 pb-1.5 outline-none focus:border-blue-600 transition-colors"
                      />
                      <div className="flex items-center gap-3">
                        <input
                          type="time"
                          value={editTime}
                          onChange={(ev) => setEditTime(ev.target.value)}
                          className="text-xs text-stone-300 border border-stone-700 rounded-lg px-2 py-1 outline-none bg-dark-300 focus:border-blue-600 transition-colors"
                        />
                        <div className="flex items-center gap-1.5">
                          {COLORS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setEditColor(c.value)}
                              className={`w-5 h-5 rounded-full ${c.class} ${
                                editColor === c.value ? "ring-2 ring-white ring-offset-1 ring-offset-dark-200" : "opacity-60"
                              } transition-all`}
                            />
                          ))}
                        </div>
                        <div className="ml-auto">
                          <RecurrencePicker value={editRRule} onChange={setEditRRule} />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingEventId(null)}
                          className="text-xs text-stone-600 hover:text-stone-400 px-3 py-1 rounded-full transition-colors">{text.cancel}</button>
                        <button onClick={saveEditEvent} disabled={!editTitle.trim()}
                          className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-4 py-1 rounded-full disabled:opacity-30 transition-colors">{text.save}</button>
                      </div>
                    </div>
                  ) : (
                    <div key={e.id} className="flex items-center gap-3 bg-dark-200 border border-blue-900/50 rounded-2xl px-4 py-3 mb-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: e.color || "#3B82F6" }}
                      />
                      <div className="flex-1">
                        <span className="text-sm text-stone-200">{e.title}</span>
                        {e.event_time && <span className="text-xs text-blue-400 ml-2">{e.event_time}</span>}
                        {e.rrule && <span className="text-xs text-purple-400 ml-2">🔄</span>}
                      </div>
                      <button onClick={() => startEditEvent(e)}
                        className="text-stone-700 hover:text-stone-400 transition-colors mr-1">
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button onClick={() => deleteEvent(e.id)}
                        className="text-stone-700 hover:text-red-500 transition-colors text-xs">✕</button>
                    </div>
                  )
                ))}

                {/* due_at 있는 투두 목록 */}
                {selectedScheduled.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 bg-dark-200 border border-jeok-900/50 rounded-2xl px-4 py-3 mb-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === "done" ? "bg-jeok-600" : "bg-jeok-400"}`} />
                    <div className="flex-1">
                      <span className={`text-sm ${t.status === "done" ? "line-through text-stone-600" : "text-stone-200"}`}>{t.title}</span>
                      {t.due_at && <span className="text-xs text-jeok-500 ml-2">{new Date(t.due_at).toLocaleTimeString(uiLanguage === "zh" ? "zh-CN" : "ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                  </div>
                ))}

                {selectedEvents.length === 0 && selectedScheduled.length === 0 && !addingEvent && (
                  <p className="text-xs text-stone-700 px-1">{text.noEvents}</p>
                )}
              </div>
            )}

            {/* 완료된 투두 섹션 */}
            <div>
              <p className="text-xs text-stone-500 font-medium px-1 mb-2">{text.doneOn(month, selectedDay)}</p>
              {selectedDone.length === 0 ? (
                <p className="text-xs text-stone-700 px-1">{text.noDoneItems}</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedDone.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 bg-dark-200 border border-stone-800 rounded-2xl px-4 py-3">
                      <span className="w-4 h-4 rounded-full bg-jeok-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="flex-1 text-sm text-stone-500 line-through">{t.title}</span>
                      {t.done_at && (
                        <span className="text-xs text-stone-700 flex-shrink-0">
                          {new Date(t.done_at).toLocaleTimeString(uiLanguage === "zh" ? "zh-CN" : "ko-KR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
