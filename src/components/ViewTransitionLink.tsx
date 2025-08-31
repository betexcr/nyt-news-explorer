import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { useViewTransition } from '../hooks/useViewTransition';

interface ViewTransitionLinkProps extends Omit<LinkProps, 'onClick'> {
  children: React.ReactNode;
  viewTransitionName?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

const ViewTransitionLink: React.FC<ViewTransitionLinkProps> = ({
  children,
  viewTransitionName,
  onClick,
  ...props
}) => {
  const { startTransition } = useViewTransition();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(event);
    }

    // Add view transition name to the clicked element if specified
    if (viewTransitionName && event.currentTarget) {
      event.currentTarget.style.viewTransitionName = viewTransitionName;
    }

    // Start view transition for navigation
    startTransition(() => {
      // The navigation will happen automatically via React Router
      // We just need to ensure the transition starts
    });
  };

  return (
    <Link {...props} onClick={handleClick}>
      {children}
    </Link>
  );
};

export default ViewTransitionLink;
