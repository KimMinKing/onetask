import test from "node:test";
import assert from "node:assert/strict";
import { ENGLISH_CHAPTERS, reviewWords } from "../src/app/english-basics/curriculum.ts";
import { RUST_CURRICULUM } from "../src/app/rust/curriculum.ts";
import { RUST_STORY } from "../src/app/rust/story.ts";

test("each Rust lesson has a connected scene and a concrete bridge", () => {
  assert.equal(RUST_CURRICULUM.length, 54);
  assert.equal(RUST_STORY.length, RUST_CURRICULUM.length);
  for (const lesson of RUST_CURRICULUM) {
    const scene = RUST_STORY[lesson.id - 1];
    assert.equal(scene.id, lesson.id);
    assert.ok(scene.story.length > 80);
    assert.ok(scene.bridge.length > 30);
  }
});

test("English chapters begin at basics and revisit earlier vocabulary", () => {
  assert.equal(ENGLISH_CHAPTERS.length, 25);
  assert.equal(ENGLISH_CHAPTERS[0].title, "말의 순서부터");
  for (const chapter of ENGLISH_CHAPTERS) {
    assert.equal(chapter.words.length, 6);
    assert.ok(chapter.story.length > 80);
    assert.ok(chapter.concept.length > 60);
    assert.ok(chapter.answer.length > 0);
  }
  assert.deepEqual(reviewWords(2), ENGLISH_CHAPTERS[0].words.slice(0, 2));
  const farReview = reviewWords(15).map(([english]) => english);
  for (const [english] of ENGLISH_CHAPTERS[0].words) assert.ok(farReview.includes(english));
});
