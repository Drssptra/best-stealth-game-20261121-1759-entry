// Tiny synthesized sound effects (WebAudio, no audio files).
// Everything is generated with oscillators, so the game stays offline
// and needs no network or asset downloads.
export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    ensure() {
      if (!this.ctx) {
        try {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch {
          this.ctx = null;
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone(freq, dur, type, vol, when = 0) {
      const ctx = this.ensure();
      if (!ctx || this.muted) return;
      const t0 = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },
    footstep(sneaking) {
      // A soft tap: a low sine blip, quieter while sneaking.
      this.tone(sneaking ? 70 : 95, 0.07, 'sine', sneaking ? 0.03 : 0.06);
    },
    pickup() {
      this.tone(660, 0.12, 'triangle', 0.12);
      this.tone(990, 0.18, 'triangle', 0.12, 0.09);
    },
    spotted() {
      // Two-note alarm sting.
      this.tone(220, 0.16, 'sawtooth', 0.1);
      this.tone(311, 0.24, 'sawtooth', 0.1, 0.14);
    },
    lost() {
      this.tone(330, 0.2, 'sine', 0.07);
      this.tone(220, 0.3, 'sine', 0.06, 0.12);
    },
    caught() {
      this.tone(180, 0.25, 'square', 0.09);
      this.tone(120, 0.45, 'square', 0.09, 0.18);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.11, i * 0.11));
    },
    click() {
      this.tone(440, 0.05, 'square', 0.04);
    },
  };
  return audio;
}
