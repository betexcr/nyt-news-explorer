import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { useViewTransition } from '../hooks/useViewTransition';

interface ViewTransitionLinkProps extends Omit<LinkProps, 'onClick'> {
  children: React.ReactNode;
  viewTransitionName?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  // Enhanced props for dynamic naming
  articleId?: string;
  elementType?: 'container' | 'image' | 'title' | 'byline' | 'section';
}

const ViewTransitionLink: React.FC<ViewTransitionLinkProps> = ({
  children,
  viewTransitionName,
  onClick,
  articleId,
  elementType = 'container',
  ...props
}) => {
  const { startTransition } = useViewTransition();

  // Generate dynamic view transition name based on article ID and element type
  const getDynamicViewTransitionName = () => {
    if (viewTransitionName) return viewTransitionName;
    if (articleId) {
      switch (elementType) {
        case 'image':
          return `article-img-${articleId}`;
        case 'title':
          return `article-title-${articleId}`;
        case 'byline':
          return `article-byline-${articleId}`;
        case 'section':
          return `article-section-${articleId}`;
        case 'container':
        default:
          return `article-${articleId}`;
      }
    }
    return undefined;
  };

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(event);
    }

    // Add view transition name to the clicked element
    const transitionName = getDynamicViewTransitionName();
    if (transitionName && event.currentTarget) {
      event.currentTarget.style.viewTransitionName = transitionName;
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
