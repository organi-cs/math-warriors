/* ═══════════════════════════════════════════════════
   DITHER — Generates 8×8 Bayer pattern at boot
   
   Creates a tiny tiling texture from the Bayer matrix
   and injects it as CSS custom properties so the rest
   of the app can use it purely in CSS.
   ═══════════════════════════════════════════════════ */

(function initDither() {
    // 8×8 Bayer threshold matrix (values 0–63)
    const BAYER_8 = [
        [ 0, 32,  8, 40,  2, 34, 10, 42],
        [48, 16, 56, 24, 50, 18, 58, 26],
        [12, 44,  4, 36, 14, 46,  6, 38],
        [60, 28, 52, 20, 62, 30, 54, 22],
        [ 3, 35, 11, 43,  1, 33,  9, 41],
        [51, 19, 59, 27, 49, 17, 57, 25],
        [15, 47,  7, 39, 13, 45,  5, 37],
        [63, 31, 55, 23, 61, 29, 53, 21]
    ];

    const SCALE = 4; // each matrix cell = 4×4 CSS pixels for visibility

    /**
     * Generate a tiling dither texture at a given opacity/threshold.
     * Pixels where bayer value < threshold are opaque, others transparent.
     * This creates classic Bayer crosshatch patterns.
     */
    function makeBayerTexture(color, opacity, mode) {
        const size = 8 * SCALE;
        const can = document.createElement('canvas');
        can.width = size;
        can.height = size;
        const ctx = can.getContext('2d');

        if (mode === 'gradient') {
            // Each cell gets opacity proportional to its Bayer value
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const val = BAYER_8[y][x] / 63; // 0..1
                    ctx.fillStyle = color;
                    ctx.globalAlpha = val * opacity;
                    ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
                }
            }
        } else if (mode === 'threshold') {
            // Binary: cell is on/off based on threshold
            const thresh = Math.floor(opacity * 64);
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    if (BAYER_8[y][x] < thresh) {
                        ctx.fillStyle = color;
                        ctx.globalAlpha = 1;
                        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
                    }
                }
            }
        }

        return can.toDataURL();
    }

    /**
     * Generate the mask image for captured dice dissolve.
     * ~75% of pixels are filled = die is mostly hidden.
     */
    function makeDissolveMask() {
        const size = 8 * SCALE;
        const can = document.createElement('canvas');
        can.width = size;
        can.height = size;
        const ctx = can.getContext('2d');

        // Start with fully white (visible)
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);

        // Punch out ~80% of pixels using Bayer order (high threshold)
        const thresh = 52; // out of 64 — leaves ~19% visible
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (BAYER_8[y][x] < thresh) {
                    ctx.clearRect(x * SCALE, y * SCALE, SCALE, SCALE);
                }
            }
        }
        return can.toDataURL();
    }

    // Generate textures and inject as CSS properties
    const root = document.documentElement.style;

    // Subtle overlay for panels/backgrounds (dark stipple)
    root.setProperty('--dither-subtle',
        `url("${makeBayerTexture('#000000', 0.35, 'gradient')}")`);

    // Stronger overlay for dividers/edges
    root.setProperty('--dither-medium',
        `url("${makeBayerTexture('#000000', 0.6, 'gradient')}")`);

    // Green-tinted for active player glow
    root.setProperty('--dither-green',
        `url("${makeBayerTexture('#81b64c', 0.25, 'gradient')}")`);

    // Red-tinted for opponent glow
    root.setProperty('--dither-red',
        `url("${makeBayerTexture('#e04040', 0.25, 'gradient')}")`);

    // Amber for selection highlight
    root.setProperty('--dither-amber',
        `url("${makeBayerTexture('#f0c040', 0.3, 'gradient')}")`);

    // Dissolve mask for captured dice
    root.setProperty('--dither-dissolve',
        `url("${makeDissolveMask()}")`);

    // Hard threshold pattern (50%) for decorative use
    root.setProperty('--dither-half',
        `url("${makeBayerTexture('#000000', 0.5, 'threshold')}")`);

    // Light pattern for victory overlay
    root.setProperty('--dither-victory',
        `url("${makeBayerTexture('#000000', 0.85, 'threshold')}")`);

})();
