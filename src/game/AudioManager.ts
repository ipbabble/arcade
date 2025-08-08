export class AudioManager {
  private ctx: AudioContext | null = null;
  private thrustOsc: OscillatorNode | null = null;
  private thrustGain: GainNode | null = null;

  private ufoOscA: OscillatorNode | null = null;
  private ufoOscB: OscillatorNode | null = null;
  private ufoGain: GainNode | null = null;
  private ufoLfo: OscillatorNode | null = null;
  private ufoLfoGain: GainNode | null = null;
  private ufoBeepTimer: number | null = null;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Try resume (will succeed only on user gesture)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public resume(): void {
    const ctx = this.ensureCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  public playShoot(): void {
    const ctx = this.ensureCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Higher-pitched pew with quick drop
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.07);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public setThrustActive(active: boolean): void {
    const ctx = this.ensureCtx();
    if (active) {
      if (this.thrustOsc) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Softer, lower background hum
      osc.type = 'sine';
      osc.frequency.value = 55;
      gain.gain.value = 0.0;

      osc.connect(gain).connect(ctx.destination);
      osc.start();

      // gentle fade in
      gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.2);

      this.thrustOsc = osc;
      this.thrustGain = gain;
    } else if (this.thrustOsc && this.thrustGain) {
      const ctxNow = ctx.currentTime;
      this.thrustGain.gain.cancelScheduledValues(ctxNow);
      // gentle fade out
      this.thrustGain.gain.linearRampToValueAtTime(0, ctxNow + 0.2);
      const toStop = this.thrustOsc;
      setTimeout(() => {
        try { toStop.stop(); } catch {}
      }, 220);
      this.thrustOsc = null;
      this.thrustGain = null;
    }
  }

  public startUfo(): void {
    const ctx = this.ensureCtx();
    if (this.ufoGain) return;

    const gain = ctx.createGain();
    gain.gain.value = 0.0; // start silent; beep pattern will toggle
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    oscA.type = 'square';
    oscB.type = 'square';
    oscA.frequency.value = 380;
    oscB.frequency.value = 420;

    lfo.type = 'sine';
    lfo.frequency.value = 3.0; // warble rate
    lfoGain.gain.value = 60; // warble depth

    lfo.connect(lfoGain);
    lfoGain.connect(oscA.frequency);
    lfoGain.connect(oscB.frequency);

    oscA.connect(gain);
    oscB.connect(gain);
    gain.connect(ctx.destination);

    oscA.start();
    oscB.start();
    lfo.start();

    this.ufoGain = gain;
    this.ufoOscA = oscA;
    this.ufoOscB = oscB;
    this.ufoLfo = lfo;
    this.ufoLfoGain = lfoGain;

    // More pronounced beeping pattern
    const loud = 0.16;
    const quiet = 0.0;
    let on = false;
    this.ufoBeepTimer = window.setInterval(() => {
      if (!this.ufoGain) return;
      const now = ctx.currentTime;
      on = !on;
      this.ufoGain.gain.cancelScheduledValues(now);
      this.ufoGain.gain.setValueAtTime(this.ufoGain.gain.value, now);
      this.ufoGain.gain.linearRampToValueAtTime(on ? loud : quiet, now + 0.03);
    }, 180);
  }

  public stopUfo(): void {
    if (!this.ctx || !this.ufoGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    this.ufoGain.gain.linearRampToValueAtTime(0, now + 0.15);
    const oscA = this.ufoOscA;
    const oscB = this.ufoOscB;
    const lfo = this.ufoLfo;
    if (this.ufoBeepTimer !== null) {
      clearInterval(this.ufoBeepTimer);
      this.ufoBeepTimer = null;
    }
    setTimeout(() => {
      try { oscA?.stop(); } catch {}
      try { oscB?.stop(); } catch {}
      try { lfo?.stop(); } catch {}
    }, 180);
    this.ufoGain = null;
    this.ufoOscA = null;
    this.ufoOscB = null;
    this.ufoLfo = null;
    this.ufoLfoGain = null;
  }

  public playAsteroidBreak(size: number): void {
    const ctx = this.ensureCtx();
    const dur = 0.3; // slower/longer
    const now = ctx.currentTime;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const startF = size > 40 ? 260 : 520;
    filter.frequency.setValueAtTime(startF, now);
    filter.frequency.linearRampToValueAtTime(startF * 0.7, now + dur);
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(size > 40 ? 0.4 : 0.28, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(now);
    src.stop(now + dur + 0.01);
  }

  public playExplosion(): void {
    const ctx = this.ensureCtx();
    const now = ctx.currentTime;
    const dur = 0.45;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.8;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1200, now);
    lowpass.frequency.exponentialRampToValueAtTime(220, now + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(lowpass).connect(gain).connect(ctx.destination);
    src.start(now);
    src.stop(now + dur + 0.02);
  }
}
