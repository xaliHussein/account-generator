/**
 * Image helpers for storing user-uploaded images compactly (as data URLs).
 * Downscales large uploads client-side so the stored base64 stays small,
 * which keeps DB rows light and avoids PHP upload/post size limits.
 */

/**
 * Read a File and return a resized, compressed data URL.
 * Preserves aspect ratio, fitting within maxW x maxH (never upscales).
 * PNGs keep transparency; everything else is encoded as JPEG.
 */
export const resizeImageToDataUrl = (file, maxW = 1012, maxH = 1012, quality = 0.85) =>
    new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Failed to load image'));
            img.onload = () => {
                let { width, height } = img;
                const ratio = Math.min(maxW / width, maxH / height, 1);
                width = Math.max(1, Math.round(width * ratio));
                height = Math.max(1, Math.round(height * ratio));

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const isPng = (file.type || '').toLowerCase() === 'image/png';
                const mime = isPng ? 'image/png' : 'image/jpeg';
                resolve(canvas.toDataURL(mime, quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

/**
 * Validate an image file (type + size). Returns an error string or null.
 */
export const validateImageFile = (file, maxBytes = 10 * 1024 * 1024) => {
    if (!file) return 'No file selected';
    if (!file.type || !file.type.startsWith('image/')) return 'Please choose an image file';
    if (file.size > maxBytes) return `Image must be under ${Math.round(maxBytes / (1024 * 1024))}MB`;
    return null;
};
