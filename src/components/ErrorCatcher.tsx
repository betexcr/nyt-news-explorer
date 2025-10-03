import React, { useState } from 'react';
import { useErrorStore, type ErrorItem } from '../store/errorStore';
import '../styles/error-catcher.css';

const ErrorCatcher: React.FC = () => {
  const { errors, isVisible, toggleVisibility, clearErrors, removeError } = useErrorStore();
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const getErrorIcon = (type: ErrorItem['type']) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❓';
    }
  };

  const getErrorColor = (type: ErrorItem['type']) => {
    switch (type) {
      case 'error':
        return '#ff6b6b';
      case 'warning':
        return '#f39c12';
      case 'info':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(timestamp);
  };

  const copyErrorToClipboard = (error: ErrorItem) => {
    const errorText = `Error: ${error.message}\nType: ${error.type}\nSource: ${error.source}\nTimestamp: ${error.timestamp}\n${error.stack ? `Stack: ${error.stack}` : ''}`;
    navigator.clipboard.writeText(errorText);
  };

  if (!isVisible) {
    return (
      <div className="error-catcher-toggle">
        <button
          onClick={toggleVisibility}
          className="error-toggle-btn"
          title="Show Error Catcher"
        >
          🐛 {errors.length > 0 && <span className="error-count">{errors.length}</span>}
        </button>
      </div>
    );
  }

  return (
    <div className="error-catcher">
      <div className="error-catcher-header">
        <h3>🐛 Error Catcher</h3>
        <div className="error-catcher-controls">
          <button
            onClick={clearErrors}
            className="error-clear-btn"
            disabled={errors.length === 0}
            title="Clear All Errors"
          >
            🗑️ Clear
          </button>
          <button
            onClick={toggleVisibility}
            className="error-close-btn"
            title="Hide Error Catcher"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="error-catcher-content">
        {errors.length === 0 ? (
          <div className="error-empty">
            <p>🎉 No errors! Everything looks good.</p>
          </div>
        ) : (
          <div className="error-list">
            {errors.map((error) => (
              <div
                key={error.id}
                className={`error-item ${expandedError === error.id ? 'expanded' : ''}`}
                style={{ borderLeftColor: getErrorColor(error.type) }}
              >
                <div
                  className="error-item-header"
                  onClick={() => setExpandedError(expandedError === error.id ? null : error.id)}
                >
                  <div className="error-item-main">
                    <span className="error-icon">{getErrorIcon(error.type)}</span>
                    <span className="error-message">{error.message}</span>
                    <span className="error-source">{error.source}</span>
                  </div>
                  <div className="error-item-meta">
                    <span className="error-time">{formatTimestamp(error.timestamp)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeError(error.id);
                      }}
                      className="error-remove-btn"
                      title="Remove Error"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {expandedError === error.id && (
                  <div className="error-item-details">
                    <div className="error-detail-section">
                      <strong>Type:</strong> {error.type}
                    </div>
                    <div className="error-detail-section">
                      <strong>Source:</strong> {error.source}
                    </div>
                    {error.url && (
                      <div className="error-detail-section">
                        <strong>URL:</strong> {error.url}
                        {error.line && (
                          <span> (line {error.line}, col {error.column})</span>
                        )}
                      </div>
                    )}
                    {error.stack && (
                      <div className="error-detail-section">
                        <strong>Stack Trace:</strong>
                        <pre className="error-stack">{error.stack}</pre>
                      </div>
                    )}
                    {error.componentStack && (
                      <div className="error-detail-section">
                        <strong>Component Stack:</strong>
                        <pre className="error-stack">{error.componentStack}</pre>
                      </div>
                    )}
                    <div className="error-detail-actions">
                      <button
                        onClick={() => copyErrorToClipboard(error)}
                        className="error-copy-btn"
                        title="Copy Error Details"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorCatcher;
