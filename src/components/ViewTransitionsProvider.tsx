import React, { createContext, useContext, useMemo, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigationType } from 'react-router-dom';

type Ctx = {
  start(cb: () => void): void;
  enabled: boolean;
};

const VTContext = createContext<Ctx>({ start: (cb) => cb(), enabled: false });

interface ViewTransitionsProviderProps {
  children: React.ReactNode;
}

export function ViewTransitionsProvider({ children }: ViewTransitionsProviderProps) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const isNavigatingRef = useRef(false);

  const enabled =
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const start = useCallback((cb: () => void) => {
    if (!enabled) return cb();
    (document as any).startViewTransition(() => cb());
  }, [enabled]);

  const value = useMemo(() => ({ start, enabled }), [start, enabled]);

  useEffect(() => {
    // Handle automatic route transitions
    if (!enabled || isNavigatingRef.current) return;
    
    isNavigatingRef.current = true;
    
    // Start view transition for route changes
    const transition = document.startViewTransition(() => {
      return new Promise<void>((resolve) => {
        // Small delay to ensure DOM updates are complete
        setTimeout(resolve, 50);
      });
    });

    // Handle transition completion
    transition.finished.then(() => {
      isNavigatingRef.current = false;
    }).catch(() => {
      isNavigatingRef.current = false;
    });
  }, [location.pathname, navigationType, enabled]);

  return <VTContext.Provider value={value}>{children}</VTContext.Provider>;
}

export const useViewTransitions = () => useContext(VTContext);

// Keep the old export for backward compatibility
export default ViewTransitionsProvider;
