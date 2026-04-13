export function pickGreekVoice() {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith("el")) ||
    voices.find((v) => /greek/i.test(v.name)) ||
    null
  );
}

/**
 * @param {string} text
 * @param {() => void} onEnd
 */
export function speakGreek(text, onEnd) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "el-GR";
  const voice = pickGreekVoice();
  if (voice) u.voice = voice;
  u.rate = 0.92;
  u.onend = () => onEnd();
  u.onerror = () => onEnd();
  speechSynthesis.speak(u);
}

export function initVoicesListener() {
  speechSynthesis.addEventListener("voiceschanged", () => pickGreekVoice());
  pickGreekVoice();
}
