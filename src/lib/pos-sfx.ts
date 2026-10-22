/** Original sell-desk cues. No samples, no remote audio files. */

export const POS_SOUND_KEY = "pos:sound";

/** Measured against the reference desk: short sine beeps, not a sample pack. */
export const POS_CUES = {
  ok: { freq: 1180, ms: 100, gain: 0.05 },
  err: { freq: 320, ms: 240, gain: 0.05 },
} as const;

export type PosCue = keyof typeof POS_CUES;

export function soundEnabledFromStorage(value: string | null): boolean {
  return value !== "off";
}

let audioContext: AudioContext | null = null;
const soundListeners = new Set<() => void>();

export function subscribePosSound(listener: () => void) {
  soundListeners.add(listener);
  return () => {
    soundListeners.delete(listener);
  };
}

function emitPosSound() {
  for (const listener of soundListeners) listener();
}

function audioCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function context(): AudioContext | null {
  const Ctor = audioCtor();
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  return audioContext;
}

/** Call from a click, tap, or key handler so later cues are allowed to play. */
export function primePosAudio(): void {
  const ctx = context();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function posSoundServerSnapshot(): boolean {
  return true;
}

export function posSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return soundEnabledFromStorage(window.localStorage.getItem(POS_SOUND_KEY));
  } catch {
    return true;
  }
}

export function setPosSoundEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.removeItem(POS_SOUND_KEY);
    else window.localStorage.setItem(POS_SOUND_KEY, "off");
  } catch {
    // Private mode can block storage. The button state still updates.
  }
  emitPosSound();
}

/**
 * Play only after a user gesture has primed the context.
 * Browsers block AudioContext.resume() that is not tied to a gesture,
 * and this module never starts audio on load.
 */
export function playPosCue(cue: PosCue): void {
  if (!posSoundEnabled()) return;
  const ctx = context();
  if (!ctx) return;
  const recipe = POS_CUES[cue];
  const start = () => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const dur = recipe.ms / 1000;
    osc.type = "sine";
    osc.frequency.value = recipe.freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(recipe.gain, now + 0.008);
    const hold = Math.max(0.012, dur - 0.03);
    gain.gain.setValueAtTime(recipe.gain, now + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  };
  if (ctx.state === "suspended") {
    void ctx.resume().then(start).catch(() => undefined);
    return;
  }
  start();
}
