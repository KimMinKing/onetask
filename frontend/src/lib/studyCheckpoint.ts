import { readUserStorage, removeUserStorage, writeUserStorage } from "./auth";

export const STORY_COURSES = {
  "english-basics": { path: "/english-basics", label: "영어 완전 기초", total: 25 },
  rust: { path: "/rust", label: "Rust", total: 54 },
  cpp: { path: "/cpp", label: "C++와 TCP/UDP", total: 26 },
  sqld: { path: "/sqld", label: "SQLD", total: 100 },
  network: { path: "/network", label: "네트워크", total: 120 },
} as const;

export type StoryCourse = keyof typeof STORY_COURSES;
export type StudyPhase = "story" | "concept" | "practice";

export interface StudyCheckpoint<D = unknown> {
  subject: StoryCourse;
  step: number;
  title: string;
  phase: StudyPhase;
  paused: boolean;
  draft: D;
  updatedAt: number;
}

const storageKey = (subject: StoryCourse) => `story_checkpoint_v1_${subject}`;
const phases: StudyPhase[] = ["story", "concept", "practice"];

function validDraft(subject: StoryCourse, value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const draft = value as Record<string, unknown>;
  if (subject === "rust") return typeof draft.answer === "string" && typeof draft.revealed === "boolean";
  if (subject === "english-basics") return typeof draft.practicing === "boolean"
    && Array.isArray(draft.queue) && draft.queue.length <= 1000
    && draft.queue.every(index => Number.isInteger(index) && index >= 0 && index < 100)
    && Number.isInteger(draft.cursor) && (draft.cursor as number) >= 0 && (draft.cursor as number) <= draft.queue.length
    && typeof draft.typed === "string" && typeof draft.feedback === "string"
    && typeof draft.sentence === "string" && typeof draft.sentenceChecked === "boolean";
  return draft.choice === null || (Number.isInteger(draft.choice) && (draft.choice as number) >= 0 && (draft.choice as number) < 4);
}

export function readStudyCheckpoint<D = unknown>(subject: StoryCourse): StudyCheckpoint<D> | null {
  try {
    const raw = readUserStorage(storageKey(subject));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const item = value as Partial<StudyCheckpoint<D>>;
    if (item.subject !== subject || !Number.isInteger(item.step) || !item.step || item.step < 1 || item.step > STORY_COURSES[subject].total) return null;
    if (typeof item.title !== "string" || item.title.length > 120 || !phases.includes(item.phase as StudyPhase)) return null;
    if (typeof item.paused !== "boolean" || typeof item.updatedAt !== "number" || !Number.isFinite(item.updatedAt)) return null;
    if (!validDraft(subject, item.draft)) return null;
    return item as StudyCheckpoint<D>;
  } catch {
    return null;
  }
}

export function saveStudyCheckpoint<D>(checkpoint: Omit<StudyCheckpoint<D>, "updatedAt">): void {
  try {
    writeUserStorage(storageKey(checkpoint.subject), JSON.stringify({ ...checkpoint, updatedAt: Date.now() }));
  } catch {
    // Storage may be disabled or full; learning remains usable in memory.
  }
}

export function clearStudyCheckpoint(subject: StoryCourse): void {
  try { removeUserStorage(storageKey(subject)); } catch { /* Storage is optional. */ }
}

export function latestStudyCheckpoint(): StudyCheckpoint | null {
  const checkpoints = (Object.keys(STORY_COURSES) as StoryCourse[])
    .map(subject => readStudyCheckpoint(subject))
    .filter((item): item is StudyCheckpoint => item !== null);
  return checkpoints.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}
