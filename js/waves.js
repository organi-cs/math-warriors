/* ═══════════════════════════════════════════════════
   WAVES — Dithered mathematical wave background
   Bayer 8×8 threshold for stippled dot placement.
   ═══════════════════════════════════════════════════ */

const Waves = (function() {
    let canvas, ctx, animId;
    let time = 0;
    let running = false;

    const BAYER = [
        [ 0,32, 8,40, 2,34,10,42],
        [48,16,56,24,50,18,58,26],
        [12,44, 4,36,14,46, 6,38],
        [60,28,52,20,62,30,54,22],
        [ 3,35,11,43, 1,33, 9,41],
        [51,19,59,27,49,17,57,25],
        [15,47, 7,39,13,45, 5,37],
        [63,31,55,23,61,29,53,21]
    ].map(row => row.map(v => v / 64));

    const waves = [
        { fn: (x, t) => Math.sin(x * 0.008 + t * 0.4) * 0.15,   weight: 1.0  },
        { fn: (x, t) => Math.cos(x * 0.012 - t * 0.3) * 0.12,   weight: 0.8  },
        { fn: (x, t) => Math.sin(x * 0.005 + t * 0.2) * 0.2,    weight: 0.6  },
        { fn: (x, t) => Math.sin(x * 0.02  + t * 0.6) * 0.06,   weight: 0.5  },
        { fn: (x, t) => Math.cos(x * 0.015 + t * 0.5) * 0.1,    weight: 0.4  },
        { fn: (x, t) => Math.sin(x * 0.003 - t * 0.15) * 0.25,  weight: 0.3  },
        { fn: (x, t) => Math.sin(x * 0.025 + t * 0.8) * 0.04,   weight: 0.35 },
    ];

    function resize() {
        if (!canvas) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
    }

    function start() {
        canvas = document.getElementById('homeWaves');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        if (!ctx) return;
        resize();
        if (!running) {
            running = true;
            window.addEventListener('resize', resize);
            tick();
        }
    }

    function stop() {
        running = false;
        if (animId) { cancelAnimationFrame(animId); animId = null; }
        window.removeEventListener('resize', resize);
    }

    function tick() {
        if (!running) return;
        time += 0.016;
        draw();
        animId = requestAnimationFrame(tick);
    }

    function draw() {
        const w = canvas.width;
        const h = canvas.height;
        if (!w || !h) return;

        ctx.clearRect(0, 0, w, h);

        const step = 4;
        const dotSize = 2;

        for (const wave of waves) {
            for (let px = 0; px < w; px += step) {
                const yNorm = 0.5 + wave.fn(px, time);
                const cy = yNorm * h;
                const bandHeight = 40 * wave.weight;

                for (let dy = -bandHeight; dy <= bandHeight; dy += step) {
                    const py = cy + dy;
                    if (py < 0 || py >= h) continue;

                    const dist = Math.abs(dy) / bandHeight;
                    const intensity = (1 - dist * dist) * wave.weight;

                    const bx = Math.floor(px) & 7;
                    const by = Math.floor(py) & 7;

                    if (intensity > BAYER[by][bx]) {
                        const a = intensity * 0.6;
                        ctx.fillStyle = `rgba(129,182,76,${a})`;
                        ctx.fillRect(px, Math.floor(py), dotSize, dotSize);
                    }
                }
            }
        }

        // Floating math plus signs
        const syms = [
            { x: 0.1, y: 0.2, p: 0 }, { x: 0.85, y: 0.15, p: 1.5 },
            { x: 0.2, y: 0.75, p: 3 }, { x: 0.9, y: 0.8, p: 4.5 },
            { x: 0.5, y: 0.1, p: 2 }, { x: 0.15, y: 0.5, p: 5 },
            { x: 0.75, y: 0.55, p: 1 }, { x: 0.6, y: 0.85, p: 3.5 },
        ];

        ctx.fillStyle = 'rgba(129,182,76,0.15)';
        for (const s of syms) {
            const cx = s.x * w + Math.sin(time * 0.3 + s.p) * 20;
            const cy = s.y * h + Math.cos(time * 0.2 + s.p) * 15;
            for (let i = -12; i <= 12; i += 3) {
                const bx1 = Math.floor(cx + i) & 7;
                const by1 = Math.floor(cy) & 7;
                if (BAYER[by1][bx1] < 0.5) ctx.fillRect(cx + i, cy, 2, 2);
                const bx2 = Math.floor(cx) & 7;
                const by2 = Math.floor(cy + i) & 7;
                if (BAYER[by2][bx2] < 0.5) ctx.fillRect(cx, cy + i, 2, 2);
            }
        }
    }

    return { start, stop };
})();