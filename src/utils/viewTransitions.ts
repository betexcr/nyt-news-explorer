// View Transitions utility functions

/**
 * Check if View Transitions API is supported
 */
export const isViewTransitionsSupported = (): boolean => {
  return typeof document !== 'undefined' && !!document.startViewTransition;
};

/**
 * Start a view transition with a callback
 */
export const startViewTransition = (
  callback: () => void | Promise<void>,
  options: {
    onStart?: () => void;
    onFinish?: () => void;
    onError?: (error: Error) => void;
  } = {}
): void => {
  if (!isViewTransitionsSupported()) {
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
};

/**
 * Set view transition name on an element
 */
export const setViewTransitionName = (
  element: HTMLElement | null,
  name: string
): void => {
  if (element && isViewTransitionsSupported()) {
    element.style.viewTransitionName = name;
  }
};

/**
 * Clear view transition name from an element
 */
export const clearViewTransitionName = (element: HTMLElement | null): void => {
  if (element && isViewTransitionsSupported()) {
    element.style.viewTransitionName = '';
  }
};

/**
 * Add view transition name to multiple elements
 */
export const addViewTransitionNames = (
  elements: Array<{ element: HTMLElement | null; name: string }>
): void => {
  elements.forEach(({ element, name }) => {
    setViewTransitionName(element, name);
  });
};

/**
 * Remove view transition names from multiple elements
 */
export const removeViewTransitionNames = (
  elements: Array<HTMLElement | null>
): void => {
  elements.forEach(element => {
    clearViewTransitionName(element);
  });
};
