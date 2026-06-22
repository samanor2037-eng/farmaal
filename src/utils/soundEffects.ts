class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicIsPlaying: boolean = false;
  private audioEl: HTMLAudioElement | null = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopScaryMusic();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playClick() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.04);

      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  }

  public playShoot() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // 1. Rifle Thump / Punch (Low-frequency triangle sweep)
      const thumpOsc = this.ctx.createOscillator();
      const thumpGain = this.ctx.createGain();
      thumpOsc.type = 'triangle';
      thumpOsc.frequency.setValueAtTime(220, t);
      thumpOsc.frequency.linearRampToValueAtTime(50, t + 0.12);
      thumpGain.gain.setValueAtTime(0.35, t);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      thumpOsc.connect(thumpGain);
      thumpGain.connect(this.ctx.destination);
      thumpOsc.start(t);
      thumpOsc.stop(t + 0.14);

      // 2. Plasma Laser Sizzle (High-frequency sawtooth sweep)
      const laserOsc = this.ctx.createOscillator();
      const laserGain = this.ctx.createGain();
      laserOsc.type = 'sawtooth';
      laserOsc.frequency.setValueAtTime(1500, t);
      laserOsc.frequency.exponentialRampToValueAtTime(90, t + 0.18);
      laserGain.gain.setValueAtTime(0.20, t);
      laserGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      // Lowpass filter to smooth the laser crunch
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.frequency.exponentialRampToValueAtTime(400, t + 0.18);

      laserOsc.connect(filter);
      filter.connect(laserGain);
      laserGain.connect(this.ctx.destination);
      laserOsc.start(t);
      laserOsc.stop(t + 0.20);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  }

  public playError() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.linearRampToValueAtTime(90, t + 0.15);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.16);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  }

  public playSuccess() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, index) => {
        const noteTime = t + index * 0.08;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0, noteTime);
        gain.gain.linearRampToValueAtTime(0.08, noteTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.25);
      });
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  }

  public playMisfire() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(130, t);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(133, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.16);
      osc2.stop(t + 0.16);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  }

  public playExplosion() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Low frequency sine wave thump
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(20, t + 0.35);
      oscGain.gain.setValueAtTime(0.5, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.42);

      // Lowpassed noise for hiss
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + 0.35);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.42);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  }

  public startScaryMusic() {
    if (this.isMuted) return;
    if (this.musicIsPlaying) return;
    try {
      this.musicIsPlaying = true;
      if (!this.audioEl) {
        this.audioEl = new Audio('/universfield-horror-background-atmosphere-156462.mp3');
        this.audioEl.loop = true;
        this.audioEl.preload = 'auto'; // Preload the audio file to start playing instantly
      }
      this.audioEl.volume = 0.35;
      this.audioEl.play().catch(err => {
        console.warn("Audio element play error:", err);
      });
    } catch (e) {
      console.warn("Error starting scary music:", e);
    }
  }

  public stopScaryMusic() {
    this.musicIsPlaying = false;
    if (this.audioEl) {
      try {
        this.audioEl.pause();
      } catch (e) {}
    }
  }
}

export const sounds = new SoundEffects();
export default sounds;
