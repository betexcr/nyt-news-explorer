import React from 'react';
import { type ViewMode } from '../store/searchStore';
import { useViewTransitionState } from '../hooks/useViewTransitionState';
import '../styles/view-toggle.css';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onViewChange }) => {
  const { updateState } = useViewTransitionState();

  const handleViewChange = (mode: ViewMode) => {
    updateState(() => {
      onViewChange(mode);
    }, {
      onStart: () => {
        // Add morphing class to the results container
        const resultsContainer = document.querySelector('.results-container');
        if (resultsContainer) {
          resultsContainer.classList.add('morphing');
        }
      },
      onFinish: () => {
        // Remove morphing class after transition
        const resultsContainer = document.querySelector('.results-container');
        if (resultsContainer) {
          resultsContainer.classList.remove('morphing');
        }
      }
    });
  };

  return (
    <div className="view-toggle">
      <div className="toggle-buttons">
        <button
          className={`button ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => handleViewChange('grid')}
          aria-label="Grid view"
          title="Grid view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 1h6v6H1V1zm0 8h6v6H1V9zm8-8h6v6H9V1zm0 8h6v6H9V9z"/>
          </svg>
        </button>
        <button
          className={`button ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => handleViewChange('list')}
          aria-label="List view"
          title="List view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"/>
          </svg>
        </button>
        <button
          className={`button ${viewMode === 'table' ? 'active' : ''}`}
          onClick={() => handleViewChange('table')}
          aria-label="Table view"
          title="Table view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 1h14v2H1V1zm0 4h14v2H1V5zm0 4h14v2H1V9zm0 4h14v2H1v-2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ViewToggle; 