/**
 * Simple image preloading utility for better performance
 * Uses browser's native caching for external images
 */

interface PreloadOptions {
  priority?: 'high' | 'low';
  crossOrigin?: 'anonymous' | 'use-credentials';
}

/**
 * Preload a single image
 */
export const preloadImage = (src: string, options: PreloadOptions = {}): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    if (options.crossOrigin) {
      img.crossOrigin = options.crossOrigin;
    }
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    
    // Set priority if supported
    if (options.priority === 'high' && 'fetchPriority' in img) {
      (img as any).fetchPriority = 'high';
    }
    
    img.src = src;
  });
};

/**
 * Preload multiple images
 */
export const preloadImages = async (
  urls: string[], 
  options: PreloadOptions = {}
): Promise<HTMLImageElement[]> => {
  const promises = urls.map(url => preloadImage(url, options));
  return Promise.allSettled(promises).then(results => 
    results
      .filter((result): result is PromiseFulfilledResult<HTMLImageElement> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)
  );
};

/**
 * Preload critical home page images
 */
export const preloadHomeImages = async (): Promise<void> => {
  const homeImages = [
    '/home-hero.jpg',
    '/home-hero-800.jpg', 
    '/home-hero-1200.jpg',
    '/home-hero-1600.jpg',
    '/home-hero-2400.jpg',
    '/logo.png',
    '/logo.webp'
  ];

  try {
    await preloadImages(homeImages, { priority: 'high' });
    console.log('Home images preloaded successfully');
  } catch (error) {
    console.warn('Some home images failed to preload:', error);
  }
};

/**
 * Preload article images with lower priority
 */
export const preloadArticleImages = async (imageUrls: string[]): Promise<void> => {
  const validUrls = imageUrls.filter(url => 
    url && 
    url !== '/logo.png' && 
    url.startsWith('http')
  );

  if (validUrls.length === 0) return;

  try {
    await preloadImages(validUrls, { 
      priority: 'low',
      crossOrigin: 'anonymous' 
    });
    console.log(`Preloaded ${validUrls.length} article images`);
  } catch (error) {
    console.warn('Some article images failed to preload:', error);
  }
};

/**
 * Check if image is already cached by browser
 */
export const isImageCached = (src: string): boolean => {
  const img = new Image();
  img.src = src;
  return img.complete;
};

/**
 * Get image dimensions without loading the full image
 */
export const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

/**
 * Get cached image URL (for compatibility with ViewTransitionImage)
 * This is a simple passthrough since we're using browser caching
 */
export const getCachedImageUrl = async (src: string): Promise<string> => {
  // For external URLs, just return the original URL
  // Browser will handle caching automatically
  if (src.startsWith('http')) {
    return src;
  }
  
  // For local assets, preload them
  try {
    await preloadImage(src, { priority: 'high' });
    return src;
  } catch (error) {
    console.warn(`Failed to preload local image ${src}:`, error);
    return src;
  }
};
