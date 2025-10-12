import React from 'react';
import { useImageWithRetry } from '../hooks/useImageWithRetry';

interface ImageWithRetryProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  maxRetries?: number;
  retryDelay?: number;
  onLoad?: () => void;
  onError?: () => void;
  style?: React.CSSProperties;
}

/**
 * Simple image component with automatic retry logic
 * Lighter weight than ViewTransitionImage for use in lists/tables
 */
const ImageWithRetry: React.FC<ImageWithRetryProps> = ({
  src,
  alt,
  className = '',
  fallbackSrc = '/logo.png',
  maxRetries = 3,
  retryDelay = 1000,
  onLoad,
  onError,
  style,
}) => {
  const { currentSrc, isLoading, hasError } = useImageWithRetry({
    src,
    fallbackSrc,
    maxRetries,
    retryDelay,
    onLoad,
    onError,
  });

  if (hasError && currentSrc === fallbackSrc) {
    return (
      <div 
        className={`no-image ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f0f0f0',
          color: '#666',
          fontSize: '12px',
          ...style,
        }}
      >
        No Image
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={`${className} ${!isLoading ? 'loaded' : ''} ${hasError ? 'error' : ''}`}
      style={{
        opacity: !isLoading ? 1 : 0.5,
        transition: 'opacity 0.3s ease',
        ...style,
      }}
    />
  );
};

export default ImageWithRetry;

