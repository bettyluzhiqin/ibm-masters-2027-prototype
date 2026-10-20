// Sound for the prototype, synthesised live with Web Audio (no files).
// Three buses under one master (the on-screen volume): UI sounds, ambient bed, video audio.
// Mixing between buses is a backstage (iPad) setting; the screen only has the master level.
window.sfx = (() => {
  let ctx = null, master, ui, amb, vid, noise;
  const LEVEL = { ui: 0.55, amb: 1, vid: 1 };

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
    master = ctx.createGain(); master.connect(comp);
    ui = bus(LEVEL.ui); amb = bus(0); vid = bus(0);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ambient(); video(); apply();
  }
  const bus = g => { const n = ctx.createGain(); n.gain.value = g; n.connect(master); return n; };
  const ramp = (p, v, t = 0.4) => p.setTargetAtTime(v, ctx.currentTime, t / 3);
  const noiseSrc = () => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; return s; };

  /* ---------- UI sounds: soft glass pops and airy swishes, all in G major pentatonic ---------- */
  const NOTE = { G4: 392, B4: 494, D5: 587, G5: 784, B5: 988, D6: 1175, G6: 1568 };
  // glass pop: sine + faint 2nd/3rd harmonic, 4 ms attack, quick pitch glide from f*bend onto f, lowpassed under 5 kHz
  function pop(f, when = 0, gain = 0.14, len = 0.2, bend = 1) {
    const t = ctx.currentTime + when, g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 5000; lp.connect(ui); g.connect(lp);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + len); g.gain.linearRampToValueAtTime(0, t + len + 0.01);
    [[1, 1], [2, 0.12], [3, 0.03]].forEach(([m, a]) => {
      const o = ctx.createOscillator(), og = ctx.createGain(); og.gain.value = a;
      o.frequency.setValueAtTime(f * m * bend, t); o.frequency.exponentialRampToValueAtTime(f * m, t + Math.min(0.035, len * 0.5));
      o.connect(og).connect(g); o.start(t); o.stop(t + len + 0.02);
    });
  }
  // drag tick: a 30 ms high glass blip plus a 12 ms band-limited noise transient
  function tap(k = 1, f = NOTE.G6) {
    pop(f, 0, 0.035 * k, 0.03, 1.2);
    const t = ctx.currentTime, s = noiseSrc(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = "bandpass"; bp.frequency.value = 3000; bp.Q.value = 1.5;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12 * k, t + 0.001); g.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    s.connect(bp).connect(g).connect(ui); s.start(t, Math.random()); s.stop(t + 0.02);
  }
  // airy swish: wide band of noise sweeping 700 <-> 3200 Hz, capped at 5.5 kHz
  function air(up = true, len = 0.3, gain = 0.04, when = 0) {
    const t = ctx.currentTime + when, s = noiseSrc(), bp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = "bandpass"; bp.Q.value = 0.9; lp.type = "lowpass"; lp.frequency.value = 5500;
    bp.frequency.setValueAtTime(up ? 700 : 3200, t); bp.frequency.exponentialRampToValueAtTime(up ? 3200 : 700, t + len);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + len * 0.35); g.gain.linearRampToValueAtTime(0, t + len);
    s.connect(bp).connect(lp).connect(g).connect(ui); s.start(t, Math.random()); s.stop(t + len + 0.02);
  }
  const SOUNDS = {
    tick: () => tap(),
    tickSoft: () => tap(0.45, NOTE.D6 * 2),
    next: () => { air(true, 0.18, 0.025); pop(NOTE.D5, 0, 0.13, 0.16, 0.94); pop(NOTE.G5, 0.05, 0.1, 0.2, 0.94); },
    prev: () => { air(false, 0.18, 0.025); pop(NOTE.G5, 0, 0.13, 0.16, 1.06); pop(NOTE.D5, 0.05, 0.1, 0.2, 1.06); },
    toggle: () => pop(NOTE.B5, 0, 0.11, 0.12, 1.12),
    open: () => { air(true, 0.22, 0.035); pop(NOTE.G5, 0.02, 0.12, 0.24, 0.8); },
    close: () => { air(false, 0.2, 0.03); pop(NOTE.D5, 0, 0.12, 0.2, 1.25); },
    enter: () => { air(true, 0.35, 0.05); [NOTE.G4, NOTE.D5, NOTE.G5].forEach((n, i) => pop(n, 0.1 + i * 0.055, 0.11, 0.35, 0.96)); },
    exit: () => { air(false, 0.3, 0.045); [NOTE.G5, NOTE.D5, NOTE.G4].forEach((n, i) => pop(n, 0.04 + i * 0.065, 0.11, 0.35, 1.04)); },
    chime: () => { pop(NOTE.G5, 0, 0.09, 0.8); pop(NOTE.D6, 0.18, 0.07, 0.9); },
    start: () => { air(true, 0.6, 0.05); [NOTE.G4, NOTE.D5, NOTE.G5, NOTE.B5].forEach((n, i) => pop(n, 0.18 + i * 0.05, 0.075, 0.9, 0.97)); },
    end: () => { air(false, 0.5, 0.03); [NOTE.G5, NOTE.D5, NOTE.B4, NOTE.G4].forEach((n, i) => pop(n, i * 0.1, 0.085, 0.8, 1.02)); },
  };

  /* ---------- ambient bed: spring morning on the course (breeze, pines, songbirds, a far-off gallery) ---------- */
  function ambient() {
    const R = (lo, hi) => lo + Math.random() * (hi - lo);
    // its own 9 s noise loop so the 2 s UI buffer never repeats audibly under the breeze
    const buf = ctx.createBuffer(1, ctx.sampleRate * 9, ctx.sampleRate), bd = buf.getChannelData(0);
    for (let i = 0; i < bd.length; i++) bd[i] = Math.random() * 2 - 1;
    const src = off => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, off); return s; };
    const filt = (type, f, q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
    const gain = v => { const n = ctx.createGain(); n.gain.value = v; return n; };
    const panner = p => { const n = ctx.createStereoPanner(); n.pan.value = p; return n; };

    // breeze: two decorrelated noise streams panned apart, soft band 60-700 Hz
    const WIND = 0.2;
    const wind = [[-0.6, 0], [0.6, 4.5]].map(([p, off]) => {
      const lp = filt("lowpass", 550, 0.5), g = gain(WIND * 0.7);
      src(off).connect(filt("highpass", 60)).connect(lp).connect(g).connect(panner(p)).connect(amb);
      return { lp, g };
    });
    // gusts: random targets eased in with setTargetAtTime, so levels stay positive and never pump
    const gust = () => {
      const k = R(0.45, 1), tc = R(1.5, 3.5), now = ctx.currentTime;
      wind.forEach(w => {
        w.g.gain.setTargetAtTime(WIND * k * R(0.85, 1.15), now, tc);
        w.lp.frequency.setTargetAtTime(300 + 550 * k * R(0.9, 1.1), now, tc);
      });
      setTimeout(gust, R(3500, 8000));
    };
    gust();

    // songbirds: swept whistles (sine + a touch of 2nd harmonic), each bird placed at a random spot and distance
    const note = (out, t, f0, f1, d, peak) => {
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + d * 0.25); g.gain.linearRampToValueAtTime(0, t + d); g.connect(out);
      [[1, 1], [2, R(0, 0.12)]].forEach(([m, a]) => {
        const o = ctx.createOscillator(), og = gain(a);
        o.frequency.setValueAtTime(f0 * m, t); o.frequency.exponentialRampToValueAtTime(f1 * m, t + d);
        o.connect(og).connect(g); o.start(t); o.stop(t + d + 0.02);
      });
    };
    const SONGS = {
      cardinal(out, t) { // "cheer cheer cheer": slow down-slurred whistles, sometimes a quick "birdy" tail
        const s = R(0.92, 1.08), n = 3 + Math.floor(R(0, 4)), d = R(0.2, 0.3);
        for (let i = 0; i < n; i++, t += d + R(0.08, 0.14)) note(out, t, 4100 * s, 2000 * s, d, 1);
        if (Math.random() < 0.5) for (let i = 0; i < 4; i++, t += 0.17) note(out, t, 2100 * s, 3500 * s, 0.11, 0.8);
        return t;
      },
      wren(out, t) { // "tea-kettle tea-kettle tea-kettle": fast three-note phrase, repeated
        const s = R(0.9, 1.1), n = 3 + Math.floor(R(0, 3));
        const SYL = [[3200, 4300, 0.06], [4400, 2600, 0.07], [2800, 3500, 0.06]];
        for (let i = 0; i < n; i++, t += 0.06) SYL.forEach(([a, b, d]) => { note(out, t, a * s, b * s, d, 1); t += d + 0.025; });
        return t;
      },
      chip(out, t) { // a few soft call notes between songs
        const n = 1 + Math.floor(R(0, 3));
        for (let i = 0; i < n; i++, t += R(0.25, 0.6)) note(out, t, R(5200, 6000), R(4200, 4800), 0.04, 0.6);
        return t;
      },
    };
    const sing = (kind, p) => {
      const near = R(0, 1), out = gain(0.008 + 0.016 * near); // farther birds are quieter and duller
      out.connect(filt("lowpass", 3500 + 6000 * near)).connect(panner(p)).connect(amb);
      SONGS[kind](out, ctx.currentTime + 0.05);
    };
    const birds = () => {
      const r = Math.random(), kind = r < 0.45 ? "cardinal" : r < 0.8 ? "wren" : "chip", p = R(-0.8, 0.8);
      sing(kind, p);
      if (kind !== "chip" && Math.random() < 0.3) setTimeout(() => sing(kind, -p * R(0.6, 1)), R(3000, 5000)); // a neighbour answers
      setTimeout(birds, R(5000, 13000));
    };
    setTimeout(birds, 2000);

    // a gallery far across the course: a soft swell of applause every minute or so, heavily distance-filtered
    const gallery = () => {
      const t = ctx.currentTime, s = ctx.createBufferSource(), g = ctx.createGain(), tex = gain(1), clat = gain(30);
      s.buffer = buf; s.loop = true;
      const c = ctx.createBufferSource(); c.buffer = buf; c.loop = true; // fast amplitude texture = many hands
      c.connect(filt("bandpass", 18, 0.5)).connect(clat).connect(tex.gain);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 0.5); g.gain.setTargetAtTime(0, t + 1.2, 0.9);
      s.connect(filt("bandpass", 1100, 0.6)).connect(filt("lowpass", 2200)).connect(tex).connect(g).connect(panner(R(-0.7, 0.7))).connect(amb);
      s.start(t, R(0, 8)); c.start(t, R(0, 8)); s.stop(t + 7); c.stop(t + 7);
      setTimeout(gallery, R(45000, 90000));
    };
    setTimeout(gallery, R(20000, 35000));
  }

  /* ---------- video audio: stand-in for a video's own soundtrack (crowd murmur + applause swells) ---------- */
  function video() {
    const s = noiseSrc(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = "bandpass"; bp.frequency.value = 650; bp.Q.value = 0.8; g.gain.value = 0.05;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.3; lg.gain.value = 0.02;
    lfo.connect(lg).connect(g.gain); lfo.start();
    s.connect(bp).connect(g).connect(vid); s.start();
    const clap = () => {
      const t = ctx.currentTime, a = noiseSrc(), hp = ctx.createBiquadFilter(), ag = ctx.createGain();
      hp.type = "highpass"; hp.frequency.value = 1400;
      ag.gain.setValueAtTime(0, t); ag.gain.linearRampToValueAtTime(0.06, t + 0.6); ag.gain.linearRampToValueAtTime(0, t + 3);
      a.connect(hp).connect(ag).connect(vid); a.start(t, Math.random()); a.stop(t + 3.1);
      setTimeout(clap, 7000 + Math.random() * 8000);
    };
    setTimeout(clap, 3000);
  }

  /* ---------- state from the page ---------- */
  let vol = 0.7, muted = false, scene = "idle";
  // ambient sits under everything, drops under the Digital Twin, and ducks hard while a video plays
  const AMB = { idle: 1, media: 0.15, round: 0.25, filterset: 0.55, freeplay: 0.55 };
  function apply() {
    if (!ctx) return;
    ramp(master.gain, muted ? 0 : vol, 0.15);
    ramp(amb.gain, (AMB[scene] ?? 0.6) * LEVEL.amb, 1.2);
    ramp(vid.gain, scene === "media" || scene === "round" ? LEVEL.vid : 0, 0.6); // video chapters and the game-focus shot video
  }

  // browsers only allow sound after a user gesture
  addEventListener("pointerdown", () => { init(); ctx.resume(); }, { capture: true });
  // Idle should already have its ambient bed: start straight away where the browser allows it
  // (the wall's kiosk browser runs with --autoplay-policy=no-user-gesture-required); otherwise the first touch starts it
  try { init(); ctx.resume().catch(() => {}); } catch {}

  let lastTick = 0;
  return {
    play(name) {
      if (!ctx || !SOUNDS[name]) return;
      if (name.startsWith("tick")) { const n = performance.now(); if (n - lastTick < 35) return; lastTick = n; } // drags fire fast
      SOUNDS[name]();
    },
    set(v, isMuted, view) { vol = v / 100; muted = isMuted; scene = view; apply(); },
    get running() { return ctx?.state === "running"; },
  };
})();
