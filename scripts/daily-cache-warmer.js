#!/usr/bin/env node

/**
 * Daily Cache Warmer Script
 * Automatically pre-populates all caches with popular content
 * Runs daily to ensure optimal performance and cost savings
 */

const axios = require('axios');

// Configuration
const CONFIG = {
  BASE_URL: process.env.BASE_URL || 'https://nyt-news-explorer-nqtb4ofq3-albmunmus-projects.vercel.app',
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'nyt-admin-secure-key-2024',
  TIMEOUT: 30000, // 30 seconds per request
  BATCH_SIZE: 5, // Process 5 requests at a time
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds between retries
};

// Popular content to warm
const CACHE_WARMING_TARGETS = {
  // Top Stories - Popular sections
  topStories: [
    'home', 'technology', 'business', 'sports', 'world', 
    'politics', 'science', 'health', 'arts', 'opinion'
  ],
  
  // Most Popular - Different time periods
  mostPopular: [1, 7, 30],
  
  // Books - Popular categories
  books: [
    'hardcover-fiction', 'hardcover-nonfiction', 'trade-fiction-paperback',
    'paperback-nonfiction', 'advice-how-to-and-miscellaneous',
    'childrens-middle-grade-hardcover', 'picture-books', 'series-books',
    'young-adult-hardcover', 'combined-print-and-e-book-fiction'
  ],
  
  // Archive - Recent months
  archive: [
    { year: 2024, month: 1 },
    { year: 2023, month: 12 },
    { year: 2023, month: 11 },
    { year: 2023, month: 10 },
  ],
  
  // Search - Popular queries
  search: [
    'technology', 'politics', 'business', 'sports', 'health',
    'climate', 'economy', 'artificial intelligence', 'space', 'covid'
  ]
};

class CacheWarmer {
  constructor() {
    this.stats = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null,
      errors: []
    };
  }

  /**
   * Main cache warming function
   */
  async warmCaches() {
    console.log('🔥 Starting Daily Cache Warming...');
    console.log(`📡 Target: ${CONFIG.BASE_URL}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    
    this.stats.startTime = new Date();
    
    try {
      // Warm Top Stories
      await this.warmTopStories();
      
      // Warm Most Popular
      await this.warmMostPopular();
      
      // Warm Books
      await this.warmBooks();
      
      // Warm Archive (lightweight)
      await this.warmArchive();
      
      // Warm Search (lightweight)
      await this.warmSearch();
      
      this.stats.endTime = new Date();
      this.printResults();
      
    } catch (error) {
      console.error('❌ Cache warming failed:', error.message);
      this.stats.errors.push(error.message);
      process.exit(1);
    }
  }

  /**
   * Warm Top Stories cache
   */
  async warmTopStories() {
    console.log('\n📰 Warming Top Stories cache...');
    
    const requests = CACHE_WARMING_TARGETS.topStories.map(section => ({
      name: `Top Stories: ${section}`,
      url: `${CONFIG.BASE_URL}/api/v1/articles/top-stories/${section}`,
      method: 'GET'
    }));
    
    await this.processBatch(requests);
  }

  /**
   * Warm Most Popular cache
   */
  async warmMostPopular() {
    console.log('\n🔥 Warming Most Popular cache...');
    
    const requests = CACHE_WARMING_TARGETS.mostPopular.map(period => ({
      name: `Most Popular: ${period} days`,
      url: `${CONFIG.BASE_URL}/api/v1/articles/most-popular/${period}`,
      method: 'GET'
    }));
    
    await this.processBatch(requests);
  }

  /**
   * Warm Books cache
   */
  async warmBooks() {
    console.log('\n📚 Warming Books cache...');
    
    const requests = CACHE_WARMING_TARGETS.books.map(list => ({
      name: `Books: ${list}`,
      url: `${CONFIG.BASE_URL}/api/v1/books/best-sellers/${list}`,
      method: 'GET'
    }));
    
    await this.processBatch(requests);
  }

  /**
   * Warm Archive cache (lightweight)
   */
  async warmArchive() {
    console.log('\n📜 Warming Archive cache...');
    
    const requests = CACHE_WARMING_TARGETS.archive.slice(0, 2).map(({ year, month }) => ({
      name: `Archive: ${year}-${month}`,
      url: `${CONFIG.BASE_URL}/api/v1/articles/archive/${year}/${month}?limit=10`,
      method: 'GET'
    }));
    
    await this.processBatch(requests);
  }

  /**
   * Warm Search cache (lightweight)
   */
  async warmSearch() {
    console.log('\n🔍 Warming Search cache...');
    
    const requests = CACHE_WARMING_TARGETS.search.slice(0, 5).map(query => ({
      name: `Search: ${query}`,
      url: `${CONFIG.BASE_URL}/api/v1/articles/search?q=${encodeURIComponent(query)}&limit=10`,
      method: 'GET'
    }));
    
    await this.processBatch(requests);
  }

  /**
   * Process a batch of requests
   */
  async processBatch(requests) {
    const batches = this.chunkArray(requests, CONFIG.BATCH_SIZE);
    
    for (const batch of batches) {
      const promises = batch.map(request => this.makeRequest(request));
      await Promise.allSettled(promises);
      
      // Small delay between batches
      await this.delay(1000);
    }
  }

  /**
   * Make a single request with retry logic
   */
  async makeRequest(request) {
    this.stats.total++;
    
    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        console.log(`  📡 ${request.name} (attempt ${attempt})`);
        
        const response = await axios({
          method: request.method,
          url: request.url,
          timeout: CONFIG.TIMEOUT,
          headers: {
            'User-Agent': 'Daily-Cache-Warmer/1.0',
            'X-Cache-Warmer': 'true'
          }
        });
        
        const cacheStatus = response.headers['x-cache'] || 'UNKNOWN';
        console.log(`  ✅ ${request.name} - ${response.status} (${cacheStatus})`);
        
        this.stats.successful++;
        return response;
        
      } catch (error) {
        if (attempt === CONFIG.MAX_RETRIES) {
          console.log(`  ❌ ${request.name} - Failed after ${CONFIG.MAX_RETRIES} attempts: ${error.message}`);
          this.stats.failed++;
          this.stats.errors.push(`${request.name}: ${error.message}`);
        } else {
          console.log(`  ⚠️  ${request.name} - Attempt ${attempt} failed, retrying...`);
          await this.delay(CONFIG.RETRY_DELAY * attempt);
        }
      }
    }
  }

  /**
   * Print final results
   */
  printResults() {
    const duration = this.stats.endTime - this.stats.startTime;
    const durationMinutes = Math.round(duration / 1000 / 60);
    
    console.log('\n🎯 Cache Warming Results:');
    console.log('========================');
    console.log(`📊 Total Requests: ${this.stats.total}`);
    console.log(`✅ Successful: ${this.stats.successful}`);
    console.log(`❌ Failed: ${this.stats.failed}`);
    console.log(`⏱️  Duration: ${durationMinutes} minutes`);
    console.log(`🎯 Success Rate: ${Math.round((this.stats.successful / this.stats.total) * 100)}%`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.stats.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🔥 Cache warming completed!');
    
    // Exit with appropriate code
    process.exit(this.stats.failed > 0 ? 1 : 0);
  }

  /**
   * Utility: Split array into chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility: Delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run cache warming if called directly
if (require.main === module) {
  const warmer = new CacheWarmer();
  warmer.warmCaches().catch(error => {
    console.error('❌ Cache warming failed:', error);
    process.exit(1);
  });
}

module.exports = { CacheWarmer, CONFIG };
