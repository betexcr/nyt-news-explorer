import { useState, useEffect, useCallback } from 'react';

interface UseImageWithRetryOptions {
  src: string;
  fallbackSrc?: string;
  maxRetries?: number;
  retryDelay?: number;
  onLoad?: () => void;
  onError?: () => void;
  onRetry?: (attempt: number) => void;
}

interface UseImageWithRetryResult {
  currentSrc: string;
  isLoading: boolean;
  hasError: boolean;
  retryCount: number;
  retry: () => void;
}

/**
 * Custom hook for loading images with automatic retry logic
 * Implements exponential backoff for failed image loads
 */
export function useImageWithRetry({
  src,
  fallbackSrc = '/logo.png',
  maxRetries = 3,
  retryDelay = 1000,
  onLoad,
  onError,
  onRetry,
}: UseImageWithRetryOptions): UseImageWithRetryResult {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [shouldRetry, setShouldRetry] = useState(false);

  // Reset state when src changes
  useEffect(() => {
    setCurrentSrc(src);
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
    setShouldRetry(false);
  }, [src]);

  // Main image loading logic with retry
  useEffect(() => {
    if (!currentSrc || currentSrc === fallbackSrc) {
      setIsLoading(false);
      return;
    }

    const img = new Image();
    let timeoutId: NodeJS.Timeout;
    let isCancelled = false;

    const handleSuccess = () => {
      if (isCancelled) return;
      setIsLoading(false);
      setHasError(false);
      onLoad?.();
    };

    const handleFailure = () => {
      if (isCancelled) return;

      // If we haven't exceeded max retries, schedule a retry
      if (retryCount < maxRetries) {
        const delay = retryDelay * Math.pow(2, retryCount); // Exponential backoff
        onRetry?.(retryCount + 1);
        
        timeoutId = setTimeout(() => {
          if (!isCancelled) {
            setRetryCount(prev => prev + 1);
            setShouldRetry(true);
          }
        }, delay);
      } else {
        // Max retries exceeded, use fallback
        setIsLoading(false);
        setHasError(true);
        setCurrentSrc(fallbackSrc);
        onError?.();
      }
    };

    img.onload = handleSuccess;
    img.onerror = handleFailure;
    
    // Set a timeout for the image load (10 seconds)
    const loadTimeout = setTimeout(() => {
      if (!isCancelled && isLoading) {
        handleFailure();
      }
    }, 10000);

    img.src = currentSrc;

    // If image is already cached, onload fires synchronously
    if (img.complete) {
      handleSuccess();
    }

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      clearTimeout(loadTimeout);
      img.onload = null;
      img.onerror = null;
    };
  }, [currentSrc, retryCount, shouldRetry, maxRetries, retryDelay, fallbackSrc, isLoading, onLoad, onError, onRetry]);

  // Manual retry function
  const retry = useCallback(() => {
    if (hasError) {
      setCurrentSrc(src);
      setIsLoading(true);
      setHasError(false);
      setRetryCount(0);
      setShouldRetry(false);
    }
  }, [hasError, src]);

  return {
    currentSrc,
    isLoading,
    hasError,
    retryCount,
    retry,
  };
}

