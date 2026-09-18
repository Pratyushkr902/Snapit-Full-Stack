// client/src/utils/optimizeImage.js
import { optimizeImageUrl, FALLBACK_IMAGE } from './optimizeImageUrl';

// Unified quick-commerce image optimizer
export const optimizeImage = (url, width = 220, quality = 75) => {
    return optimizeImageUrl(url, width, quality);
};