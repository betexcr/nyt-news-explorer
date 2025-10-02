import React, { useState, useRef, useEffect } from 'react';
import { getCachedImageUrl } from '../utils/simpleImageCache';

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
    const loadCachedImage = async () => {
      try {
        const cachedUrl = await getCachedImageUrl(src);
        setImageSrc(cachedUrl);
        setIsLoaded(false);
        setHasError(false);
      } catch (error) {
        console.warn(`Failed to load cached image ${src}:`, error);
        setImageSrc(src);
        setIsLoaded(false);
        setHasError(false);
      }
    };

    loadCachedImage();
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(true);
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
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity var(--vt-duration) var(--vt-ease)',
        cursor: lightboxEnabled ? 'zoom-in' : 'default',
      }}
    />
  );
};

export default ViewTransitionImage;
