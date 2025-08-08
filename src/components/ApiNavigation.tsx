import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/api-navigation.css';

export interface ApiSection {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

const API_SECTIONS: ApiSection[] = [
  {
    id: 'search',
    name: 'Article Search',
    description: 'Search articles with advanced filters',
    icon: '🔍',
    path: '/search',
    color: 'var(--primary)',
  },
  {
    id: 'trending',
    name: 'Trending',
    description: 'Most popular articles',
    icon: '📈',
    path: '/trending',
    color: '#ff6b6b',
  },
  {
    id: 'top-stories',
    name: 'Top Stories',
    description: 'Latest top stories by section',
    icon: '📰',
    path: '/top-stories',
    color: '#4ecdc4',
  },
  {
    id: 'movies',
    name: 'Movie Reviews',
    description: 'Latest movie reviews and ratings',
    icon: '🎬',
    path: '/movies',
    color: '#45b7d1',
  },
  {
    id: 'books',
    name: 'Books',
    description: 'Best sellers and book reviews',
    icon: '📚',
    path: '/books',
    color: '#96ceb4',
  },
  {
    id: 'archive',
    name: 'Archive',
    description: 'Historical articles by date',
    icon: '📅',
    path: '/archive',
    color: '#feca57',
  },
  {
    id: 'api-docs',
    name: 'API Docs',
    description: 'Interactive API documentation',
    icon: '📖',
    path: '/api-docs',
    color: '#ff9ff3',
  },
];

interface ApiNavigationProps {
  className?: string;
}

const ApiNavigation: React.FC<ApiNavigationProps> = ({ className = '' }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className={`api-navigation ${className}`}>
      <div className="api-navigation-container">
        <div className="api-navigation-header">
          <h2 className="api-navigation-title">NYT APIs</h2>
          <p className="api-navigation-subtitle">
            Explore different New York Times APIs
          </p>
        </div>
        
        <div className="api-sections-grid">
          {API_SECTIONS.map((section) => {
            const isActive = currentPath === section.path;
            
            return (
              <Link
                key={section.id}
                to={section.path}
                className={`api-section-card ${isActive ? 'active' : ''}`}
                style={{ '--card-color': section.color } as React.CSSProperties}
              >
                <div className="api-section-icon">
                  <span className="icon">{section.icon}</span>
                </div>
                
                <div className="api-section-content">
                  <h3 className="api-section-name">{section.name}</h3>
                  <p className="api-section-description">
                    {section.description}
                  </p>
                </div>
                
                <div className="api-section-indicator">
                  {isActive && (
                    <div className="active-indicator" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default ApiNavigation;
