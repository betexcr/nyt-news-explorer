/**
 * Vercel Cron Job: Daily Cache Warming
 * Runs daily at 6:00 AM UTC to warm all caches
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-cache-warm",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 */

import { CacheWarmer, CONFIG } from '../../scripts/daily-cache-warmer.js';

export default async function handler(req, res) {
  // Only allow POST requests (Vercel Cron sends POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify this is a legitimate cron request (optional security)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('⚠️ Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🔥 Vercel Cron: Starting daily cache warming...');
  
  try {
    // Update CONFIG with current environment
    CONFIG.BASE_URL = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://nyt-news-explorer-nqtb4ofq3-albmunmus-projects.vercel.app';
    
    const warmer = new CacheWarmer();
    
    // Run cache warming
    await warmer.warmCaches();
    
    const results = {
      success: true,
      timestamp: new Date().toISOString(),
      stats: warmer.stats,
      message: 'Cache warming completed successfully'
    };
    
    console.log('✅ Vercel Cron: Cache warming completed');
    return res.status(200).json(results);
    
  } catch (error) {
    console.error('❌ Vercel Cron: Cache warming failed:', error);
    
    const results = {
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Cache warming failed'
    };
    
    return res.status(500).json(results);
  }
}
