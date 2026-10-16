const STORAGE_KEY = "onetask-word-volume";
let volume: number | undefined;
let audio: HTMLAudioElement | null = null;
let speech: SpeechSynthesisUtterance | null = null;

export function getWordVolume(): number {
  if (volume !== undefined) return volume;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved === null ? 1 : Number(saved);
    volume = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 1;
  } catch { volume = 1; }
  return volume;
}

export function setWordVolume(next: number) {
  if (!Number.isFinite(next)) return;
  volume = Math.max(0, Math.min(1, next));
  try { localStorage.setItem(STORAGE_KEY, String(volume)); } catch { /* Session-only setting. */ }
  if (audio) audio.volume = volume;
  // Restart active browser speech because changing an utterance mid-playback is unreliable.
  if (speech && window.speechSynthesis.speaking) {
    const previous = speech;
    window.speechSynthesis.cancel();
    speech = null;
    if (volume > 0) {
      const nextSpeech = new SpeechSynthesisUtterance(previous.text);
      nextSpeech.lang = previous.lang;
      nextSpeech.rate = previous.rate;
      nextSpeech.pitch = previous.pitch;
      nextSpeech.voice = previous.voice;
      playWordSpeech(nextSpeech);
    }
  }
}

export function stopWordPlayback() {
  audio?.pause();
  audio = null;
  speech = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function playWordAudio(next: HTMLAudioElement, onError?: () => void) {
  stopWordPlayback();
  audio = next;
  next.volume = getWordVolume();
  void next.play().catch(() => {
    // A cancelled, older card must never speak over the current card.
    if (audio !== next) return;
    audio = null;
    onError?.();
  });
}

export function playWordSpeech(utterance: SpeechSynthesisUtterance) {
  stopWordPlayback();
  if (!("speechSynthesis" in window)) return;
  utterance.volume = getWordVolume();
  if (utterance.volume === 0) return;
  speech = utterance;
  const clear = () => { if (speech === utterance) speech = null; };
  utterance.addEventListener("end", clear, { once: true });
  utterance.addEventListener("error", clear, { once: true });
  window.speechSynthesis.speak(utterance);
}
