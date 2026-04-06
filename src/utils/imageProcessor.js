/**
 * ══════════════════════════════════════════════════════════════════
 * SaarthiRx — Prescription Image Pre-Processor
 * ══════════════════════════════════════════════════════════════════
 *
 * PURPOSE:
 *   Improve Gemini OCR accuracy on blurry, low-contrast, or
 *   hand-held prescription photos taken by elderly users.
 *
 * PIPELINE (applied in order):
 *   1. Auto-level (histogram stretch) for low-contrast images
 *   2. Brightness / Contrast boost
 *   3. Unsharp mask (sharpening) to clarify handwriting
 *   4. Adaptive grayscale for handwritten prescriptions
 *   5. Resize to OCR-optimal resolution (max 2048px)
 *   6. Re-encode to high-quality JPEG
 *
 * DESIGN NOTES:
 *   • All processing is in-browser using OffscreenCanvas / Canvas API.
 *   • Zero external dependencies.
 *   • Every operation is O(n) on pixel count — safe for mobile.
 *   • Processing time is typically 50–300ms even on low-end devices.
 */

// ─── Configuration ────────────────────────────────────────────────────────────

/** Maximum dimension for the processed image sent to Gemini */
const OCR_MAX_DIM = 2048;

/** Output quality for JPEG re-encoding (0.0 – 1.0) */
const OUTPUT_QUALITY = 0.92;

/** Sharpen kernel strength (higher = more aggressive) */
const SHARPEN_STRENGTH = 0.8;

/** Minimum pixel variance to trigger auto-level (skip for already-clear images) */
const AUTO_LEVEL_VARIANCE_THRESHOLD = 2500;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Load a base64 string into an HTMLImageElement.
 * @param {string} base64
 * @param {string} mimeType
 * @returns {Promise<HTMLImageElement>}
 */
const loadImageFromBase64 = (base64, mimeType) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image for pre-processing'));
        img.src = `data:${mimeType};base64,${base64}`;
    });

/**
 * Draw image onto a canvas, scaling to fit within maxDim.
 * @param {HTMLImageElement} img
 * @param {number} maxDim
 * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, scale: number }}
 */
const createScaledCanvas = (img, maxDim = OCR_MAX_DIM) => {
    const canvas = document.createElement('canvas');
    const ratio = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
    canvas.width  = Math.round(img.naturalWidth  * ratio);
    canvas.height = Math.round(img.naturalHeight * ratio);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return { canvas, ctx, scale: ratio };
};

// ─── Step 1: Auto-Level (Histogram Stretch) ───────────────────────────────────

/**
 * Stretch luminance histogram so that darkest pixel → 0, brightest → 255.
 * This fixes under-exposed / faded prescriptions.
 * Skipped if image already has sufficient contrast.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
const applyAutoLevel = (ctx, width, height) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let min = 255, max = 0, sum = 0, sumSq = 0;
    const n = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
        // Luminance approximation (perceptual)
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum < min) min = lum;
        if (lum > max) max = lum;
        sum += lum;
        sumSq += lum * lum;
    }

    const mean = sum / n;
    const variance = sumSq / n - mean * mean;

    // Skip if already high contrast
    if (variance >= AUTO_LEVEL_VARIANCE_THRESHOLD) return;

    const range = max - min || 1;
    const scale = 255 / range;

    for (let i = 0; i < data.length; i += 4) {
        data[i]     = Math.min(255, Math.max(0, (data[i]     - min) * scale));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - min) * scale));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - min) * scale));
    }

    ctx.putImageData(imageData, 0, 0);
    console.log(`📊 Auto-level applied (variance=${variance.toFixed(0)}, range=${min.toFixed(0)}-${max.toFixed(0)})`);
};

// ─── Step 2: Brightness + Contrast ───────────────────────────────────────────

/**
 * Adjust brightness and contrast.
 * Uses the standard photoshop-style formula: px = clamp((px - 128) * contrast + 128 + brightness)
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} brightness  -100 to +100
 * @param {number} contrast    0.5 (lower) to 2.0 (higher)
 */
const applyBrightnessContrast = (ctx, width, height, brightness = 15, contrast = 1.25) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            let px = data[i + c];
            px = (px - 128) * contrast + 128 + brightness;
            data[i + c] = Math.min(255, Math.max(0, px));
        }
    }

    ctx.putImageData(imageData, 0, 0);
};

// ─── Step 3: Unsharp Mask (Sharpening) ───────────────────────────────────────

/**
 * Apply a 3×3 unsharp mask to enhance edges (handwriting strokes).
 * This is the same algorithm used in Adobe Photoshop's "Sharpen" filter.
 *
 * Kernel:
 *   [  0, -1,  0 ]
 *   [ -1,  5, -1 ]  × strength  +  original × (1 - strength)
 *   [  0, -1,  0 ]
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} strength  0.0–1.0
 */
