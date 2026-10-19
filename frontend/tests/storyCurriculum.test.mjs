import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { ENGLISH_CHAPTERS, reviewWords } from "../src/app/english-basics/curriculum.ts";
import { RUST_CURRICULUM } from "../src/app/rust/curriculum.ts";
import { RUST_STORY } from "../src/app/rust/story.ts";
import { RUST_EXPLANATIONS } from "../src/app/rust/explanations.ts";
import { ENGLISH_EXPLANATIONS } from "../src/app/english-basics/explanations.ts";
import { PYTHON_BRIDGES } from "../src/app/rust/pythonBridges.ts";
import { SQLD_CHAPTERS, SQLD_STORY } from "../src/app/sqld/story.ts";
import { NETWORK_CHAPTERS, NETWORK_STORY } from "../src/app/network/story.ts";
import { SQLD_CURRICULUM } from "../src/app/sqld/curriculum.ts";
import { CPP_CURRICULUM } from "../src/app/cpp/curriculum.ts";
import { CPP_STORY, CPP_STORY_CHAPTERS } from "../src/app/cpp/story.ts";

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

test("SQLD and network stories cover every lesson without a repeated scene", () => {
  for (const [story, chapters, count] of [
    [SQLD_STORY, SQLD_CHAPTERS, 100],
    [NETWORK_STORY, NETWORK_CHAPTERS, 120],
  ]) {
    assert.equal(story.length, count);
    assert.equal(new Set(story.map(step => step.scene)).size, count);
    assert.equal(chapters[0].start, 1);
    assert.equal(chapters.at(-1).end, count);
    for (let id = 1; id <= count; id++) {
      const step = story[id - 1];
      assert.ok(step.scene.length >= 35, `lesson ${id} scene`);
      assert.ok(step.bridge.length >= 20, `lesson ${id} bridge`);
      assert.equal(chapters.filter(chapter => id >= chapter.start && id <= chapter.end).length, 1);
    }
  }
});

test("SQLD and network quizzes have four distinct choices with varied answers", async () => {
  registerHooks({ resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "./transportCurriculum" ? "./transportCurriculum.ts" : specifier, context);
  } });
  const { NETWORK_CURRICULUM } = await import("../src/app/network/curriculum.ts");
  for (const [lessons, expected] of [[SQLD_CURRICULUM, 100], [NETWORK_CURRICULUM, 120]]) {
    assert.equal(lessons.length, expected);
    assert.deepEqual(lessons.map(lesson => lesson.id), Array.from({ length: expected }, (_, index) => index + 1));
    for (const lesson of lessons) {
      assert.equal(lesson.quiz.options.length, 4, `lesson ${lesson.id} choices`);
      assert.equal(new Set(lesson.quiz.options).size, 4, `lesson ${lesson.id} unique choices`);
      assert.ok(lesson.quiz.answer >= 0 && lesson.quiz.answer < 4);
    }
    assert.ok(new Set(lessons.map(lesson => lesson.quiz.answer)).size === 4);
  }
});

test("C++ repair story covers the language-to-network course in order", () => {
  assert.equal(CPP_CURRICULUM.length, 26);
  assert.equal(CPP_STORY.length, CPP_CURRICULUM.length);
  assert.equal(new Set(CPP_STORY.map(scene => scene.story)).size, CPP_STORY.length);
  for (const lesson of CPP_CURRICULUM) {
    const scene = CPP_STORY[lesson.id - 1];
    assert.equal(scene.id, lesson.id);
    assert.ok(scene.story.length > 90, `C++ ${lesson.id} story`);
    assert.ok(scene.bridge.length > 45, `C++ ${lesson.id} bridge`);
    assert.equal(CPP_STORY_CHAPTERS.filter(chapter => lesson.id >= chapter.start && lesson.id <= chapter.end).length, 1);
  }
});

test("home has one learning entry and the hub retains every course route", () => {
  const home = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  const hub = readFileSync(new URL("../src/app/learn/page.tsx", import.meta.url), "utf8");
  const nav = home.slice(home.indexOf('className="home-nav-grid'));
  assert.deepEqual([...nav.matchAll(/<Link href="([^"]+)"/g)].map(match => match[1]), ["/calendar", "/learn"]);
  const routes = [...hub.matchAll(/href: "([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(routes).size, routes.length);
  assert.deepEqual(new Set(routes), new Set([
    "/daily-course", "/words", "/english-basics", "/english-phrases", "/hsk5",
    "/rust", "/cpp", "/python", "/math", "/sqld", "/network", "/search", "/stats",
  ]));
});

test("independent stories use distinct protagonists", () => {
  const english = readFileSync(new URL("../src/app/english-basics/curriculum.ts", import.meta.url), "utf8");
  assert.match(english, /하린/);
  assert.doesNotMatch(english, /서윤|연우|Rust 여정/);
  assert.match(RUST_STORY[0].story, /서윤/);
  assert.match(SQLD_STORY[0].scene, /지안/);
  assert.match(NETWORK_STORY[0].scene, /도윤/);
  assert.match(CPP_STORY[0].story, /민재/);
});
