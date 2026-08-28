import React, { useState, useEffect } from 'react';
import { FALLBACK_IMAGE, optimizeImageUrl } from '../utils/optimizeImageUrl';

/**
 * Blinkit & Zomato style High-Performance Image Component
 * - Hardware accelerated decoding
 * - Instant shimmer skeleton
 * - Zero layout shift (CLS)
 * - Auto-fallback on network failures
 */
const OptimizedImage = ({
  src,
  alt = 'Snapit Item',
  className = '',
  width = 360,
  quality = 75,
  priority = false,
  objectFit = 'contain',
  style = {},
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const optimizedSrc = optimizeImageUrl(src, width, quality);

  useEffect(() => {
    // Reset state on src change
    setLoaded(false);
    setError(false);
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-slate-50 flex items-center justify-center ${className}`} style={style}>
      {/* Instant Skeleton Shimmer while loading */}
      {!loaded && !error && (
        <div className='absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse' />
      )}

      <img
        src={error ? FALLBACK_IMAGE : (optimizedSrc || FALLBACK_IMAGE)}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding='async'
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
        className={`w-full h-full object-${objectFit} transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
    </div>
  );
};

export default React.memo(OptimizedImage);
