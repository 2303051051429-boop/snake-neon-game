// ---------------------------------------------------------------------------
// AudioManager — tiny synthesized SFX engine (WebAudio, no assets required).
// Respects browser autoplay policy: the context is unlocked on first gesture.
// ---------------------------------------------------------------------------

interface ToneOpts {
  freq: number;
  freqEnd?: number;
  type?: OscillatorType;
  dur: number;
  vol?: number;
  delay?: number;
  attack?: number;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private padNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private padLfo: OscillatorNode | null = null;
  private muted = false;
  private musicOn = false;

  /** Create/resume the AudioContext. Must be called from a user gesture. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.85;
        this.master.connect(this.ctx.destination);
        if (this.musicOn) this.startPad();
      }
      if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      /* audio unavailable — game continues silently */
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.03);
    }
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    if (!this.ctx) return;
    if (on) this.startPad();
    else this.stopPad();
  }

  private tone(o: ToneOpts): void {
    if (!this.ctx || !this.master || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + (o.delay ?? 0);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const vol = o.vol ?? 0.2;
      const attack = o.attack ?? 0.004;
      osc.type = o.type ?? "square";
      osc.frequency.setValueAtTime(o.freq, t0);
      if (o.freqEnd !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t0 + o.dur);
      }
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + o.dur + 0.03);
    } catch {
      /* ignore */
    }
  }

  private noise(dur: number, vol: number, delay = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(2400, t0);
      f.frequency.exponentialRampToValueAtTime(240, t0 + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(t0);
    } catch {
      /* ignore */
    }
  }

  click(): void {
    this.tone({ freq: 980, freqEnd: 640, type: "triangle", dur: 0.06, vol: 0.12 });
  }

  eat(combo: number): void {
    const base = 340 + Math.min(combo, 8) * 42;
    this.tone({ freq: base, freqEnd: base * 1.7, type: "square", dur: 0.11, vol: 0.16 });
    this.tone({ freq: base * 2, type: "sine", dur: 0.07, vol: 0.08, delay: 0.02 });
  }

  bonus(kind: "gold" | "purple" | "energy"): void {
    const root = kind === "gold" ? 620 : kind === "purple" ? 520 : 700;
    this.tone({ freq: root, type: "square", dur: 0.09, vol: 0.15 });
    this.tone({ freq: root * 1.25, type: "square", dur: 0.09, vol: 0.15, delay: 0.07 });
    this.tone({ freq: root * 1.5, type: "triangle", dur: 0.16, vol: 0.18, delay: 0.14 });
  }

  powerup(): void {
    this.tone({ freq: 300, freqEnd: 980, type: "sawtooth", dur: 0.2, vol: 0.13 });
    this.tone({ freq: 1180, type: "triangle", dur: 0.14, vol: 0.12, delay: 0.16 });
  }

  shieldPop(): void {
    this.tone({ freq: 700, freqEnd: 220, type: "sawtooth", dur: 0.22, vol: 0.2 });
    this.noise(0.14, 0.12);
  }

  levelUp(): void {
    this.tone({ freq: 523, type: "triangle", dur: 0.1, vol: 0.16 });
    this.tone({ freq: 784, type: "triangle", dur: 0.12, vol: 0.16, delay: 0.09 });
    this.tone({ freq: 1046, type: "triangle", dur: 0.2, vol: 0.14, delay: 0.18 });
  }

  countdown(final: boolean): void {
    if (final) {
      this.tone({ freq: 880, freqEnd: 1320, type: "square", dur: 0.22, vol: 0.2 });
    } else {
      this.tone({ freq: 520, type: "square", dur: 0.09, vol: 0.12 });
    }
  }

  death(): void {
    this.tone({ freq: 300, freqEnd: 46, type: "sawtooth", dur: 0.5, vol: 0.24 });
    this.tone({ freq: 180, freqEnd: 40, type: "square", dur: 0.42, vol: 0.14, delay: 0.05 });
    this.noise(0.38, 0.2);
  }

  fanfare(): void {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((f, i) =>
      this.tone({ freq: f, type: "triangle", dur: 0.22, vol: 0.15, delay: i * 0.085 }),
    );
  }

  /* -------- ambient pad (music, off by default) -------- */

  private startPad(): void {
    if (!this.ctx || !this.master || this.padNodes.length > 0) return;
    try {
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 420;
      filter.Q.value = 2;
      filter.connect(this.master);

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 0.09;
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      this.padLfo = lfo;

      [55, 55.6, 82.4, 110.8].forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        g.gain.value = 0.022;
        g.gain.setTargetAtTime(0.022, this.ctx.currentTime, 1.4);
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.02, this.ctx.currentTime, 2);
        osc.connect(g);
        g.connect(filter);
        osc.start();
        this.padNodes.push({ osc, gain: g });
      });
    } catch {
      /* ignore */
    }
  }

  private stopPad(): void {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      this.padNodes.forEach(({ osc, gain }) => {
        gain.gain.setTargetAtTime(0.0001, t, 0.25);
        osc.stop(t + 1);
      });
      this.padLfo?.stop(t + 1);
    } catch {
      /* ignore */
    }
    this.padNodes = [];
    this.padLfo = null;
  }

  destroy(): void {
    this.stopPad();
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
      this.master = null;
    }
  }
}
