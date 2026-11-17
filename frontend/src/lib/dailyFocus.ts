import type { TodayPlan } from "./api";

type Task = TodayPlan["tasks"][number];

export function dailyFocusTask(plan: TodayPlan, today: string): Task | null {
  const primary = plan.tasks.find(task => task.subject === plan.primary_subject
    && !(task.completed && task.unit_id === null && !["zh", "en", "ja"].includes(task.subject)));
  if (primary) return primary;

  // On a five-minute day there is no course task. Alternate the two short reviews.
  const day = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86_400_000);
  const language = day % 2 === 0 ? ["en", "zh"] : ["zh", "en"];
  return language.map(subject => plan.tasks.find(task => task.subject === subject)).find((task): task is Task => !!task)
    ?? plan.tasks.find(task => !task.completed)
    ?? plan.tasks[0]
    ?? null;
}

export function koreanDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (name: string) => parts.find(item => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
