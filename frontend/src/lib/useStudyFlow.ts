"use client";

import { useEffect, useRef, useState, type SetStateAction } from "react";
import { readStudyCheckpoint, saveStudyCheckpoint, type StoryCourse, type StudyPhase } from "./studyCheckpoint";

interface FlowState<D> { step: number; phase: StudyPhase; paused: boolean; draft: D }

export function useStudyFlow<D>(subject: StoryCourse, step: number, title: string, emptyDraft: D) {
  const [state, setState] = useState<FlowState<D> | null>(null);
  const emptyDraftRef = useRef(emptyDraft);
  const ready = step > 0 && state?.step === step;

  useEffect(() => {
    if (!step) { setState(null); return; }
    const saved = readStudyCheckpoint<D>(subject);
    const next: FlowState<D> = saved?.step === step
      ? { step, phase: saved.phase, paused: saved.paused, draft: saved.draft ?? emptyDraftRef.current }
      : { step, phase: "story", paused: false, draft: emptyDraftRef.current };
    setState(next);
  }, [subject, step]);

  useEffect(() => {
    if (!ready || !state) return;
    saveStudyCheckpoint({ subject, step, title, phase: state.phase, paused: state.paused, draft: state.draft });
  }, [ready, state, subject, step, title]);

  const changePhase = (phase: StudyPhase) => {
    setState(previous => previous?.step === step ? { ...previous, phase, paused: false } : previous);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const setPaused = (paused: boolean) => setState(previous => previous?.step === step ? { ...previous, paused } : previous);
  const setDraft = (draft: SetStateAction<D>) => setState(previous => previous?.step === step ? { ...previous, draft: typeof draft === "function" ? (draft as (value: D) => D)(previous.draft) : draft } : previous);

  return {
    ready,
    phase: ready ? state.phase : "story" as StudyPhase,
    paused: ready ? state.paused : false,
    draft: ready ? state.draft : emptyDraft,
    changePhase,
    setPaused,
    setDraft,
  };
}
