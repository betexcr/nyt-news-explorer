import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

interface ViewTransitionsProviderProps {
  children: React.ReactNode;
}

const ViewTransitionsProvider: React.FC<ViewTransitionsProviderProps> = ({ children }) => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    // Check if View Transitions API is supported
    if (!document.startViewTransition) {
      return;
    }

    // Handle navigation transitions
    const handleNavigation = () => {
      if (isNavigatingRef.current) return;
      
      isNavigatingRef.current = true;
      
      // Start view transition
      const transition = document.startViewTransition(() => {
        // The transition will complete when this promise resolves
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
    };

    // Trigger transition on route change
    if (navigationType !== 'POP') {
      handleNavigation();
    }
  }, [location.pathname, navigationType]);

  return <>{children}</>;
};

export default ViewTransitionsProvider;
