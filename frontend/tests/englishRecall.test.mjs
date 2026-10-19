import test from "node:test";
import assert from "node:assert/strict";
import { advanceEnglishRecall, matchesEnglishSpelling } from "../src/lib/englishRecall.ts";

test("spelling requires the whole English word, allowing case and spacing", () => {
  assert.equal(matchesEnglishSpelling("  Take   Off ", "take off"), true);
  assert.equal(matchesEnglishSpelling("take", "take off"), false);
  assert.equal(matchesEnglishSpelling("", "take off"), false);
});

test("missed words return after the first pass until correctly recalled", () => {
  const first = advanceEnglishRecall(["one", "two"], 0, false);
  assert.deepEqual(first.queue, ["one", "two", "one"]);
  assert.equal(first.done, false);
  const second = advanceEnglishRecall(first.queue, first.nextIndex, true);
  assert.equal(second.done, false);
  const third = advanceEnglishRecall(second.queue, second.nextIndex, true);
  assert.equal(third.done, true);
});
