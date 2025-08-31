import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface ViewTransitionWrapperProps {
  children: React.ReactNode;
  className?: string;
  transitionName?: string;
  onEnter?: () => void;
  onExit?: () => void;
}

const ViewTransitionWrapper: React.FC<ViewTransitionWrapperProps> = ({
  children,
  className = '',
  transitionName,
  onEnter,
  onExit,
}) => {
  const location = useLocation();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapperRef.current || !transitionName) return;

    const wrapper = wrapperRef.current;
    
    // Add view transition name
    wrapper.style.viewTransitionName = transitionName;

    // Trigger enter animation
    if (onEnter) {
      onEnter();
    }

    // Add enter class for CSS animations
    wrapper.classList.add('page-enter');

    // Remove enter class after animation
    const timer = setTimeout(() => {
      wrapper.classList.remove('page-enter');
    }, 300);

    return () => {
      clearTimeout(timer);
      
      // Trigger exit animation
      if (onExit) {
        onExit();
      }

      // Add exit class for CSS animations
      wrapper.classList.add('page-exit');

      // Clean up after exit animation
      const exitTimer = setTimeout(() => {
        wrapper.classList.remove('page-exit');
        wrapper.style.viewTransitionName = '';
      }, 300);

      clearTimeout(exitTimer);
    };
  }, [location.pathname, transitionName, onEnter, onExit]);

  return (
    <div
      ref={wrapperRef}
      className={`view-transition-wrapper ${className}`}
      style={{
        opacity: 1,
        transform: 'translateY(0)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      {children}
    </div>
  );
};

export default ViewTransitionWrapper;
