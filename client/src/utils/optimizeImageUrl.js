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

  // 1. Cloudinary: Injects auto-format (AVIF/WebP), auto-quality, responsive max-width
  if (url.includes('res.cloudinary.com')) {
    const transform = `f_auto,q_auto:good,w_${width},c_limit`;
    if (url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/${transform}/`);
    }
    return url;
  }

  // 2. Cloudflare R2: Automatically route thumbnail requests (< 350px) to pre-generated lightweight WebP thumbnails
  if ((url.includes('r2.dev') || url.includes('/snapit/')) && width <= 350) {
    if (!url.includes('/thumb_')) {
      // Replaces /snapit/{uuid}.{ext} with /snapit/thumb_{uuid}.webp
      const thumbUrl = url.replace(/\/snapit\/([^/?#]+)\.(jpe?g|png|webp)/i, '/snapit/thumb_$1.webp');
      return thumbUrl;
    }
    return url;
  }

  // 3. Unsplash: Injects responsive width, WebP format, quality compression
  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?w=${width}&q=${quality}&auto=format&fit=crop`;
  }

  return url;
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
  if (Array.isArray(image) && image.length > 0 && typeof image[0] === 'string' && image[0].startsWith('http')) {
    return optimizeImageUrl(image[0], width);
  }
  if (typeof image === 'string' && image.startsWith('http')) {
    return optimizeImageUrl(image, width);
  }
  return FALLBACK_IMAGE;
};
