/**
   * Browser Feedback Utilities using Web Audio API and Haptic Vibration API
   */

let sharedAudioCtx: AudioContext | null = null;

/**
 * Inisialisasi dan resume AudioContext pada user gesture (sangat penting untuk iOS Safari)
 */
export function initAudioContext() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass && !sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume();
    }
  } catch (err) {
    console.warn("Gagal inisialisasi AudioContext:", err);
  }
}

/**
 * Memutar audio bip frekuensi tinggi (1000Hz, 150ms) dan getar 150ms
 */
export function playSuccessFeedback() {
  if (typeof window === "undefined") return;

  // 1. Bip Audio (Web Audio API)
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    let ctx = sharedAudioCtx;
    if (!ctx && AudioContextClass) {
      ctx = new AudioContextClass();
    }
    
    if (ctx) {
      // Pastikan state resumed jika suspended (iOS Safari)
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(1000, ctx.currentTime); // 1000Hz
      gain.gain.setValueAtTime(0.1, ctx.currentTime); // Atur volume agar tidak terlalu keras

      osc.start();
      osc.stop(ctx.currentTime + 0.150); // Mati setelah 150ms
    }
  } catch (err) {
    console.error("Gagal memutar audio sukses feedback:", err);
  }

  // 2. Getar HP (Haptic Vibration API)
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(150); // Getar selama 150ms
    } catch (err) {
      console.warn("Vibrate API dihalangi:", err);
    }
  }
}

/**
 * Memutar audio bip frekuensi rendah (200Hz, 300ms) dan getar berdenyut ganda
 */
export function playErrorFeedback() {
  if (typeof window === "undefined") return;

  // 1. Bip Audio (Web Audio API)
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    let ctx = sharedAudioCtx;
    if (!ctx && AudioContextClass) {
      ctx = new AudioContextClass();
    }

    if (ctx) {
      // Pastikan state resumed jika suspended (iOS Safari)
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      // Bip frekuensi rendah 200Hz
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);

      osc.start();
      osc.stop(ctx.currentTime + 0.300); // 300ms
    }
  } catch (err) {
    console.error("Gagal memutar audio error feedback:", err);
  }

  // 2. Getar HP (Getaran Berdenyut Ganda)
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([100, 50, 100]); // Getar 100ms, jeda 50ms, getar 100ms
    } catch (err) {
      console.warn("Vibrate API dihalangi:", err);
    }
  }
}
