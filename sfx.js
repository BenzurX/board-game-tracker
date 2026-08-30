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

  // Five slight pitch variants (two down, middle, two up) picked at random each
  // play. A button pressed twenty times in a row must not sound like the same
  // recording twenty times - identical repeats tire the ear fast.
  Sfx.prototype.variant = function () {
    var STEP = 1; // semitones per step
    var s = [-2, -1, 0, 1, 2][(Math.random() * 5) | 0];
    return Math.pow(2, (s * STEP) / 12);
  };

  Sfx.prototype.play = function (name, opts) {
    opts = opts || {};
    this.ensure();
    if (!this.ctx || this.muted) return;
    var p = this.variant() * (opts.pitch || 1);
    switch (name) {
      // The universal button press: a soft, short, slightly rising pop with a
      // faint tick of air on the front. Quiet on purpose - it is heard on every
      // single tap, so it has to sit under the room rather than over it.
      case 'pop':
        this.tone({ freq: 420 * p, freqEnd: 640 * p, dur: 0.055, type: 'sine', gain: 0.42, attack: 0.004 });
        this.noise({ dur: 0.018, gain: 0.05, cutoff: 4200 * p });
        break;
      default:
        break;
    }
  };

  window.sfx = new Sfx();
}());
