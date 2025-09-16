import { useCallback } from 'react';
import { useViewTransitions } from '../components/ViewTransitionsProvider';

interface ViewTransitionOptions {
  onStart?: () => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
}

export const useViewTransition = () => {
  const { start, enabled } = useViewTransitions();

  const startTransition = useCallback((
    callback: () => void | Promise<void>,
    options: ViewTransitionOptions = {}
  ) => {
    const { onStart, onFinish, onError } = options;

    try {
      onStart?.();
      
      start(async () => {
        await callback();
        onFinish?.();
      });
    } catch (error) {
      onError?.(error as Error);
    }
  }, [start]);

  return {
    startTransition,
    isSupported: enabled,
  };
};
