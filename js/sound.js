/* ═══════════════════════════════════════════════════
   SOUND — Web Audio API synthesized effects
   No external audio files needed.
   ═══════════════════════════════════════════════════ */

const SFX = (function() {
    let ctx = null;
    let enabled = true;

    function getCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function play(fn) {
        if (!enabled) return;
        try { fn(getCtx()); } catch(e) { /* silent fail */ }
    }

    return {
        get enabled() { return enabled; },
        set enabled(v) { enabled = v; },

        /** Short click/tap */
        click() {
            play(ctx => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'sine';
                o.frequency.setValueAtTime(800, ctx.currentTime);
                o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
                g.gain.setValueAtTime(0.08, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
                o.start(ctx.currentTime);
                o.stop(ctx.currentTime + 0.06);
            });
        },

        /** Dice select */
        select() {
            play(ctx => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'triangle';
                o.frequency.setValueAtTime(520, ctx.currentTime);
                o.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.06);
                g.gain.setValueAtTime(0.1, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
                o.start(ctx.currentTime);
                o.stop(ctx.currentTime + 0.08);
            });
        },

        /** Dice rolling — rapid noise burst */
        roll() {
            play(ctx => {
                const dur = 0.3;
                const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
                const data = buf.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    // Filtered white noise with decay
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08)) * 0.15;
                }
                const src = ctx.createBufferSource();
                src.buffer = buf;
                const filt = ctx.createBiquadFilter();
                filt.type = 'bandpass';
                filt.frequency.value = 2000;
                filt.Q.value = 1.5;
                src.connect(filt);
                filt.connect(ctx.destination);
                src.start(ctx.currentTime);
            });
        },

        /** Successful capture — satisfying two-tone blip */
        capture() {
            play(ctx => {
                const t = ctx.currentTime;
                [440, 660].forEach((f, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.type = 'square';
                    o.frequency.value = f;
                    g.gain.setValueAtTime(0.07, t + i * 0.08);
                    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.12);
                    o.start(t + i * 0.08);
                    o.stop(t + i * 0.08 + 0.12);
                });
            });
        },

        /** Victory fanfare — ascending arpeggio */
        victory() {
            play(ctx => {
                const t = ctx.currentTime;
                [523, 659, 784, 1047].forEach((f, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.type = 'triangle';
                    o.frequency.value = f;
                    g.gain.setValueAtTime(0, t + i * 0.1);
                    g.gain.linearRampToValueAtTime(0.12, t + i * 0.1 + 0.02);
                    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25);
                    o.start(t + i * 0.1);
                    o.stop(t + i * 0.1 + 0.25);
                });
            });
        },

        /** Defeat — descending sad tones */
        defeat() {
            play(ctx => {
                const t = ctx.currentTime;
                [440, 370, 311, 261].forEach((f, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.type = 'sine';
                    o.frequency.value = f;
                    g.gain.setValueAtTime(0.08, t + i * 0.15);
                    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.3);
                    o.start(t + i * 0.15);
                    o.stop(t + i * 0.15 + 0.3);
                });
            });
        },

        /** Skip turn — low thud */
        skip() {
            play(ctx => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'sine';
                o.frequency.setValueAtTime(200, ctx.currentTime);
                o.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
                g.gain.setValueAtTime(0.08, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
                o.start(ctx.currentTime);
                o.stop(ctx.currentTime + 0.12);
            });
        },

        /** Undo — rewind whoosh */
        undo() {
            play(ctx => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(600, ctx.currentTime);
                o.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
                g.gain.setValueAtTime(0.06, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                o.start(ctx.currentTime);
                o.stop(ctx.currentTime + 0.15);
            });
        },

        /** Timer warning tick */
        tick() {
            play(ctx => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'sine';
                o.frequency.value = 1000;
                g.gain.setValueAtTime(0.04, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
                o.start(ctx.currentTime);
                o.stop(ctx.currentTime + 0.03);
            });
        }
    };
})();
