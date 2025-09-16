import { useCallback } from 'react';
import { useViewTransitions } from '../components/ViewTransitionsProvider';

/**
 * Hook for wrapping state changes in view transitions
 * Useful for sort changes, section changes, view mode toggles, etc.
 */
export const useViewTransitionState = () => {
  const { start } = useViewTransitions();

  const updateState = useCallback((
    stateUpdater: () => void,
    options?: {
      onStart?: () => void;
      onFinish?: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    const { onStart, onFinish, onError } = options || {};

    try {
      onStart?.();
      
      start(() => {
        stateUpdater();
        onFinish?.();
      });
    } catch (error) {
      onError?.(error as Error);
    }
  }, [start]);

  const staggerItems = useCallback((
    items: any[],
    stateUpdater: (items: any[]) => void,
    options?: {
      staggerDelay?: number;
      onStart?: () => void;
      onFinish?: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    const { staggerDelay = 50, onStart, onFinish, onError } = options || {};

    try {
      onStart?.();
      
      start(() => {
        stateUpdater(items);
        
        // Apply staggered animation delays
        items.forEach((_, index) => {
          const element = document.querySelector(`[data-item-index="${index}"]`);
          if (element) {
            (element as HTMLElement).style.animationDelay = `${index * staggerDelay}ms`;
          }
        });
        
        onFinish?.();
      });
    } catch (error) {
      onError?.(error as Error);
    }
  }, [start]);

  return {
    updateState,
    staggerItems,
  };
};
