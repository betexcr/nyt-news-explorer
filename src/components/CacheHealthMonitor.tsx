import React, { useState, useEffect } from 'react';
import { useCacheManager } from '../hooks/useAdvancedCache';
import { offlineCache } from '../lib/offlineCache';
import './CacheHealthMonitor.css';

/**
 * Cache Health Monitor Component
 * Displays real-time cache statistics and management controls
 */
export const CacheHealthMonitor: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [offlineStats, setOfflineStats] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const { invalidateAll, invalidateByType, getStats, cleanup } = useCacheManager();

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setStats(getStats());
      setOfflineStats(offlineCache.getOfflineStats());
    };

    updateStats();

    if (autoRefresh) {
      const interval = setInterval(updateStats, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [getStats, autoRefresh]);

  const handleInvalidateAll = async () => {
    if (window.confirm('Are you sure you want to clear all cache data?')) {
      invalidateAll();
      setStats(getStats());
      setOfflineStats(offlineCache.getOfflineStats());
    }
  };

  const handleInvalidateByType = (type: string) => {
    if (window.confirm(`Clear cache for ${type}?`)) {
      invalidateByType(type);
      setStats(getStats());
      setOfflineStats(offlineCache.getOfflineStats());
    }
  };

  const handleCleanup = () => {
    cleanup();
    setStats(getStats());
    setOfflineStats(offlineCache.getOfflineStats());
  };

  if (!stats) {
    return (
      <div className="cache-health-monitor">
        <div className="cache-health-header">
          <span className="cache-health-title">Cache Health</span>
          <span className="cache-health-status">Loading...</span>
        </div>
      </div>
    );
  }

  const getCacheHealthColor = (hitRatio: number) => {
    if (hitRatio >= 80) return '#4CAF50'; // Green
    if (hitRatio >= 60) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const hitRatio = stats.tanstackStats?.total > 0 
    ? ((stats.tanstackStats.fresh / stats.tanstackStats.total) * 100).toFixed(1)
    : '0';

  return (
    <div className="cache-health-monitor">
      <div 
        className="cache-health-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="cache-health-title">Cache Health</span>
        <div className="cache-health-status">
          <span 
            className="cache-health-indicator"
            style={{ backgroundColor: getCacheHealthColor(parseFloat(hitRatio)) }}
          />
          <span className="cache-health-hit-ratio">{hitRatio}%</span>
          <span className="cache-health-toggle">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="cache-health-details">
          <div className="cache-health-section">
            <h4>TanStack Query Cache</h4>
            <div className="cache-health-stats">
              <div className="cache-stat">
                <span className="cache-stat-label">Total Queries:</span>
                <span className="cache-stat-value">{stats.tanstackStats?.total || 0}</span>
              </div>
              <div className="cache-stat">
                <span className="cache-stat-label">Fresh:</span>
                <span className="cache-stat-value fresh">{stats.tanstackStats?.fresh || 0}</span>
              </div>
              <div className="cache-stat">
                <span className="cache-stat-label">Stale:</span>
                <span className="cache-stat-value stale">{stats.tanstackStats?.stale || 0}</span>
              </div>
              <div className="cache-stat">
                <span className="cache-stat-label">Invalidated:</span>
                <span className="cache-stat-value invalid">{stats.tanstackStats?.invalidated || 0}</span>
              </div>
            </div>
          </div>

          <div className="cache-health-section">
            <h4>Local Storage Cache</h4>
            <div className="cache-health-stats">
              <div className="cache-stat">
                <span className="cache-stat-label">Entries:</span>
                <span className="cache-stat-value">{stats.localStorageEntries || 0}</span>
              </div>
              <div className="cache-stat">
                <span className="cache-stat-label">Size:</span>
                <span className="cache-stat-value">{stats.totalSize || '0 KB'}</span>
              </div>
            </div>
          </div>

          <div className="cache-health-section">
            <h4>Offline Cache</h4>
            <div className="cache-health-stats">
              <div className="cache-stat">
                <span className="cache-stat-label">Status:</span>
                <span className={`cache-stat-value ${offlineStats?.isOnline ? 'online' : 'offline'}`}>
                  {offlineStats?.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="cache-stat">
                <span className="cache-stat-label">Queued Requests:</span>
                <span className="cache-stat-value">{offlineStats?.queuedRequests || 0}</span>
              </div>
              <div className="cache-stat">
                <span className="cache-stat-label">Cached Items:</span>
                <span className="cache-stat-value">{offlineStats?.cachedItems || 0}</span>
              </div>
              <div className="cache-stat">
                <span className="cache-stat-label">Cache Size:</span>
                <span className="cache-stat-value">{offlineStats?.cacheSize || '0 KB'}</span>
              </div>
            </div>
          </div>

          <div className="cache-health-section">
            <h4>Cache Management</h4>
            <div className="cache-health-controls">
              <button 
                className="cache-control-btn cleanup"
                onClick={handleCleanup}
                title="Remove expired cache entries"
              >
                Cleanup Expired
              </button>
              
              <button 
                className="cache-control-btn invalidate-search"
                onClick={() => handleInvalidateByType('search')}
                title="Clear search cache"
              >
                Clear Search
              </button>
              
              <button 
                className="cache-control-btn invalidate-top-stories"
                onClick={() => handleInvalidateByType('topStories')}
                title="Clear top stories cache"
              >
                Clear Top Stories
              </button>
              
              <button 
                className="cache-control-btn invalidate-books"
                onClick={() => handleInvalidateByType('books')}
                title="Clear books cache"
              >
                Clear Books
              </button>
              
              <button 
                className="cache-control-btn invalidate-all"
                onClick={handleInvalidateAll}
                title="Clear all cache data"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="cache-health-section">
            <h4>Settings</h4>
            <div className="cache-health-settings">
              <label className="cache-setting">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh stats
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheHealthMonitor;
