"use client";

import { useRef, useState } from "react";
import { useTaskStore } from "@/store/taskStore";
import { Urgency } from "@/lib/api";
import { COMMON_TEXT, useUiLanguage } from "@/lib/i18n";

function defaultDue() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const date = d.toLocaleDateString("sv-SE"); // "YYYY-MM-DD"
  const time = `${String(d.getHours()).padStart(2, "0")}:00`;
  return { date, time };
}

export default function AddTaskForm() {
  const { addTask, categories } = useTaskStore();
  const uiLanguage = useUiLanguage();
  const text = COMMON_TEXT[uiLanguage];
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [showDate, setShowDate] = useState(false);
  const [open, setOpen] = useState(false);

  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  const toggleDate = () => {
    if (showDate) {
      setDueDate(""); setDueTime(""); setShowDate(false);
    } else {
      const { date, time } = defaultDue();
      setDueDate(date); setDueTime(time); setShowDate(true);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    let due_at: string | undefined;
    if (dueDate) {
      due_at = new Date(`${dueDate}T${dueTime || "00:00"}`).toISOString();
    }
    await addTask(title.trim(), category || undefined, urgency, due_at);
    setTitle(""); setCategory(""); setUrgency("normal");
    setDueDate(""); setDueTime(""); setShowDate(false); setOpen(false);
  };

  const cancel = () => {
    setTitle(""); setCategory(""); setUrgency("normal");
    setDueDate(""); setDueTime(""); setShowDate(false); setOpen(false);
  };

  const dueDateLabel = dueDate
    ? new Date(`${dueDate}T00:00`).toLocaleDateString(uiLanguage === "zh" ? "zh-CN" : "ko-KR", { month: "numeric", day: "numeric" })
    : text.date;

  return (
    <div className="mb-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-dark-200 border border-dashed border-stone-700 hover:border-jeok-600 rounded-2xl text-stone-500 hover:text-jeok-400 transition-all"
        >
          <span className="text-xl leading-none">+</span>
          <span className="text-sm font-medium">{text.addTask}</span>
        </button>
      ) : (
        <form onSubmit={submit} className="bg-dark-200 border border-stone-700 rounded-2xl p-4 space-y-4">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={text.taskPlaceholder}
            className="w-full text-stone-100 text-sm placeholder-stone-600 bg-transparent border-b border-stone-700 pb-2 outline-none focus:border-jeok-500 transition-colors"
          />

          <div className="flex flex-col gap-3">
            {categories.length > 0 && (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-xs text-stone-300 border border-stone-700 rounded-full px-3 py-1.5 outline-none bg-dark-300 w-fit"
              >
                <option value="">{text.noCategory}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            )}

            <div className="flex gap-2 flex-wrap">
              {([
                { value: "high" as Urgency, label: text.urgent, active: "bg-red-900 text-red-400 border-red-700", idle: "text-stone-500 border-stone-700" },
                { value: "normal" as Urgency, label: text.normal, active: "bg-jeok-900 text-jeok-400 border-jeok-700", idle: "text-stone-500 border-stone-700" },
                { value: "low" as Urgency, label: text.someday, active: "bg-stone-800 text-stone-300 border-stone-600", idle: "text-stone-600 border-stone-800" },
              ]).map(({ value, label, active, idle }) => (
                <button key={value} type="button" onClick={() => setUrgency(value)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${urgency === value ? active : idle}`}>
                  {label}
                </button>
              ))}

              {/* 날짜 토글 버튼 */}
              <button type="button" onClick={toggleDate}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all
                  ${showDate ? "bg-blue-900 text-blue-300 border-blue-700" : "text-stone-500 border-stone-700 hover:border-stone-500"}`}>
                🗓 {showDate ? dueDateLabel : text.date}
              </button>
            </div>

            {/* 날짜/시간 선택 */}
            {showDate && (
              <div className="flex gap-2">
                {/* 날짜 버튼 */}
                <button type="button" onClick={() => { try { dateRef.current?.showPicker?.(); } catch { dateRef.current?.click(); } }}
                  className="relative flex items-center gap-1.5 bg-dark-300 border border-blue-800 hover:border-blue-600 rounded-xl px-3 py-2 text-xs text-blue-300 font-medium transition-all">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M1 5h10" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  {dueDateLabel}
                  <input ref={dateRef} type="date" value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full cursor-pointer" />
                </button>

                {/* 시간 버튼 */}
                <button type="button" onClick={() => { try { timeRef.current?.showPicker?.(); } catch { timeRef.current?.click(); } }}
                  className="relative flex items-center gap-1.5 bg-dark-300 border border-blue-800 hover:border-blue-600 rounded-xl px-3 py-2 text-xs text-blue-300 font-medium transition-all">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {dueTime || text.time}
                  <input ref={timeRef} type="time" value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full cursor-pointer" />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={cancel}
              className="text-xs text-stone-600 hover:text-stone-400 px-3 py-1.5 rounded-full transition-colors">
              {text.cancel}
            </button>
            <button type="submit" disabled={!title.trim()}
              className="text-xs bg-jeok-600 hover:bg-jeok-500 text-white px-5 py-1.5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              {text.add}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
