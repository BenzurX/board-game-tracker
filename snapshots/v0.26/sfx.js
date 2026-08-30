// Procedural sound effects via the Web Audio API. No sample files: every sound
// is a short synthesized tone or noise burst, so the app ships zero audio
// assets, still works offline, and each effect is tunable right here.
//
// Modelled on the Foothold micro-game's sfx module (same tone/noise/variant
// shape), trimmed to what a score tracker actually needs.
//
// Browsers block audio until a user gesture, so the AudioContext is created and
// resumed lazily on the first tap (see unlock()); before that, play() is a
// silent no-op rather than an error.

(function () {
  'use strict';

  // Ceiling on the master gain. The user-facing volume (0..1) scales this, so
  // 100% means MASTER_CEILING, not raw 1.0 - layered blips never clip.
  var MASTER_CEILING = 0.3;

  function Sfx() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 1;
  }

  Sfx.prototype.ensure = function () {
    if (this.ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.applyGain();
  };

  // Call from the first user gesture to satisfy the autoplay policy.
  Sfx.prototype.unlock = function () {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  };

  Sfx.prototype.setVolume = function (v) {
    this.volume = Math.max(0, Math.min(1, v));
    this.muted = this.volume === 0;
    this.applyGain();
  };

  Sfx.prototype.applyGain = function () {
    if (this.master) this.master.gain.value = MASTER_CEILING * this.volume;
  };

  // One shaped tone. freq to freqEnd sweeps the pitch; a quick attack and an
  // exponential decay make a plucky blip rather than a click.
  Sfx.prototype.tone = function (o) {
    if (!this.ctx || this.muted) return;
    var dur = o.dur === undefined ? 0.12 : o.dur;
    var type = o.type || 'sine';
    var gain = o.gain === undefined ? 0.6 : o.gain;
    var delay = o.delay || 0;
    var attack = o.attack === undefined ? 0.006 : o.attack;
    var t0 = this.ctx.currentTime + delay;
    var osc = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  };

  // Short noise burst through a lowpass - a tick or an impact texture.
  Sfx.prototype.noise = function (o) {
    if (!this.ctx || this.muted) return;
    o = o || {};
    var dur = o.dur === undefined ? 0.18 : o.dur;
    var gain = o.gain === undefined ? 0.4 : o.gain;
    var delay = o.delay || 0;
    var cutoff = o.cutoff === undefined ? 1000 : o.cutoff;
    var t0 = this.ctx.currentTime + delay;
    var frames = Math.floor(this.ctx.sampleRate * dur);
    var buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    var src = this.ctx.createBufferSource(); src.buffer = buf;
    var lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff;
    var g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t0);
    // A BufferSource with no stop() stays referenced by the graph after its
    // buffer runs out, so every play would leak one more node.
    src.stop(t0 + dur + 0.02);
  };

  // A struck or plucked string: near-instant attack, a second partial an octave
  // up dying twice as fast, and a breath of finger noise on the front. The
  // attack is what sells "plucked" - a slow one turns this into an organ.
  Sfx.prototype.pluck = function (o) {
    var len = o.dur === undefined ? 0.7 : o.dur;
    var level = o.gain === undefined ? 0.3 : o.gain;
    var delay = o.delay || 0;
    this.tone({ freq: o.freq, dur: len, type: o.type || 'triangle', gain: level, delay: delay, attack: 0.002 });
    this.tone({ freq: o.freq * 2, dur: len * 0.45, type: 'sine', gain: level * 0.3, delay: delay, attack: 0.002 });
    this.noise({ dur: 0.02, gain: level * 0.18, cutoff: 5200, delay: delay });
  };

  // Five slight pitch variants (two down, middle, two up) picked at random each
  // play. A button pressed twenty times in a row must not sound like the same
  // recording twenty times - identical repeats tire the ear fast.
  Sfx.prototype.variant = function (steps) {
    var STEP = 1; // semitones per step
    steps = steps || [-2, -1, 0, 1, 2];
    var s = steps[(Math.random() * steps.length) | 0];
    return Math.pow(2, (s * STEP) / 12);
  };

  Sfx.prototype.play = function (name, opts) {
    opts = opts || {};
    this.ensure();
    if (!this.ctx || this.muted) return;
    // One pitch multiplier is selected per play, then shared by every note in
    // the phrase. All five fixed variants were auditioned clean in isolation.
    var p = this.variant() * (opts.pitch || 1);
    switch (name) {
      // The universal button press: a soft, short, slightly rising pop with a
      // faint tick of air on the front. Quiet on purpose - it is heard on every
      // single tap, so it has to sit under the room rather than over it.
      case 'pop':
        this.tone({ freq: 420 * p, freqEnd: 640 * p, dur: 0.055, type: 'sine', gain: 0.42, attack: 0.004 });
        this.noise({ dur: 0.018, gain: 0.05, cutoff: 4200 * p });
        break;
      // Kalimba Sparkle, picked from stage/victory-fanfare-round-2.html and
      // replacing the Arcade Jackpot of the first round. A six-note thumb-piano
      // run leaving a high shimmer behind it: delicate rather than triumphant,
      // which is what survives being heard fifty times in one evening. Under
      // two seconds, so it clears before the confetti settles.
      case 'victory':
        // Pentatonic on purpose: no semitones, so the random pitch variant can
        // never land the run on a dissonance.
        [784, 880, 1047, 1319, 1568, 2093].forEach(function (f, i) {
          this.pluck({ freq: f * p, delay: i * 0.075, dur: 0.55 - i * 0.03, gain: 0.22, type: 'sine' });
          // The metallic edge of a tine: one quiet inharmonic partial, not a
          // whole bell, which would read as a chime instead.
          this.tone({ freq: f * p * 2.76, dur: 0.14, type: 'triangle', gain: 0.045, delay: i * 0.075, attack: 0.002 });
        }, this);
        // The run resolves onto one held note rather than stopping on its top,
        // so the phrase has somewhere to land.
        this.pluck({ freq: 1568 * p, delay: 0.52, dur: 1.3, gain: 0.24, type: 'sine' });
        [2093, 2637].forEach(function (f, i) {
          this.tone({ freq: f * p, dur: 1.3, type: 'sine', gain: 0.06, delay: 0.56 + i * 0.1, attack: 0.18 });
        }, this);
        this.tone({ freq: 392 * p, dur: 1.5, type: 'sine', gain: 0.1, delay: 0.52, attack: 0.12 });
        break;
      default:
        break;
    }
  };

  window.sfx = new Sfx();
}());
