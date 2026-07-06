"use client";

import { CalendarEvent, Task } from "@/lib/api";

interface DayViewProps {
  year: number;
  month: number;
  day: number;
  events: CalendarEvent[];
  doneTasks: Task[];
  scheduledTasks: Task[];
  onEventMove: (eventId: number, newDate: string) => void;
}

export default function DayView({
  year,
  month,
  day,
  events,
  doneTasks,
  scheduledTasks,
  onEventMove,
}: DayViewProps) {
  const today = new Date();
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day;

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleDragStart = (e: React.DragEvent, eventId: number) => {
    e.dataTransfer.setData("eventId", eventId.toString());
  };

  const handleDrop = (e: React.DragEvent, newDate: string) => {
    e.preventDefault();
    const eventId = parseInt(e.dataTransfer.getData("eventId"));
    onEventMove(eventId, newDate);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const dateLabel = new Date(year, month - 1, day).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="bg-dark-200 rounded-2xl overflow-hidden">
      {/* 날짜 헤더 */}
      <div className="px-4 py-3 border-b border-stone-700">
        <h2 className={`text-lg font-semibold ${isToday ? "text-jeok-400" : "text-stone-200"}`}>
          {dateLabel}
          {isToday && " (오늘)"}
        </h2>
      </div>

      {/* 시간별 그리드 */}
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((hour) => {
          const hourEvents = events.filter((e) => {
            if (e.event_date !== dateStr) return false;
            if (!e.event_time) return hour === 9;
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
            <div key={hour} className="flex border-b border-stone-800">
              <div className="w-16 p-3 text-center text-xs text-stone-600 flex-shrink-0">
                {hour}:00
              </div>
              <div
                className="flex-1 min-h-[50px] p-2 relative"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dateStr)}
              >
                {hourEvents.map((e) => (
                  <div
                    key={e.id}
                    draggable
                    onDragStart={(ev) => handleDragStart(ev, e.id)}
                    className={`text-sm p-2 rounded-lg mb-2 cursor-move ${
                      e.color
                        ? ""
                        : "bg-blue-900/30 border-l-4 border-blue-500"
                    }`}
                    style={{
                      backgroundColor: e.color ? `${e.color}30` : undefined,
                      borderLeftColor: e.color || undefined,
                    }}
                  >
                    <div className="font-medium text-stone-200">{e.title}</div>
                    {e.event_time && (
                      <div className="text-xs text-stone-500 mt-1">{e.event_time}</div>
                    )}
                  </div>
                ))}
                {hourScheduled.map((t) => (
                  <div
                    key={t.id}
                    className="text-sm p-2 rounded-lg mb-2 bg-jeok-900/30 border-l-4 border-jeok-500"
                  >
                    <div className="font-medium text-stone-200">{t.title}</div>
                    {t.due_at && (
                      <div className="text-xs text-jeok-400 mt-1">
                        {new Date(t.due_at).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {hourDone.map((t) => (
                  <div
                    key={t.id}
                    className="text-sm p-2 rounded-lg mb-2 bg-green-900/20 border-l-4 border-green-600"
                  >
                    <div className="font-medium text-stone-500 line-through">{t.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 통계 */}
      <div className="px-4 py-3 border-t border-stone-700 flex gap-4 text-xs">
        <span className="text-stone-500">
          완료: <span className="text-green-500 font-medium">{doneTasks.length}</span>
        </span>
        <span className="text-stone-500">
          일정: <span className="text-blue-400 font-medium">{events.length}</span>
        </span>
        <span className="text-stone-500">
          예정: <span className="text-jeok-400 font-medium">{scheduledTasks.length}</span>
        </span>
      </div>
    </div>
  );
}
