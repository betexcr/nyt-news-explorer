import React, { useRef } from 'react';
import { useImageWithRetry } from '../hooks/useImageWithRetry';

interface ViewTransitionImageProps {
  src: string;
  alt: string;
  className?: string;
  viewTransitionName?: string;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  priority?: 'high' | 'low';
  sizes?: string;
  srcSet?: string;
  // Enhanced props for dynamic naming
  articleId?: string;
  // Lightbox support
  onLightboxOpen?: () => void;
  lightboxEnabled?: boolean;
  // Retry configuration
  maxRetries?: number;
  retryDelay?: number;
}

const ViewTransitionImage: React.FC<ViewTransitionImageProps> = ({
  src,
  alt,
  className = '',
  viewTransitionName,
  onLoad,
  onError,
  fallbackSrc = '/logo.png',
  priority = 'low',
  sizes,
  srcSet,
  articleId,
  onLightboxOpen,
  lightboxEnabled = false,
  maxRetries = 3,
  retryDelay = 1000,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Use the retry hook for robust image loading
  const { currentSrc, isLoading, hasError, retryCount } = useImageWithRetry({
    src,
    fallbackSrc,
    maxRetries,
    retryDelay,
    onLoad,
    onError,
    onRetry: (attempt) => {
      console.log(`Retrying image load (attempt ${attempt}/${maxRetries}):`, src);
    },
  });

  const handleClick = () => {
    // Add view transition name when image is clicked
    const transitionName = viewTransitionName || (articleId ? `article-img-${articleId}` : undefined);
    if (transitionName && imgRef.current) {
      imgRef.current.style.viewTransitionName = transitionName;
    }

    // Handle lightbox if enabled
    if (lightboxEnabled && onLightboxOpen) {
      onLightboxOpen();
    }
  };

  // Generate dynamic view transition name
  const getViewTransitionName = () => {
    if (viewTransitionName) return viewTransitionName;
    if (articleId) return `article-img-${articleId}`;
    return undefined;
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`${className} ${!isLoading ? 'loaded' : ''} ${hasError ? 'error' : ''} ${lightboxEnabled ? 'lightbox-enabled' : ''}`}
        onClick={handleClick}
        fetchPriority={priority}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        srcSet={srcSet}
        loading={priority === 'high' ? 'eager' : 'lazy'}
        decoding="async"
        style={{
          viewTransitionName: getViewTransitionName(),
          opacity: !isLoading ? 1 : 0.3,
          transition: 'opacity var(--vt-duration) var(--vt-ease)',
          cursor: lightboxEnabled ? 'zoom-in' : 'default',
          // Mobile performance optimizations
          willChange: 'opacity',
          transform: 'translateZ(0)', // Force hardware acceleration
        }}
      />
      {isLoading && retryCount > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          Retrying... ({retryCount}/{maxRetries})
        </div>
      )}
    </div>
  );
};

export default ViewTransitionImage;
