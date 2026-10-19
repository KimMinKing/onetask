import test from "node:test";
import assert from "node:assert/strict";
import { ENGLISH_CHAPTERS, reviewWords } from "../src/app/english-basics/curriculum.ts";
import { RUST_CURRICULUM } from "../src/app/rust/curriculum.ts";
import { RUST_STORY } from "../src/app/rust/story.ts";
import { RUST_EXPLANATIONS } from "../src/app/rust/explanations.ts";
import { ENGLISH_EXPLANATIONS } from "../src/app/english-basics/explanations.ts";
import { PYTHON_BRIDGES } from "../src/app/rust/pythonBridges.ts";

test("each Rust lesson has a connected scene and a concrete bridge", () => {
  assert.equal(RUST_CURRICULUM.length, 54);
  assert.equal(RUST_STORY.length, RUST_CURRICULUM.length);
  assert.equal(RUST_EXPLANATIONS.length, RUST_CURRICULUM.length);
  for (const lesson of RUST_CURRICULUM) {
    const scene = RUST_STORY[lesson.id - 1];
    assert.equal(scene.id, lesson.id);
    assert.ok(scene.story.length > 80);
    assert.ok(scene.bridge.length > 30);
    const extra = RUST_EXPLANATIONS[lesson.id - 1];
    assert.equal(extra.id, lesson.id);
    assert.ok(extra.walkthrough.length > 100, `Rust ${lesson.id} walkthrough`);
    assert.ok(extra.anotherLook.length > 100, `Rust ${lesson.id} another look`);
  }
  assert.equal(new Set(PYTHON_BRIDGES.map(bridge => bridge.id)).size, PYTHON_BRIDGES.length);
  assert.ok(PYTHON_BRIDGES.every(bridge => bridge.id >= 1 && bridge.id <= RUST_CURRICULUM.length && bridge.python && bridge.rust && bridge.explanation));
});

test("English chapters begin at basics and revisit earlier vocabulary", () => {
  assert.equal(ENGLISH_CHAPTERS.length, 25);
  assert.equal(ENGLISH_EXPLANATIONS.length, ENGLISH_CHAPTERS.length);
  assert.equal(ENGLISH_CHAPTERS[0].title, "말의 순서부터");
  for (const chapter of ENGLISH_CHAPTERS) {
    assert.equal(chapter.words.length, 6);
    assert.ok(chapter.story.length > 80);
    assert.ok(chapter.concept.length > 60);
    assert.ok(chapter.answer.length > 0);
    const extra = ENGLISH_EXPLANATIONS[chapter.id - 1];
    assert.equal(extra.id, chapter.id);
    assert.ok(extra.walkthrough.length > 100, `English ${chapter.id} walkthrough`);
    assert.ok(extra.anotherLook.length > 100, `English ${chapter.id} another look`);
  }
  assert.deepEqual(reviewWords(2), ENGLISH_CHAPTERS[0].words.slice(0, 2));
  const farReview = reviewWords(15).map(([english]) => english);
  for (const [english] of ENGLISH_CHAPTERS[0].words) assert.ok(farReview.includes(english));
});
