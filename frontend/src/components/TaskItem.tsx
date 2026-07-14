"use client";

import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, Urgency } from "@/lib/api";
import { useTaskStore } from "@/store/taskStore";
import { COMMON_TEXT, useUiLanguage } from "@/lib/i18n";

const URGENCY_BAR: Record<Urgency, string> = {
  high:   "border-l-[3px] border-red-500",
  normal: "border-l-[3px] border-jeok-700",
  low:    "border-l-[3px] border-stone-700",
};

function defaultDue(existing?: string | null) {
  if (existing) {
    const d = new Date(existing);
    return {
      date: d.toLocaleDateString("sv-SE"),
      time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    };
  }
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return { date: d.toLocaleDateString("sv-SE"), time: `${String(d.getHours()).padStart(2, "0")}:00` };
}

export default function TaskItem({ task }: { task: Task }) {
  const { toggleDone, deleteTask, editTask } = useTaskStore();
  const uiLanguage = useUiLanguage();
  const text = COMMON_TEXT[uiLanguage];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [urgency, setUrgency] = useState<Urgency>(task.urgency);
  const [showDate, setShowDate] = useState(!!task.due_at);
  const [dueDate, setDueDate] = useState(() => defaultDue(task.due_at).date);
  const [dueTime, setDueTime] = useState(() => defaultDue(task.due_at).time);
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const isDone = task.status === "done";

  const openEdit = () => {
    setTitle(task.title);
    setUrgency(task.urgency);
    setShowDate(!!task.due_at);
    if (task.due_at) {
      const { date, time } = defaultDue(task.due_at);
      setDueDate(date); setDueTime(time);
    }
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!title.trim()) return;
    let due_at: string | undefined | null = undefined;
    if (showDate && dueDate) {
      due_at = new Date(`${dueDate}T${dueTime || "00:00"}`).toISOString();
    } else if (!showDate && task.due_at) {
      due_at = null;
    }
    await editTask(task.id, {
      title: title.trim(),
      urgency,
      ...(due_at !== undefined ? { due_at } : {}),
    });
    setEditing(false);
  };

  const dueDateLabel = dueDate
    ? new Date(`${dueDate}T00:00`).toLocaleDateString(uiLanguage === "zh" ? "zh-CN" : "ko-KR", { month: "numeric", day: "numeric" })
    : text.date;

  /* ── 수정 모드 ── */
  if (editing) {
    return (
      <div ref={setNodeRef} style={style}
        className={`bg-dark-200 border border-jeok-800 rounded-2xl px-4 py-4 space-y-3 ${URGENCY_BAR[urgency]}`}>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
          className="w-full text-stone-100 text-sm bg-transparent border-b border-stone-700 pb-1.5 outline-none focus:border-jeok-500 transition-colors"
        />
        <div className="flex gap-2 flex-wrap items-center">
          {([
            { value: "high" as Urgency, label: "🔥", active: "bg-red-900 text-red-400 border-red-700", idle: "text-stone-500 border-stone-700" },
            { value: "normal" as Urgency, label: text.normal, active: "bg-jeok-900 text-jeok-400 border-jeok-700", idle: "text-stone-500 border-stone-700" },
            { value: "low" as Urgency, label: text.someday, active: "bg-stone-800 text-stone-300 border-stone-600", idle: "text-stone-600 border-stone-800" },
          ]).map(({ value, label, active, idle }) => (
            <button key={value} type="button" onClick={() => setUrgency(value)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${urgency === value ? active : idle}`}>
              {label}
            </button>
          ))}
          <button type="button"
            onClick={() => { setShowDate((v) => !v); }}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all
              ${showDate ? "bg-blue-900 text-blue-300 border-blue-700" : "text-stone-500 border-stone-700"}`}>
            🗓 {showDate ? dueDateLabel : text.date}
          </button>
        </div>
        {showDate && (
          <div className="flex gap-2">
            <button type="button" onClick={() => { try { dateRef.current?.showPicker?.(); } catch { dateRef.current?.click(); } }}
              className="relative flex items-center gap-1.5 bg-dark-300 border border-blue-800 hover:border-blue-600 rounded-xl px-3 py-1.5 text-xs text-blue-300 font-medium transition-all">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 5h10" stroke="currentColor" strokeWidth="1.3"/><path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              {dueDateLabel}
              <input ref={dateRef} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="absolute inset-0 opacity-0 w-full cursor-pointer" />
            </button>
            <button type="button" onClick={() => { try { timeRef.current?.showPicker?.(); } catch { timeRef.current?.click(); } }}
              className="relative flex items-center gap-1.5 bg-dark-300 border border-blue-800 hover:border-blue-600 rounded-xl px-3 py-1.5 text-xs text-blue-300 font-medium transition-all">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {dueTime || text.time}
              <input ref={timeRef} type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
                className="absolute inset-0 opacity-0 w-full cursor-pointer" />
            </button>
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={cancelEdit} className="text-xs text-stone-600 hover:text-stone-400 px-3 py-1 rounded-full transition-colors">{text.cancel}</button>
          <button onClick={saveEdit} disabled={!title.trim()}
            className="text-xs bg-jeok-600 hover:bg-jeok-500 text-white px-4 py-1 rounded-full disabled:opacity-30 transition-colors">{text.save}</button>
        </div>
      </div>
    );
  }

  /* ── 기본 모드 ── */
  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-3 bg-dark-200 border border-stone-800 rounded-2xl px-4 py-3.5 ${URGENCY_BAR[task.urgency]} ${isDone ? "opacity-50" : ""}`}>
      <button {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing active:scale-75 text-stone-700 hover:text-stone-500 touch-none flex-shrink-0 text-lg leading-none"
        tabIndex={-1}>
        ⠿
      </button>

      <button onClick={() => toggleDone(task.id, task.status)}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          isDone ? "bg-jeok-600 border-jeok-600" : "border-stone-600 hover:border-jeok-500"}`}>
        {isDone && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.urgency === "high" && !isDone && <span className="text-xs text-red-500">🔥</span>}
          <span className={`text-sm leading-snug ${isDone ? "line-through text-stone-600" : "text-stone-200"}`}>
            {task.title}
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap mt-0.5">
          {task.category && (
            <span className="text-[11px] text-jeok-400 bg-jeok-900 px-2 py-0.5 rounded-full">{task.category}</span>
          )}
          {task.due_at && (
            <span className="text-[11px] text-blue-400 bg-blue-950 px-2 py-0.5 rounded-full">
              🗓 {new Date(task.due_at).toLocaleDateString(uiLanguage === "zh" ? "zh-CN" : "ko-KR", { month: "numeric", day: "numeric" })}{" "}
              {new Date(task.due_at).toLocaleTimeString(uiLanguage === "zh" ? "zh-CN" : "ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {!isDone && (
        <button onClick={openEdit}
          className="text-stone-700 hover:text-stone-400 flex-shrink-0 transition-colors"
          tabIndex={-1}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      <button onClick={() => deleteTask(task.id)}
        className="text-stone-700 hover:text-red-500 flex-shrink-0 transition-colors text-sm"
        tabIndex={-1}>
        ✕
      </button>
    </div>
  );
}
