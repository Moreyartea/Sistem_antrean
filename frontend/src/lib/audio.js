/**
 * Web Audio API synthesizer for queue notification chime and SpeechSynthesis (TTS)
 */

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
  }

  // Ensure AudioContext is initialized after user gesture
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Play a pleasant two-tone or three-tone Neo-Brutalist chime
   * Frequencies: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz)
   */
  async playChime() {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99]; // Triad chord ding
      const now = ctx.currentTime;

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.18);

        // Attack & Decay envelope
        gain.gain.setValueAtTime(0.001, now + index * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.3, now + index * 0.18 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.18 + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.18);
        osc.stop(now + index * 0.18 + 0.95);
      });

      // Wait for chime to conclude before voice begins
      await new Promise((resolve) => setTimeout(resolve, 850));
    } catch (err) {
      console.warn('Audio chime playback failed:', err);
    }
  }

  /**
   * Format display number for clear speech
   * e.g., "A001" -> "A kosong kosong satu"
   */
  formatNomorForSpeech(nomorDisplay) {
    if (!nomorDisplay) return '';
    const prefix = nomorDisplay.charAt(0);
    const digits = nomorDisplay.slice(1).split('');

    const digitWords = {
      '0': 'kosong',
      '1': 'satu',
      '2': 'dua',
      '3': 'tiga',
      '4': 'empat',
      '5': 'lima',
      '6': 'enam',
      '7': 'tujuh',
      '8': 'delapan',
      '9': 'sembilan',
    };

    const spokenDigits = digits.map((d) => digitWords[d] || d).join(' ');
    return `${prefix}, ${spokenDigits}`;
  }

  /**
   * Speak queue announcement using browser Web Speech API
   */
  async speakCall(nomorDisplay, namaLayanan) {
    if (this.isMuted) return;
    if (!('speechSynthesis' in window)) return;

    // Play pleasant chime first
    await this.playChime();

    window.speechSynthesis.cancel(); // Stop any pending utterances

    const spokenNomor = this.formatNomorForSpeech(nomorDisplay);
    const text = `Nomor antrean, ${spokenNomor}. Silakan menuju ${namaLayanan || 'loket pelayanan'}.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.92; // Slightly measured and clear for public announcement
    utterance.pitch = 1.05;

    // Try finding an Indonesian voice if available
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.includes('id') || v.lang.includes('ID'));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }
}

export const soundEngine = new SoundEngine();
