import type { StoryCourse } from "@/lib/studyCheckpoint";
import StudyText from "./StudyText";

export default function StudyProse({ text, className = "", subject }: { text: string; className?: string; subject?: StoryCourse }) {
  return <p className={className}>{text.split(/(`[^`]+`)/g).map((part, index) =>
    part.startsWith("`") && part.endsWith("`")
      ? <code key={index} className="rounded bg-black/30 px-1 py-0.5 font-mono text-[0.9em] text-stone-100">{part.slice(1, -1)}</code>
      : subject ? <StudyText key={index} text={part} subject={subject}/> : part
  )}</p>;
}
