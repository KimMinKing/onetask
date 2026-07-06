"use client";

import { useState } from "react";

// 간단한 SVG 아이콘
const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronUp = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M3 7.5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

type Frequency = "none" | "daily" | "weekly" | "monthly" | "yearly";
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=월, 6=일

interface RecurrencePickerProps {
  value: string | null;
  onChange: (rrule: string | null) => void;
}

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export default function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [open, setOpen] = useState(false);

  // 현재 값 파싱
  const parseValue = (): { frequency: Frequency; interval: number; weekdays?: Weekday[] } => {
    if (!value) return { frequency: "none", interval: 1 };

    if (value.includes("DAILY")) return { frequency: "daily", interval: 1 };
    if (value.includes("WEEKLY")) {
      const match = value.match(/FREQ=WEEKLY;BYDAY=(.+)/);
      if (match) {
        const daysMap: Record<string, Weekday> = {
          MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6,
        };
        const weekdays = match[1].split(",").map((d) => daysMap[d]);
        return { frequency: "weekly", interval: 1, weekdays };
      }
      return { frequency: "weekly", interval: 1 };
    }
    if (value.includes("MONTHLY")) return { frequency: "monthly", interval: 1 };
    if (value.includes("YEARLY")) return { frequency: "yearly", interval: 1 };

    return { frequency: "none", interval: 1 };
  };

  const current = parseValue();

  const generateRRule = (frequency: Frequency, weekdays?: Weekday[]): string | null => {
    if (frequency === "none") return null;

    switch (frequency) {
      case "daily":
        return "FREQ=DAILY";
      case "weekly":
        if (weekdays && weekdays.length > 0) {
          const daysAbbr: Record<Weekday, string> = {
            0: "MO", 1: "TU", 2: "WE", 3: "TH", 4: "FR", 5: "SA", 6: "SU",
          };
          const byday = weekdays.map((d) => daysAbbr[d]).join(",");
          return `FREQ=WEEKLY;BYDAY=${byday}`;
        }
        return "FREQ=WEEKLY";
      case "monthly":
        return "FREQ=MONTHLY";
      case "yearly":
        return "FREQ=YEARLY";
    }
  };

  const handleFrequencyChange = (frequency: Frequency) => {
    const newRule = generateRRule(frequency, current.weekdays);
    onChange(newRule);
  };

  const handleWeekdayToggle = (day: Weekday) => {
    const currentWeekdays = current.weekdays || [];
    const newWeekdays = currentWeekdays.includes(day)
      ? currentWeekdays.filter((d) => d !== day)
      : [...currentWeekdays, day].sort();

    const newRule = generateRRule(newWeekdays.length > 0 ? "weekly" : "none", newWeekdays);
    onChange(newRule);
  };

  const frequencyLabel: Record<Frequency, string> = {
    none: "반복 안 함",
    daily: "매일",
    weekly: current.weekdays && current.weekdays.length > 0
      ? current.weekdays.map((d) => WEEKDAYS[d]).join(", ") + "요일"
      : "매주",
    monthly: "매월",
    yearly: "매년",
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs px-3 py-1.5 rounded-full border font-medium transition-all flex items-center gap-1
          bg-dark-300 text-stone-400 border-stone-700 hover:border-stone-500"
      >
        🔄 {frequencyLabel[current.frequency]}
        {open ? <ChevronUp /> : <ChevronDown />}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-dark-100 border border-stone-700 rounded-xl p-3 min-w-[200px] z-10 shadow-xl">
          <div className="space-y-1">
            {([
              { value: "none" as Frequency, label: "반복 안 함" },
              { value: "daily" as Frequency, label: "매일" },
              { value: "weekly" as Frequency, label: "매주" },
              { value: "monthly" as Frequency, label: "매월" },
              { value: "yearly" as Frequency, label: "매년" },
            ]).map((freq) => (
              <button
                key={freq.value}
                type="button"
                onClick={() => {
                  handleFrequencyChange(freq.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  current.frequency === freq.value
                    ? "bg-jeok-900 text-jeok-300"
                    : "text-stone-400 hover:bg-dark-200 hover:text-stone-200"
                }`}
              >
                {freq.label}
              </button>
            ))}
          </div>

          {current.frequency === "weekly" && (
            <div className="mt-3 pt-3 border-t border-stone-700">
              <p className="text-xs text-stone-500 mb-2">반복 요일 선택</p>
              <div className="flex gap-1 flex-wrap">
                {WEEKDAYS.map((day, i) => {
                  const dayValue = i as Weekday;
                  const isSelected = (current.weekdays || []).includes(dayValue);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleWeekdayToggle(dayValue)}
                      className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-jeok-600 text-white"
                          : "bg-dark-300 text-stone-500 hover:bg-dark-200"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
