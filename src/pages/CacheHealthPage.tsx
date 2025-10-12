import React, { useState, useEffect } from 'react';
import { getCacheStats } from '../middleware/cacheLog';

interface CacheStats {
  hits: number;
  misses: number;
  stale: number;
  reval: number;
  totalRequests: number;
  hitRatio: number;
}

export default function CacheHealthPage() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const cacheStats = getCacheStats();
        setStats(cacheStats);
      } catch (err) {
        setError('Failed to fetch cache statistics');
        console.error('Cache stats error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Cache Health Monitor</h1>
        <div className="text-center">Loading cache statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Cache Health Monitor</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Cache Health Monitor</h1>
        <div className="text-center">No cache statistics available</div>
      </div>
    );
  }

  const hitRatioColor = stats.hitRatio >= 80 ? 'text-green-600' : 
                       stats.hitRatio >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Cache Health Monitor</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Requests</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalRequests}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Cache Hits</h3>
          <p className="text-3xl font-bold text-green-600">{stats.hits}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Cache Misses</h3>
          <p className="text-3xl font-bold text-red-600">{stats.misses}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Hit Ratio</h3>
          <p className={`text-3xl font-bold ${hitRatioColor}`}>
            {stats.hitRatio.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Stale Responses</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.stale}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Revalidations</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.reval}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Cache Performance</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span>Hit Ratio</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    stats.hitRatio >= 80 ? 'bg-green-500' : 
                    stats.hitRatio >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(stats.hitRatio, 100)}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{stats.hitRatio.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Cache Efficiency</span>
            <span className={`text-sm font-medium ${
              stats.hitRatio >= 80 ? 'text-green-600' : 
              stats.hitRatio >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {stats.hitRatio >= 80 ? 'Excellent' : 
               stats.hitRatio >= 60 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 text-sm text-gray-600">
        <p>Statistics are updated every 30 seconds. Higher hit ratios indicate better cache performance.</p>
        <p className="mt-2">
          <strong>Target:</strong> 80%+ hit ratio for optimal performance
        </p>
      </div>
    </div>
  );
}
