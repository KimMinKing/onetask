import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
});

const { summarizeCourseProgress, latestServerContinuation } = await import("../src/app/learn/courseProgress.ts");
const row = (subject, unit_id, completed_at = "2026-11-15T00:00:00Z") => ({ subject, unit_id, completed: true, completed_at, updated_at: completed_at ?? "2026-11-15T00:00:00Z" });

test("course cards continue at the first missing step, even with gaps", () => {
  const summary = summarizeCourseProgress([row("cpp", "1"), row("cpp", "3"), row("cpp", "3"), row("cpp", "41"), row("cpp", "02")]);
  assert.deepEqual(summary.cpp, { completed: 2, next: 2 });
  assert.deepEqual(summary.csharp, { completed: 0, next: 1 });
});

test("a finished course returns to its list and server continuation skips it", () => {
  const rows = Array.from({ length: 40 }, (_, index) => row("cpp", String(index + 1), "2026-11-15T00:00:00Z"));
  rows.push(row("csharp", "1", "2026-11-14T00:00:00Z"));
  const summary = summarizeCourseProgress(rows);
  assert.deepEqual(summary.cpp, { completed: 40, next: null });
  assert.deepEqual(latestServerContinuation(rows, summary), { subject: "csharp", step: 2, updatedAt: Date.parse("2026-11-14T00:00:00Z") });
});

test("server continuation chooses the most recent unfinished course", () => {
  const rows = [row("rust", "1", "2026-11-13T00:00:00Z"), row("sqld", "4", "2026-11-15T00:00:00Z")];
  assert.deepEqual(latestServerContinuation(rows, summarizeCourseProgress(rows)), { subject: "sqld", step: 1, updatedAt: Date.parse("2026-11-15T00:00:00Z") });
});

test("older completed rows without completion timestamps still continue", () => {
  const rows = [row("network", "1", null)];
  assert.deepEqual(latestServerContinuation(rows, summarizeCourseProgress(rows)), { subject: "network", step: 2, updatedAt: Date.parse("2026-11-15T00:00:00Z") });
});