const applySharpen = (ctx, width, height, strength = SHARPEN_STRENGTH) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const src = new Uint8ClampedArray(imageData.data); // Copy
    const dst = imageData.data;

    // 3×3 sharpen kernel weights
    const kernel = [
        0, -1,  0,
       -1,  5, -1,
        0, -1,  0
    ];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = (y * width + x) * 4;

            for (let c = 0; c < 3; c++) {
                let acc = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const ni = ((y + ky) * width + (x + kx)) * 4;
                        acc += src[ni + c] * kernel[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                const sharpened = Math.min(255, Math.max(0, acc));
                // Blend with original for controlled sharpening
                dst[i + c] = Math.round(sharpened * strength + src[i + c] * (1 - strength));
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
};

// ─── Step 4: Adaptive Grayscale ──────────────────────────────────────────────

/**
 * Convert to grayscale using luminosity method.
 * Handwritten prescriptions on white paper benefit hugely from this:
 * it removes ink color noise and maximises text contrast for Gemini.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
const applyGrayscale = (ctx, width, height) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        data[i]     = lum;
        data[i + 1] = lum;
        data[i + 2] = lum;
        // Alpha unchanged
    }

    ctx.putImageData(imageData, 0, 0);
};

// ─── Step 5: Deskew Hint (metadata only) ─────────────────────────────────────
// NOTE: True deskew requires Hough transform which is too heavy for the browser.
// Instead, we pass the image as-is and instruct Gemini to handle rotation.
// The prompt already instructs: "Read regardless of orientation."

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Pre-process a prescription image for maximum OCR accuracy.
 *
 * PIPELINE:
 *   decode → scale → auto-level → brightness/contrast → sharpen → grayscale → encode
 *
 * @param {string} base64    - Raw base64 (no data URL prefix)
 * @param {string} mimeType  - e.g. 'image/jpeg', 'image/png'
 * @param {object} [options]
 * @param {boolean} [options.grayscale=true]         - Convert to grayscale
 * @param {boolean} [options.sharpen=true]           - Apply unsharp mask
 * @param {boolean} [options.autoLevel=true]         - Apply histogram stretch
 * @param {number}  [options.brightness=15]          - Brightness adjustment
 * @param {number}  [options.contrast=1.25]          - Contrast multiplier
 * @param {number}  [options.maxDim=2048]            - Max output dimension
 *
 * @returns {Promise<{ base64: string, mimeType: string, wasProcessed: boolean, diagnostics: object }>}
 */
export const preprocessPrescriptionImage = async (base64, mimeType = 'image/jpeg', options = {}) => {
    const {
        grayscale   = true,
        sharpen     = true,
        autoLevel   = true,
        brightness  = 15,
        contrast    = 1.25,
        maxDim      = OCR_MAX_DIM,
    } = options;

    const startTime = performance.now();

    try {
        // ── Decode ──────────────────────────────────────────────
        const img = await loadImageFromBase64(base64, mimeType);
        const originalW = img.naturalWidth;
        const originalH = img.naturalHeight;

        // ── Scale to OCR-optimal size ────────────────────────────
        const { canvas, ctx, scale } = createScaledCanvas(img, maxDim);
        const { width, height } = canvas;

        // ── Apply pipeline ───────────────────────────────────────
        if (autoLevel)  applyAutoLevel(ctx, width, height);
        applyBrightnessContrast(ctx, width, height, brightness, contrast);
        if (sharpen)    applySharpen(ctx, width, height);
        if (grayscale)  applyGrayscale(ctx, width, height);

        // ── Encode ───────────────────────────────────────────────
        const dataUrl    = canvas.toDataURL('image/jpeg', OUTPUT_QUALITY);
        const processed  = dataUrl.split(',')[1];

        const elapsed    = Math.round(performance.now() - startTime);

        const diagnostics = {
            originalSize: `${originalW}×${originalH}`,
            processedSize: `${width}×${height}`,
            scale: scale.toFixed(2),
            pipeline: [
                autoLevel  && 'auto-level',
                'brightness/contrast',
                sharpen    && 'sharpen',
                grayscale  && 'grayscale',
            ].filter(Boolean).join(' → '),
            processingTimeMs: elapsed,
        };

        console.log('🖼️ Image pre-processing complete:', diagnostics);

        return {
            base64: processed,
            mimeType: 'image/jpeg',
            wasProcessed: true,
            diagnostics,
        };

    } catch (error) {
        console.warn('⚠️ Image pre-processing failed, using original:', error.message);
        // Graceful degradation — return original image
        return {
            base64,
            mimeType,
            wasProcessed: false,
            diagnostics: { error: error.message },
        };
    }
};

/**
 * Lightweight version for medicine photo verification.
 * Only applies brightness/contrast – no grayscale (color helps identify pills).
 *
 * @param {string} base64
 * @param {string} mimeType
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
export const preprocessMedicinePhoto = async (base64, mimeType = 'image/jpeg') => {
    return preprocessPrescriptionImage(base64, mimeType, {
        grayscale:  false,  // Keep color for pill identification
        sharpen:    true,
        autoLevel:  true,
        brightness: 10,
        contrast:   1.15,
        maxDim:     1600,
    });
};
