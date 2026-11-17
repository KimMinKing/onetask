import test from "node:test";
import assert from "node:assert/strict";

const { dailyFocusTask, koreanDate } = await import("../src/lib/dailyFocus.ts");
const { isDailyFocus } = await import("../src/lib/dailyFocusMarker.ts");
const task = (subject, completed = false, unit_id = "1") => ({ id: `${subject}:${unit_id}`, subject, title: subject, minutes: 5, href: `/${subject}`, unit_id, completed });

test("one main course is the default next action", () => {
  const plan = { primary_subject: "rust", tasks: [task("zh", false, null), task("en", false, null), task("rust")] };
  assert.equal(dailyFocusTask(plan, "2026-11-17")?.subject, "rust");
});

test("five-minute days alternate Chinese and English without a main course task", () => {
  const plan = { primary_subject: "rust", tasks: [task("zh", false, null), task("en", false, null)] };
  const first = dailyFocusTask(plan, "2026-11-17")?.subject;
  const second = dailyFocusTask(plan, "2026-11-18")?.subject;
  assert.notEqual(first, second);
  assert.deepEqual(new Set([first, second]), new Set(["zh", "en"]));
});

test("finished main course falls back to a language review", () => {
  const plan = { primary_subject: "sqld", tasks: [task("zh", false, null), task("en", false, null), task("sqld", true, null)] };
  assert.ok(["zh", "en"].includes(dailyFocusTask(plan, "2026-11-17")?.subject));
});

test("the study day changes at midnight in Korea", () => {
  assert.equal(koreanDate(new Date("2026-11-16T14:59:59Z")), "2026-11-16");
  assert.equal(koreanDate(new Date("2026-11-16T15:00:00Z")), "2026-11-17");
});

test("only the recommended course step receives the daily focus marker", () => {
  globalThis.window = { location: { search: "?step=3&daily_focus=sqld%3A3" } };
  try {
    assert.equal(isDailyFocus("sqld", 3), true);
    assert.equal(isDailyFocus("sqld", 4), false);
    assert.equal(isDailyFocus("rust", 3), false);
  } finally {
    delete globalThis.window;
  }
});
