/**
 * Image Utilities for Prescription Processing
 * Handles image compression, conversion, and privacy cleanup
 */

/**
 * Convert File to base64 string
 * @param {File} file - Image file
 * @returns {Promise<string>} Base64 encoded string (without data URL prefix)
 */
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix to get pure base64
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Compress image for API efficiency
 * @param {File} file - Original image file
 * @param {number} maxWidth - Maximum width (default 1024px)
 * @param {number} quality - JPEG quality 0-1 (default 0.8)
 * @returns {Promise<object>} { base64, mimeType, width, height }
 */
export const compressImage = (file, maxWidth = 1024, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            // Calculate dimensions
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            // Create canvas and draw
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to base64
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            const base64 = dataUrl.split(',')[1];

            // Cleanup
            URL.revokeObjectURL(url);

            resolve({
                base64,
                mimeType: 'image/jpeg',
                width,
                height
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
};

/**
 * Get MIME type from file
 * @param {File} file - Image file
 * @returns {string} MIME type
 */
export const getMimeType = (file) => {
    return file.type || 'image/jpeg';
};

/**
 * Create preview URL for image display
 * @param {File} file - Image file
 * @returns {string} Object URL for preview
 */
export const createPreviewUrl = (file) => {
    return URL.createObjectURL(file);
};

/**
 * Revoke preview URL (privacy cleanup)
 * @param {string} url - Object URL to revoke
 */
export const revokePreviewUrl = (url) => {
    if (url) {
        URL.revokeObjectURL(url);
    }
};

/**
 * Clear all image data from memory (privacy safeguard)
 * @param {object} imageData - Object containing image references
 */
export const clearImageData = (imageData) => {
    if (!imageData) return;

    // Clear base64 data
    if (imageData.base64) {
        imageData.base64 = null;
    }

    // Revoke any object URLs
    if (imageData.previewUrl) {
        URL.revokeObjectURL(imageData.previewUrl);
        imageData.previewUrl = null;
    }

    console.log('🔒 Image data cleared from memory');
};

/**
 * Validate image file
 * @param {File} file - Image file
 * @returns {object} { valid, error }
 */
export const validateImageFile = (file) => {
    if (!file) {
        return { valid: false, error: 'No file selected' };
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type)) {
        return { valid: false, error: 'Please select a valid image (JPEG, PNG, WebP)' };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        return { valid: false, error: 'Image is too large. Maximum size is 10MB.' };
    }

    return { valid: true, error: null };
};
