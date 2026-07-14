"use client";

import { CalendarEvent, Task } from "@/lib/api";
import { COMMON_TEXT, useUiLanguage } from "@/lib/i18n";

// ChevronUp, ChevronDown을 간단히 SVG로 대신

interface WeekViewProps {
  year: number;
  month: number;
  day: number;
  events: CalendarEvent[];
  doneTasks: Task[];
  scheduledTasks: Task[];
  onDateClick: (day: number) => void;
  onEventMove: (eventId: number, newDate: string) => void;
}

export default function WeekView({
  year,
  month,
  day,
  events,
  doneTasks,
  scheduledTasks,
  onDateClick,
  onEventMove,
}: WeekViewProps) {
  const uiLanguage = useUiLanguage();
  const text = COMMON_TEXT[uiLanguage];
  const today = new Date();
  const current = new Date(year, month - 1, day);

  // 주 시작일 (일요일)
  const startOfWeek = new Date(current);
  startOfWeek.setDate(current.getDate() - current.getDay());

  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    weekDates.push(d);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleDragStart = (e: React.DragEvent, eventId: number) => {
    e.dataTransfer.setData("eventId", eventId.toString());
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const eventId = parseInt(e.dataTransfer.getData("eventId"));
    onEventMove(eventId, dateStr);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="bg-dark-200 rounded-2xl overflow-hidden">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-8 border-b border-stone-700">
        <div className="p-2 text-center text-xs text-stone-500">{text.time}</div>
        {weekDates.map((date, i) => {
          const isToday = date.toDateString() === today.toDateString();
          return (
            <div key={i} className="p-2 text-center border-l border-stone-700">
              <div className={`text-xs ${isToday ? "text-jeok-400 font-bold" : "text-stone-400"}`}>
                {text.weekdays[i]}
              </div>
              <div className={`text-sm font-semibold mt-1 ${isToday ? "text-jeok-300" : "text-stone-200"}`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* 시간별 그리드 */}
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-stone-800">
            <div className="p-2 text-center text-xs text-stone-600 border-r border-stone-700">
              {hour}:00
            </div>
            {weekDates.map((date, i) => {
              const dateStr = date.toISOString().split("T")[0];
              const hourEvents = events.filter((e) => {
                if (e.event_date !== dateStr) return false;
                if (!e.event_time) return hour === 9; // 시간 없으면 9시에 표시
                const eventHour = parseInt(e.event_time.split(":")[0]);
                return eventHour === hour;
              });

              const hourDone = doneTasks.filter((t) => {
                if (!t.done_at) return false;
                const tDate = new Date(t.done_at).toISOString().split("T")[0];
                return tDate === dateStr;
              });

              const hourScheduled = scheduledTasks.filter((t) => {
                if (!t.due_at) return false;
                const tDate = new Date(t.due_at).toISOString().split("T")[0];
                return tDate === dateStr;
              });

              return (
                <div
                  key={i}
                  className="min-h-[40px] border-l border-stone-800 p-1 relative"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, dateStr)}
                  onClick={() => onDateClick(date.getDate())}
                >
                  {hourEvents.map((e) => (
                    <div
                      key={e.id}
                      draggable
                      onDragStart={(ev) => handleDragStart(ev, e.id)}
                      className={`text-xs p-1 rounded mb-1 truncate cursor-move ${
                        e.color
                          ? `border-l-2 bg-opacity-20`
                          : "bg-blue-900/30 border-l-2 border-blue-500"
                      }`}
                      style={{
                        backgroundColor: e.color ? `${e.color}20` : undefined,
                        borderLeftColor: e.color || undefined,
                      }}
                    >
                      {e.title}
                    </div>
                  ))}
                  {hourScheduled.map((t) => (
                    <div
                      key={t.id}
                      className="text-xs p-1 rounded mb-1 truncate bg-jeok-900/30 border-l-2 border-jeok-500"
                    >
                      {t.title}
                    </div>
                  ))}
                  {hourDone.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      className="text-xs p-1 rounded mb-1 truncate bg-green-900/20 border-l-2 border-green-600 text-stone-500 line-through"
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
