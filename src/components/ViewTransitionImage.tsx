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
}) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImageSrc(src);
    setIsLoaded(false);
    setHasError(false);
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
    if (viewTransitionName && imgRef.current) {
      imgRef.current.style.viewTransitionName = viewTransitionName;
    }
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'loaded' : ''} ${hasError ? 'error' : ''}`}
      onLoad={handleLoad}
      onError={handleError}
      onClick={handleClick}
      fetchPriority={priority}
      sizes={sizes}
      srcSet={srcSet}
      style={{
        viewTransitionName: viewTransitionName || undefined,
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
      }}
    />
  );
};

export default ViewTransitionImage;
