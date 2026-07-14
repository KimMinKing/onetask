"use client";

import { Task } from "@/lib/api";
import { useTaskStore } from "@/store/taskStore";
import { COMMON_TEXT, UiLanguage, useUiLanguage } from "@/lib/i18n";

function timeStr(iso: string, uiLanguage: UiLanguage) {
  return new Date(iso).toLocaleTimeString(uiLanguage === "zh" ? "zh-CN" : "ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function DoneItem({ task, uiLanguage }: { task: Task; uiLanguage: UiLanguage }) {
  const { toggleDone } = useTaskStore();
  const isUnexpected = task.urgency === "low";

  return (
    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all
      ${isUnexpected
        ? "bg-amber-950/30 border-amber-800/40"
        : "bg-dark-200 border-stone-800"}`}>
      <button
        onClick={() => toggleDone(task.id, task.status)}
        className="w-5 h-5 rounded-full bg-jeok-600 border-jeok-600 border-2 flex-shrink-0 flex items-center justify-center"
      >
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isUnexpected && <span className="text-xs">✨</span>}
          <span className="text-sm text-stone-500 line-through leading-snug">{task.title}</span>
        </div>
        {task.category && (
          <span className="mt-0.5 inline-block text-[11px] text-jeok-500 bg-jeok-950 px-2 py-0.5 rounded-full">
            {task.category}
          </span>
        )}
      </div>

      {task.done_at && (
        <span className="text-xs text-stone-700 flex-shrink-0">{timeStr(task.done_at, uiLanguage)}</span>
      )}
    </div>
  );
}

export default function DoneList({ tasks }: { tasks: Task[] }) {
  const uiLanguage = useUiLanguage();
  const text = COMMON_TEXT[uiLanguage];
  const today = new Date().toDateString();

  const todayTasks = tasks.filter(
    (t) => t.done_at && new Date(t.done_at).toDateString() === today
  );
  const earlierTasks = tasks.filter(
    (t) => !t.done_at || new Date(t.done_at).toDateString() !== today
  );

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">🌱</p>
        <p className="text-sm text-stone-600">{text.noDone}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {todayTasks.length > 0 && (
        <section>
          <p className="text-xs text-stone-600 font-medium px-1 mb-2">{text.today}</p>
          <div className="space-y-2">
            {todayTasks.map((t) => <DoneItem key={t.id} task={t} uiLanguage={uiLanguage} />)}
          </div>
        </section>
      )}

      {earlierTasks.length > 0 && (
        <section>
          <p className="text-xs text-stone-600 font-medium px-1 mb-2">{text.earlier}</p>
          <div className="space-y-2">
            {earlierTasks.map((t) => <DoneItem key={t.id} task={t} uiLanguage={uiLanguage} />)}
          </div>
        </section>
      )}
    </div>
  );
}
