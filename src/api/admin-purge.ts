import { Request, Response } from 'express';
import { purgeByTag } from '../lib/redis';
import { z } from 'zod';

// Schema for purge request
const purgeRequestSchema = z.object({
  tag: z.string().min(1, 'Tag is required'),
});

export async function purgeCache(req: Request, res: Response) {
  try {
    // Parse request body
    const { tag } = purgeRequestSchema.parse(req.body);
    
    // In production, you should add authentication here
    // For now, we'll check for a simple API key
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.ADMIN_API_KEY;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Purge cache by tag
    const deletedCount = await purgeByTag(tag);
    
    return res.json({
      success: true,
      tag,
      deletedKeys: deletedCount,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Purge API error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: error.errors,
      });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET endpoint to list available tags (for debugging)
export async function listAvailableTags(req: Request, res: Response) {
  try {
    // Check authorization
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.ADMIN_API_KEY;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // In a real implementation, you'd fetch available tags from Redis
    // For now, return common tags
    const availableTags = [
      'tag:articles',
      'tag:top-stories',
      'tag:most-popular',
      'tag:archive',
    ];
    
    return res.json({
      availableTags,
      usage: 'POST to /api/admin/purge with {"tag": "tag-name"} to purge cache',
    });
    
  } catch (error) {
    console.error('Purge list API error:', error);
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
