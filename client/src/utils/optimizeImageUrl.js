// Universal Image URL Optimizer (Blinkit & Zomato quick-commerce grade)
export const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Crect x='60' y='55' width='80' height='65' rx='6' fill='%23e5e7eb'/%3E%3Ccircle cx='100' cy='140' r='12' fill='%23e5e7eb'/%3E%3Ctext x='100' y='170' text-anchor='middle' fill='%239ca3af' font-size='10' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";

/**
 * Optimizes image URLs on-the-fly for size, format (WebP/AVIF), and quality.
 * @param {string} url - Source image URL
 * @param {number} width - Target display width (default 220px for high-density mobile cards)
 * @param {number} quality - Target compression quality (default 75)
 * @returns {string} Optimized CDN URL
 */
export const optimizeImageUrl = (url, width = 220, quality = 75) => {
  if (!url || typeof url !== 'string') return FALLBACK_IMAGE;
  const trimmed = url.trim();
  if (!trimmed) return FALLBACK_IMAGE;

  // 1. Cloudinary: Injects auto-format (AVIF/WebP), auto-quality, responsive max-width
  if (trimmed.includes('res.cloudinary.com')) {
    const transform = `f_auto,q_auto:good,w_${width},c_limit`;
    if (trimmed.includes('/upload/')) {
      return trimmed.replace('/upload/', `/upload/${transform}/`);
    }
    return trimmed;
  }

  // 2. Unsplash: Injects responsive width, WebP format, quality compression
  if (trimmed.includes('images.unsplash.com')) {
    const baseUrl = trimmed.split('?')[0];
    return `${baseUrl}?w=${width}&q=${quality}&auto=format&fit=crop`;
  }

  // 3. Cloudflare R2 / Custom Storage: Already WebP compressed at source (30-60KB).
  // Directly serve the R2 URL to hit Cloudflare's global edge cache (Cache-Control: public, max-age=31536000, immutable)
  // in a single round-trip without 404s.
  return trimmed;
};

/**
 * Helper to safely extract the primary thumbnail or image from a product/category object
 */
export const getPrimaryImage = (image, imageThumbnail, width = 220) => {
  if (Array.isArray(imageThumbnail) && imageThumbnail.length > 0 && typeof imageThumbnail[0] === 'string' && imageThumbnail[0].startsWith('http')) {
    return optimizeImageUrl(imageThumbnail[0], width);
  }
  if (typeof imageThumbnail === 'string' && imageThumbnail.startsWith('http')) {
    return optimizeImageUrl(imageThumbnail, width);
  }
  if (Array.isArray(image) && image.length > 0 && typeof image[0] === 'string' && image[0].length > 0) {
    return optimizeImageUrl(image[0], width);
  }
  if (typeof image === 'string' && image.length > 0) {
    return optimizeImageUrl(image, width);
  }
  return FALLBACK_IMAGE;
};

/**
 * In-memory prefetch queue for Blinkit/Zomato style instant image display.
 * Preloads image bytes into the browser's memory/HTTP cache ahead of user interaction.
 */
const preloadedUrls = new Set();

export const preloadImages = (items = [], width = 220) => {
  if (typeof window === 'undefined' || !Array.isArray(items) || items.length === 0) return;

  const runner = window.requestIdleCallback || ((cb) => setTimeout(cb, 100));

  runner(() => {
    items.slice(0, 16).forEach((item) => {
      let rawUrl = null;
      if (typeof item === 'string') {
        rawUrl = item;
      } else if (item && typeof item === 'object') {
        rawUrl = (Array.isArray(item.image) ? item.image[0] : item.image) ||
                 (Array.isArray(item.imageThumbnail) ? item.imageThumbnail[0] : item.imageThumbnail);
      }

      if (!rawUrl || typeof rawUrl !== 'string') return;
      const optimized = optimizeImageUrl(rawUrl, width);
      if (!optimized || optimized === FALLBACK_IMAGE || preloadedUrls.has(optimized)) return;

      if (preloadedUrls.size > 300) {
        const oldest = preloadedUrls.values().next().value;
        if (oldest) preloadedUrls.delete(oldest);
      }
      preloadedUrls.add(optimized);
      const img = new Image();
      img.decoding = 'async';
      img.src = optimized;
    });
  });
};
