/** @type {AudioContext | null} */
let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export async function unlockAudio() {
  const c = getCtx();
  if (c.state === "suspended") {
    await c.resume();
  }
}

/**
 * @param {() => void} [onEnd]
 */
export function playDing(onEnd) {
  const ac = getCtx();
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, t0);
  osc.connect(g);
  g.connect(ac.destination);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
  osc.start(t0);
  osc.stop(t0 + 0.19);

  // Subtle sparkle after the original ding.
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
}

/**
 * Short hollow / woody knock (low resonant tone).
 * @param {() => void} [onEnd]
 */
export function playWoodDonk(onEnd) {
  const ac = getCtx();
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const filter = ac.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(155, t0);
  osc.frequency.exponentialRampToValueAtTime(95, t0 + 0.12);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(220, t0);
  filter.Q.setValueAtTime(2.2, t0);
  osc.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
  osc.start(t0);
  osc.stop(t0 + 0.15);
  osc.onended = () => onEnd?.();
}

/**
 * Quick double tone (e.g. “try again”).
 * @param {() => void} [onEnd]
 */
export function playDoubleTone(onEnd) {
  const ac = getCtx();
  const t0 = ac.currentTime;

  function beep(start, freq) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    osc.connect(g);
    g.connect(ac.destination);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.12, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.07);
    osc.start(start);
    osc.stop(start + 0.075);
    return osc;
  }

  beep(t0, 620);
  const o2 = beep(t0 + 0.09, 520);
  o2.onended = () => onEnd?.();
}
