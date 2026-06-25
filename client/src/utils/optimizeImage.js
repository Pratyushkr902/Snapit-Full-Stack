// client/src/utils/optimizeImage.js

// Serve Cloudinary images at a smaller, web-appropriate size to cut bandwidth.
// width: pick based on where the image is displayed (small thumbnail vs full page).
export const optimizeImage = (url, width = 400) => {
    if (!url) return null
    if (typeof url !== 'string') return null
    if (url.includes('res.cloudinary.com')) {
        return url.replace('/upload/', `/upload/w_${width},f_auto,q_auto/`)
    }
    return url
}