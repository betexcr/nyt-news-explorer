import React, { useState, useEffect } from 'react';
import { useErrorStore, type ErrorItem, initializeGlobalErrorHandlers } from '../store/errorStore';
import '../styles/error-catcher.css';

const ErrorCatcher: React.FC = () => {
  const { errors, isVisible, toggleVisibility, clearErrors, removeError } = useErrorStore();
  const [expandedError, setExpandedError] = useState<string | null>(null);

  // Initialize error handlers when component mounts
  useEffect(() => {
    try {
      initializeGlobalErrorHandlers();
    } catch (error) {
      console.warn('Failed to initialize error handlers:', error);
    }
  }, []);

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
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(errorText).catch(() => {
        // Fallback for browsers that don't support clipboard API
        console.warn('Clipboard API not supported, using fallback');
        fallbackCopyToClipboard(errorText);
      });
    } else {
      fallbackCopyToClipboard(errorText);
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.warn('Fallback copy failed:', err);
    }
    document.body.removeChild(textArea);
  };

  const downloadErrorLog = () => {
    if (errors.length === 0) return;

    const logContent = [
      'NYT News Explorer - Error Log',
      '================================',
      `Generated: ${new Date().toISOString()}`,
      `Total Errors: ${errors.length}`,
      '',
      ...errors.map((error, index) => {
        const errorText = [
          `[${index + 1}] ${error.type.toUpperCase()} - ${error.source}`,
          `Time: ${error.timestamp.toISOString()}`,
          `Message: ${error.message}`,
          ...(error.url ? [`URL: ${error.url}`] : []),
          ...(error.line ? [`Location: line ${error.line}, col ${error.column}`] : []),
          ...(error.stack ? [`Stack Trace:\n${error.stack}`] : []),
          ...(error.componentStack ? [`Component Stack:\n${error.componentStack}`] : []),
          '---'
        ];
        return errorText.join('\n');
      })
    ].join('\n');

    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nyt-error-log-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
            onClick={downloadErrorLog}
            className="error-download-btn"
            disabled={errors.length === 0}
            title="Download Error Log as TXT"
          >
            📥 Download Log
          </button>
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
