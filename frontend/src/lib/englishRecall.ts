export function matchesEnglishSpelling(input: string, expected: string): boolean {
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  return normalize(input) !== "" && normalize(input) === normalize(expected);
}

export function advanceEnglishRecall<T>(queue: T[], index: number, mastered: boolean): {
  queue: T[];
  nextIndex: number;
  done: boolean;
} {
  const nextQueue = mastered ? queue : [...queue, queue[index]];
  const nextIndex = index + 1;
  return { queue: nextQueue, nextIndex, done: nextIndex >= nextQueue.length };
}
