#!/usr/bin/env tsx

import { purgeByTag } from '../src/lib/redis';

/**
 * Script to purge cache by tag
 * Usage: bun tsx scripts/purgeTag.ts <tag>
 */

async function main() {
  const tag = process.argv[2];
  
  if (!tag) {
    console.error('Usage: bun tsx scripts/purgeTag.ts <tag>');
    console.error('');
    console.error('Available tags:');
    console.error('  tag:articles       - All article caches');
    console.error('  tag:top-stories    - All top stories caches');
    console.error('  tag:most-popular   - All most popular caches');
    console.error('  tag:archive        - All archive caches');
    console.error('  tag:section:<name> - Specific section caches');
    console.error('  tag:product:<id>   - Specific product/article caches');
    process.exit(1);
  }
  
  try {
    console.log(`Purging cache for tag: ${tag}`);
    const startTime = Date.now();
    
    const deletedCount = await purgeByTag(tag);
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Successfully purged ${deletedCount} cache entries for tag "${tag}" in ${duration}ms`);
    
    if (deletedCount === 0) {
      console.log('ℹ️  No cache entries found for this tag');
    }
    
  } catch (error) {
    console.error('❌ Failed to purge cache:', error);
    process.exit(1);
  }
}

main().catch(console.error);
