import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
  fs.readFileSync(new URL("../src/lib/wordAudio.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

function setup(saved = null, storageUnavailable = false) {
  const storage = { value: saved };
  const spoken = [];
  class Utterance {
    constructor(text) { this.text = text; this.listeners = {}; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    emit(name) { this.listeners[name]?.(); }
  }
  const synthesis = {
    speaking: false,
    cancel() { this.speaking = false; },
    speak(utterance) { spoken.push(utterance); this.speaking = true; },
  };
  const context = {
    exports: {}, SpeechSynthesisUtterance: Utterance,
    window: { speechSynthesis: synthesis },
    localStorage: {
      getItem() { if (storageUnavailable) throw Error("Unavailable"); return storage.value; },
      setItem(key, value) { assert.equal(key, "onetask-word-volume"); if (storageUnavailable) throw Error("Unavailable"); storage.value = value; },
    },
  };
  vm.runInNewContext(source, context);
  return { api: context.exports, storage, spoken, synthesis, Utterance, context };
}

function audio(play = () => Promise.resolve()) {
  return { volume: 1, paused: false, pause() { this.paused = true; }, play };
}

test("restores persisted volume in a new session and handles invalid storage", () => {
  const { api, storage } = setup();
  assert.equal(api.getWordVolume(), 1);
  api.setWordVolume(.23);
  assert.equal(setup(storage.value).api.getWordVolume(), .23);
  assert.equal(setup("garbage").api.getWordVolume(), 1);
  assert.equal(setup("-2").api.getWordVolume(), 0);
  assert.equal(setup("2").api.getWordVolume(), 1);
  const unavailable = setup(null, true).api;
  assert.equal(unavailable.getWordVolume(), 1);
  unavailable.setWordVolume(.4);
  assert.equal(unavailable.getWordVolume(), .4);
});

test("updates playing audio, mutes, and rejects invalid volume", () => {
  const { api } = setup("0.35");
  const current = audio();
  api.playWordAudio(current);
  assert.equal(current.volume, .35);
  api.setWordVolume(.1);
  assert.equal(current.volume, .1);
  api.setWordVolume(0);
  assert.equal(current.volume, 0);
  api.setWordVolume(NaN);
  assert.equal(api.getWordVolume(), 0);
});

test("speech volume changes preserve language, speed, pitch, and voice", () => {
  const { api, spoken, Utterance } = setup("0.7");
  const utterance = new Utterance("hello");
  Object.assign(utterance, { lang: "en-US", rate: .9, pitch: 1.2, voice: { name: "Test" } });
  api.playWordSpeech(utterance);
  api.setWordVolume(.3);
  const current = spoken.at(-1);
  assert.equal(current.volume, .3);
  for (const key of ["text", "lang", "rate", "pitch", "voice"]) assert.equal(current[key], utterance[key]);
  // Browsers may deliver the old cancellation event after the next utterance starts.
  utterance.emit("error");
  api.setWordVolume(.2);
  assert.equal(spoken.at(-1).volume, .2);
});

test("mute stops speech and prevents subsequent auto pronunciation", () => {
  const { api, spoken, synthesis, Utterance } = setup();
  api.playWordSpeech(new Utterance("one"));
  api.setWordVolume(0);
  assert.equal(synthesis.speaking, false);
  api.playWordSpeech(new Utterance("two"));
  assert.equal(spoken.length, 1);
  api.setWordVolume(.5);
  api.playWordSpeech(new Utterance("three"));
  assert.equal(spoken.at(-1).volume, .5);
});

test("stopping playback prevents volume changes from reviving an old card", () => {
  const { api, spoken, synthesis, Utterance } = setup();
  api.playWordSpeech(new Utterance("old"));
  api.stopWordPlayback();
  synthesis.speaking = true; // Unrelated speech is now playing elsewhere.
  api.setWordVolume(.5);
  assert.equal(spoken.length, 1);
});

test("failed audio falls back only while its card is still active", async () => {
  const { api } = setup();
  let fallbacks = 0;
  api.playWordAudio(audio(() => Promise.reject(Error("Missing file"))), () => fallbacks++);
  await Promise.resolve();
  assert.equal(fallbacks, 1);
  let reject;
  const pending = audio(() => new Promise((resolve, rejectPlayback) => { void resolve; reject = rejectPlayback; }));
  api.playWordAudio(pending, () => fallbacks++);
  api.playWordAudio(audio());
  reject(Error("Old card cancelled"));
  await Promise.resolve();
  assert.equal(fallbacks, 1);
  assert.equal(pending.paused, true);
});

test("playback cleanup is safe without browser speech support", () => {
  const { api, context } = setup();
  delete context.window.speechSynthesis;
  api.stopWordPlayback();
  api.setWordVolume(.4);
  api.playWordAudio(audio());
});
