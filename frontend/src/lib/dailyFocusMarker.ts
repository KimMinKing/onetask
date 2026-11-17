export function isDailyFocus(subject: string, unitId: number): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("daily_focus") === `${subject}:${unitId}`;
}
