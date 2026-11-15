import { STORY_COURSES, type StoryCourse } from "../../lib/studyCheckpoint";

export interface ProgressRow {
  subject: string;
  unit_id: string;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
}

export interface CourseSummary { completed: number; next: number | null }

function validCourseUnit(row: ProgressRow): row is ProgressRow & { subject: StoryCourse } {
  if (!row.completed || !Object.hasOwn(STORY_COURSES, row.subject)) return false;
  const subject = row.subject as StoryCourse;
  const id = Number(row.unit_id);
  return Number.isInteger(id) && String(id) === row.unit_id && id >= 1 && id <= STORY_COURSES[subject].total;
}

export function summarizeCourseProgress(rows: ProgressRow[]): Record<StoryCourse, CourseSummary> {
  const units = Object.fromEntries(Object.keys(STORY_COURSES).map(subject => [subject, new Set<number>()])) as Record<StoryCourse, Set<number>>;
  for (const row of rows) {
    if (!validCourseUnit(row)) continue;
    units[row.subject].add(Number(row.unit_id));
  }
  return Object.fromEntries((Object.keys(STORY_COURSES) as StoryCourse[]).map(subject => {
    const complete = units[subject];
    const next = Array.from({ length: STORY_COURSES[subject].total }, (_, index) => index + 1).find(id => !complete.has(id)) ?? null;
    return [subject, { completed: complete.size, next }];
  })) as Record<StoryCourse, CourseSummary>;
}

export function latestServerContinuation(rows: ProgressRow[], summaries: Record<StoryCourse, CourseSummary>): { subject: StoryCourse; step: number; updatedAt: number } | null {
  const timestamp = (row: ProgressRow) => Date.parse(row.completed_at ?? row.updated_at);
  const candidate = rows.filter(row => validCourseUnit(row) && Number.isFinite(timestamp(row)))
    .sort((a, b) => timestamp(b) - timestamp(a))
    .find(row => summaries[row.subject as StoryCourse].next !== null);
  if (!candidate) return null;
  const subject = candidate.subject as StoryCourse;
  return { subject, step: summaries[subject].next!, updatedAt: timestamp(candidate) };
}
