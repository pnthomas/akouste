/** @type {AudioContext | null} */
let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** Coarse pointer or mobile UA: Web Audio often sounds harsher; use softer mobile profile. */
export function useMobileSoundProfile() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const mobileUa =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const coarse =
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 0 &&
    typeof matchMedia !== "undefined" &&
    matchMedia("(pointer: coarse)").matches;
  return mobileUa || coarse;
}

export async function unlockAudio() {
  const c = getCtx();
  if (c.state === "suspended") {
    await c.resume();
  }
}

/**
 * Dev / manual tuning: `?soundtest=1` or `import.meta.env.DEV`.
 * Keys 1 = ding, 2 = donk, 3 = double (when not typing in an input).
 */
export function initSoundTestHarness() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const enabled = Boolean(import.meta.env.DEV) || params.has("soundtest");
  if (!enabled) return;

  window.addEventListener(
    "keydown",
    (e) => {
      const t = /** @type {HTMLElement | null} */ (e.target);
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      if (e.key === "1") {
        e.preventDefault();
        unlockAudio().then(() => playDing());
      } else if (e.key === "2") {
        e.preventDefault();
        unlockAudio().then(() => playWoodDonk());
      } else if (e.key === "3") {
        e.preventDefault();
        unlockAudio().then(() => playDoubleTone());
      }
    },
    { passive: false }
  );
}

/**
 * @param {() => void} [onEnd]
 */
export function playDing(onEnd) {
  const mobile = useMobileSoundProfile();
  const ac = getCtx();
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  const f0 = mobile ? 780 : 880;
  osc.frequency.setValueAtTime(f0, t0);
  osc.connect(g);
  g.connect(ac.destination);
  const peak = mobile ? 0.14 : 0.2;
  const dur = mobile ? 0.22 : 0.18;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + (mobile ? 0.014 : 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);

  if (!mobile) {
    const sparkle = ac.createOscillator();
    const sparkleGain = ac.createGain();
    sparkle.type = "sine";
    sparkle.frequency.setValueAtTime(1240, t0 + 0.11);
    sparkle.connect(sparkleGain);
    sparkleGain.connect(ac.destination);
    sparkleGain.gain.setValueAtTime(0.0001, t0 + 0.11);
    sparkleGain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.125);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.19);
    sparkle.start(t0 + 0.11);
    sparkle.stop(t0 + 0.195);
    sparkle.onended = () => onEnd?.();
  } else {
    osc.onended = () => onEnd?.();
  }
}

/**
 * Short hollow / woody knock (low resonant tone).
 * @param {() => void} [onEnd]
 */
export function playWoodDonk(onEnd) {
  const mobile = useMobileSoundProfile();
  const ac = getCtx();
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const filter = ac.createBiquadFilter();
  osc.type = "triangle";
  const f1 = mobile ? 135 : 155;
  const f2 = mobile ? 88 : 95;
  osc.frequency.setValueAtTime(f1, t0);
  osc.frequency.exponentialRampToValueAtTime(f2, t0 + 0.12);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(mobile ? 200 : 220, t0);
  filter.Q.setValueAtTime(mobile ? 1.6 : 2.2, t0);
  osc.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  const peak = mobile ? 0.16 : 0.22;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + (mobile ? 0.01 : 0.006));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + (mobile ? 0.16 : 0.14));
  osc.start(t0);
  osc.stop(t0 + 0.17);
  osc.onended = () => onEnd?.();
}

/**
 * Quick double tone (e.g. “try again”).
 * @param {() => void} [onEnd]
 */
export function playDoubleTone(onEnd) {
  const mobile = useMobileSoundProfile();
  const ac = getCtx();
  const t0 = ac.currentTime;

  function beep(start, freq) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    osc.connect(g);
    g.connect(ac.destination);
    const peak = mobile ? 0.08 : 0.12;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + (mobile ? 0.012 : 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, start + (mobile ? 0.055 : 0.07));
    osc.start(start);
    osc.stop(start + (mobile ? 0.06 : 0.075));
    return osc;
  }

  const gap = mobile ? 0.1 : 0.09;
  const f1 = mobile ? 560 : 620;
  const f2 = mobile ? 480 : 520;
  beep(t0, f1);
  const o2 = beep(t0 + gap, f2);
  o2.onended = () => onEnd?.();
}
