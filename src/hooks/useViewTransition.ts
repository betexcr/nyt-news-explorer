import { useCallback } from 'react';

interface ViewTransitionOptions {
  onStart?: () => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
}

export const useViewTransition = () => {
  const startTransition = useCallback((
    callback: () => void | Promise<void>,
    options: ViewTransitionOptions = {}
  ) => {
    // Check if View Transitions API is supported
    if (!document.startViewTransition) {
      // Fallback for browsers that don't support View Transitions
      callback();
      return;
    }

    const { onStart, onFinish, onError } = options;

    try {
      onStart?.();
      
      const transition = document.startViewTransition(async () => {
        await callback();
      });

      transition.finished.then(() => {
        onFinish?.();
      }).catch((error) => {
        onError?.(error);
      });
    } catch (error) {
      onError?.(error as Error);
    }
  }, []);

  const isSupported = typeof document !== 'undefined' && !!document.startViewTransition;

  return {
    startTransition,
    isSupported,
  };
};
