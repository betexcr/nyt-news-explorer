import React, { useState, useRef, useEffect } from 'react';

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
}) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImageSrc(src);
    setIsLoaded(false);
    setHasError(false);
    
    // Check if image is already cached and loaded
    const img = new Image();
    img.onload = () => {
      setIsLoaded(true);
    };
    img.onerror = () => {
      // If external image fails, try fallback
      if (fallbackSrc && src !== fallbackSrc) {
        setImageSrc(fallbackSrc);
        setIsLoaded(true);
      } else {
        setHasError(true);
      }
    };
    img.src = src;
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(false); // Don't mark as error when using fallback
      setIsLoaded(true); // Mark as loaded when fallback is used
    }
    onError?.();
  };

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
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'loaded' : ''} ${hasError ? 'error' : ''} ${lightboxEnabled ? 'lightbox-enabled' : ''}`}
      onLoad={handleLoad}
      onError={handleError}
      onClick={handleClick}
      fetchPriority={priority}
      sizes={sizes}
      srcSet={srcSet}
      style={{
        viewTransitionName: getViewTransitionName(),
        opacity: isLoaded ? 1 : 0.3,
        transition: 'opacity var(--vt-duration) var(--vt-ease)',
        cursor: lightboxEnabled ? 'zoom-in' : 'default',
      }}
    />
  );
};

export default ViewTransitionImage;
