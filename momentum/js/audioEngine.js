/**
 * MOMENTUM WEBAUDIO SYNTHESIZER
 * Real-time synthesis of:
 * - Pure Brown Noise (low-pass filtered white noise)
 * - Binaural Beats (40Hz Gamma Focus, 10Hz Alpha Calm)
 * - Dopamine Victory Chimes (synthesized bell chords)
 * Zero external MP3 downloads required. Works 100% offline.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.currentSoundNode = null;
    this.currentType = null;
  }

  _initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play Dopamine Chime Chord when a user completes a task
  playDopamineChime() {
    this._initContext();
    const now = this.ctx.currentTime;
    // Major 7th chord: C5, E5, G5, B5, C6
    const freqs = [523.25, 659.25, 783.99, 987.77, 1046.50];

    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.9);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 1.0);
    });
  }

  // Play Brown Noise
  playBrownNoise() {
    this._initContext();
    this.stop();

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to warm deep rumble
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start();
    this.currentSoundNode = { stop: () => whiteNoise.stop() };
    this.currentType = 'brown';
  }

  // Play Pink Noise (ambient soft rain 1/f spectrum)
  playPinkNoise() {
    this._initContext();
    this.stop();

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12;
      b6 = white * 0.115926;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    source.connect(gain);
    gain.connect(this.ctx.destination);

    source.start();
    this.currentSoundNode = { stop: () => source.stop() };
    this.currentType = 'pink';
  }

  // Play Green Noise (gentle ambient nature frequency, 500Hz bandpass)
  playGreenNoise() {
    this._initContext();
    this.stop();

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.25;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.9, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    source.start();
    this.currentSoundNode = { stop: () => source.stop() };
    this.currentType = 'green';
  }

  // Play Binaural Beats (Gamma 40Hz or Alpha 10Hz)
  playBinauralBeat(beatFreq = 40) {
    this._initContext();
    this.stop();

    const baseFreq = 220; // 220 Hz carrier tone
    const leftFreq = baseFreq;
    const rightFreq = baseFreq + beatFreq;

    const merger = this.ctx.createChannelMerger(2);

    // Left channel oscillator
    const oscL = this.ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(leftFreq, this.ctx.currentTime);

    // Right channel oscillator
    const oscR = this.ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(rightFreq, this.ctx.currentTime);

    const gainL = this.ctx.createGain();
    const gainR = this.ctx.createGain();
    gainL.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gainR.gain.setValueAtTime(0.08, this.ctx.currentTime);

    oscL.connect(gainL);
    oscR.connect(gainR);

    gainL.connect(merger, 0, 0); // Output to Left ear
    gainR.connect(merger, 0, 1); // Output to Right ear

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    merger.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    oscL.start();
    oscR.start();

    this.currentSoundNode = {
      stop: () => {
        oscL.stop();
        oscR.stop();
      }
    };
    this.currentType = (beatFreq === 40 ? 'gamma' : 'alpha');
  }

  toggle(type) {
    if (this.currentType === type) {
      this.stop();
      return false; // Turned off
    }

    if (type === 'brown') this.playBrownNoise();
    else if (type === 'pink') this.playPinkNoise();
    else if (type === 'green') this.playGreenNoise();
    else if (type === 'gamma') this.playBinauralBeat(40);
    else if (type === 'alpha') this.playBinauralBeat(10);

    return true; // Playing
  }

  stop() {
    if (this.currentSoundNode) {
      try {
        this.currentSoundNode.stop();
      } catch (e) {}
      this.currentSoundNode = null;
    }
    this.currentType = null;
  }
}

window.audioEngine = new AudioEngine();

// Mobile Lifecycle & Power Management: Suspend audio when app is in background
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.audioEngine?.ctx && window.audioEngine.ctx.state === 'running') {
      window.audioEngine.ctx.suspend().catch(() => {});
    } else if (!document.hidden && window.audioEngine?.ctx && window.audioEngine.ctx.state === 'suspended' && window.audioEngine.currentSoundNode) {
      window.audioEngine.ctx.resume().catch(() => {});
    }
  });
}

