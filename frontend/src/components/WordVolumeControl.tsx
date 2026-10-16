"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getWordVolume, setWordVolume } from "@/lib/wordAudio";

export function WordVolumeControl({ uiLanguage }: { uiLanguage: "ko" | "zh" }) {
  const [volume, setVolume] = useState(1);
  const [open, setOpen] = useState(false);
  const previousVolume = useRef(1);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const zh = uiLanguage === "zh";
  const label = zh ? "发音音量" : "발음 볼륨";

  useEffect(() => {
    const saved = getWordVolume();
    setVolume(saved);
    if (saved > 0) previousVolume.current = saved;
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const update = (next: number) => {
    if (next > 0) previousVolume.current = next;
    setVolume(next);
    setWordVolume(next);
  };

  return (
    <div ref={root} className="absolute right-4 top-2 z-40" onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={trigger} type="button" aria-label={label} title={label}
        aria-expanded={open} aria-controls={open ? panelId : undefined}
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-dark-200 px-3 text-stone-200 shadow-lg transition hover:bg-dark-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-jeok-400">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          {volume === 0 ? <path d="m16 9 5 6m0-6-5 6" /> : <><path d="M15 8a6 6 0 0 1 0 8" />{volume > .5 && <path d="M18 5a10 10 0 0 1 0 14" />}</>}
        </svg>
        <span className="text-xs tabular-nums">{Math.round(volume * 100)}%</span>
      </button>
      {open && (
        <div id={panelId} className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-dark-200 p-4 text-stone-200 shadow-xl">
          <div className="mb-3 flex items-center justify-between text-xs">
            <label htmlFor={`${panelId}-range`}>{label}</label>
            <span className="tabular-nums">{Math.round(volume * 100)}%</span>
          </div>
          <input id={`${panelId}-range`} type="range" min="0" max="100" step="1"
            value={Math.round(volume * 100)} aria-valuetext={`${Math.round(volume * 100)}%`}
            onChange={(event) => update(Number(event.target.value) / 100)}
            className="h-6 w-full cursor-pointer accent-jeok-500" />
          <button type="button" onClick={() => update(volume === 0 ? previousVolume.current : 0)}
            className="mt-2 min-h-9 w-full rounded-lg bg-dark-300 text-xs hover:bg-dark-100">
            {volume === 0 ? (zh ? "取消静音" : "음소거 해제") : (zh ? "静音" : "음소거")}
          </button>
        </div>
      )}
    </div>
  );
}
