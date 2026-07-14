"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type UiLanguage = "ko" | "zh";

export const COMMON_TEXT = {
  ko: {
    logout: "로그아웃",
    settings: "설정",
    notifications: "알림",
    todo: "할일",
    done: "완료",
    todayDone: "오늘 완료",
    words: "단어",
    addTask: "할일 추가",
    taskPlaceholder: "할일을 입력하세요...",
    noTodo: "할일이 없어요!",
    noDone: "아직 완료한 게 없어요",
    today: "오늘",
    earlier: "이전",
    cancel: "취소",
    save: "저장",
    saving: "저장 중...",
    add: "추가",
    date: "날짜",
    time: "시간",
    noCategory: "카테고리 없음",
    urgent: "🔥 급함",
    normal: "보통",
    someday: "언젠간",
    calendar: "캘린더",
    completedCount: (count: number) => `${count}개 완료`,
    eventCount: (count: number) => `${count}개 일정`,
    count: (count: number) => `${count}개`,
    byMonth: "월별",
    byWeek: "주별",
    byDay: "일별",
    weekdays: ["일", "월", "화", "수", "목", "금", "토"],
    scheduleOn: (month: number, day: number) => `${month}월 ${day}일 일정`,
    doneOn: (month: number, day: number) => `${month}월 ${day}일 완료`,
    addEvent: "+ 추가",
    eventTitle: "일정 제목...",
    noEvents: "일정 없음",
    noDoneItems: "완료된 항목 없음",
    recurring: {
      none: "반복 안 함",
      daily: "매일",
      weekly: "매주",
      monthly: "매월",
      yearly: "매년",
      chooseDays: "반복 요일 선택",
      weekdays: ["월", "화", "수", "목", "금", "토", "일"],
      suffix: "요일",
    },
  },
  zh: {
    logout: "退出登录",
    settings: "设置",
    notifications: "通知",
    todo: "待办",
    done: "已完成",
    todayDone: "今日完成",
    words: "单词",
    addTask: "添加待办",
    taskPlaceholder: "请输入待办事项...",
    noTodo: "没有待办事项！",
    noDone: "还没有完成的事项",
    today: "今天",
    earlier: "以前",
    cancel: "取消",
    save: "保存",
    saving: "保存中...",
    add: "添加",
    date: "日期",
    time: "时间",
    noCategory: "无分类",
    urgent: "🔥 紧急",
    normal: "普通",
    someday: "以后再说",
    calendar: "日历",
    completedCount: (count: number) => `已完成 ${count} 项`,
    eventCount: (count: number) => `${count} 个日程`,
    count: (count: number) => `${count} 个`,
    byMonth: "按月",
    byWeek: "按周",
    byDay: "按日",
    weekdays: ["日", "一", "二", "三", "四", "五", "六"],
    scheduleOn: (month: number, day: number) => `${month}月${day}日 日程`,
    doneOn: (month: number, day: number) => `${month}月${day}日 已完成`,
    addEvent: "+ 添加",
    eventTitle: "日程标题...",
    noEvents: "暂无日程",
    noDoneItems: "暂无完成事项",
    recurring: {
      none: "不重复",
      daily: "每天",
      weekly: "每周",
      monthly: "每月",
      yearly: "每年",
      chooseDays: "选择重复星期",
      weekdays: ["一", "二", "三", "四", "五", "六", "日"],
      suffix: "",
    },
  },
} as const;

export function useUiLanguage(): UiLanguage {
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("ko");

  useEffect(() => {
    api.settings.get()
      .then((settings) => setUiLanguage(settings.ui_language === "zh" ? "zh" : "ko"))
      .catch(() => {});

    const handleSettingsUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ ui_language?: string }>).detail;
      setUiLanguage(detail?.ui_language === "zh" ? "zh" : "ko");
    };

    window.addEventListener("onetask-settings-updated", handleSettingsUpdate);
    return () => window.removeEventListener("onetask-settings-updated", handleSettingsUpdate);
  }, []);

  return uiLanguage;
}
