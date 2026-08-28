// Universal Image URL Optimizer (Blinkit & Zomato style)
export const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Crect x='90' y='80' width='120' height='100' rx='8' fill='%23e5e7eb'/%3E%3Ccircle cx='150' cy='210' r='18' fill='%23e5e7eb'/%3E%3Ctext x='150' y='255' text-anchor='middle' fill='%239ca3af' font-size='13' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";

/**
 * Optimizes image URLs on-the-fly for size, format (WebP/AVIF), and quality.
 * @param {string} url - Source image URL
 * @param {number} width - Target display width (default 360px for mobile grid cards)
 * @param {number} quality - Target compression quality (default 75)
 * @returns {string} Optimized CDN URL
 */
export const optimizeImageUrl = (url, width = 360, quality = 75) => {
  if (!url || typeof url !== 'string') return FALLBACK_IMAGE;

  // Cloudinary: Injects auto-format, auto-quality, responsive max-width
  if (url.includes('res.cloudinary.com')) {
    const transform = `f_auto,q_auto:good,w_${width},c_limit`;
    if (url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/${transform}/`);
    }
    return url;
  }

  // Unsplash: Injects responsive width, WebP format, quality compression
  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?w=${width}&q=${quality}&auto=format&fit=crop`;
  }

  return url;
};

/**
 * Helper to safely extract the primary thumbnail or image from a product/category object
 */
export const getPrimaryImage = (image, imageThumbnail, width = 360) => {
  if (Array.isArray(imageThumbnail) && imageThumbnail.length > 0 && typeof imageThumbnail[0] === 'string' && imageThumbnail[0].startsWith('http')) {
    return optimizeImageUrl(imageThumbnail[0], width);
  }
  if (typeof imageThumbnail === 'string' && imageThumbnail.startsWith('http')) {
    return optimizeImageUrl(imageThumbnail, width);
  }
  if (Array.isArray(image) && image.length > 0 && typeof image[0] === 'string' && image[0].startsWith('http')) {
    return optimizeImageUrl(image[0], width);
  }
  if (typeof image === 'string' && image.startsWith('http')) {
    return optimizeImageUrl(image, width);
  }
  return FALLBACK_IMAGE;
};
