import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
});

const { saveStudyCheckpoint, readStudyCheckpoint, latestStudyCheckpoint, clearStudyCheckpoint } = await import("../src/lib/studyCheckpoint.ts");
const { setAuth } = await import("../src/lib/auth.ts");
const values = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};

test("resumes phase and answer for the current user, and finds the latest course", () => {
  values.clear();
  setAuth({ username: "first", is_master: false });
  const originalNow = Date.now;
  try {
    Date.now = () => 100;
    saveStudyCheckpoint({ subject: "rust", step: 3, title: "소유권", phase: "practice", paused: true, draft: { answer: "내 설명", revealed: false } });
    Date.now = () => 200;
    saveStudyCheckpoint({ subject: "sqld", step: 2, title: "테이블", phase: "concept", paused: false, draft: { choice: null } });
  } finally {
    Date.now = originalNow;
  }
  assert.equal(readStudyCheckpoint("rust")?.draft.answer, "내 설명");
  assert.equal(readStudyCheckpoint("rust")?.paused, true);
  assert.equal(latestStudyCheckpoint()?.subject, "sqld");
  setAuth({ username: "second", is_master: false });
  assert.equal(latestStudyCheckpoint(), null);
  setAuth({ username: "first", is_master: false });
  clearStudyCheckpoint("sqld");
  assert.equal(latestStudyCheckpoint()?.subject, "rust");
});

test("rejects damaged or out-of-range checkpoint data", () => {
  values.clear();
  setAuth({ username: "first", is_master: false });
  const key = "story_checkpoint_v1_english-basics:user:first";
  values.set(key, JSON.stringify({ subject: "english-basics", step: 26, title: "bad", phase: "story", paused: false, draft: {}, updatedAt: 1 }));
  assert.equal(readStudyCheckpoint("english-basics"), null);
  values.set(key, JSON.stringify({ subject: "english-basics", step: 1, title: "bad", phase: "practice", paused: false, draft: { practicing: true, queue: [999], cursor: 0, typed: "", feedback: "", sentence: "", sentenceChecked: false }, updatedAt: 1 }));
  assert.equal(readStudyCheckpoint("english-basics"), null);
});

test("SQLD keeps tried choices for another attempt and rejects damaged choice lists", () => {
  values.clear();
  setAuth({ username: "first", is_master: false });
  const base = { subject: "sqld", step: 1, title: "모델링", phase: "practice", paused: false };
  saveStudyCheckpoint({ ...base, draft: { choice: null, wrongChoices: [0, 2] } });
  assert.deepEqual(readStudyCheckpoint("sqld")?.draft.wrongChoices, [0, 2]);
  saveStudyCheckpoint({ ...base, draft: { choice: null, wrongChoices: [0, 0] } });
  assert.equal(readStudyCheckpoint("sqld"), null);
});
