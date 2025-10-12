import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  
  // Only process image requests
  if (!url.pathname.match(/\.(jpg|jpeg|png|webp|avif)$/i)) {
    return;
  }

  // Get the original image URL from query params
  const imageUrl = url.searchParams.get('url');
  if (!imageUrl) {
    return new Response('Missing image URL', { status: 400 });
  }

  // Validate the URL is from NYT or trusted sources
  const allowedDomains = [
    'nytimes.com',
    'static01.nyt.com',
    's1.nyt.com',
    's2.nyt.com',
    's3.nyt.com',
    's4.nyt.com',
    's5.nyt.com'
  ];
  
  const imageUrlObj = new URL(imageUrl);
  if (!allowedDomains.some(domain => imageUrlObj.hostname.includes(domain))) {
    return new Response('Unauthorized image source', { status: 403 });
  }

  // Get optimization parameters
  const width = url.searchParams.get('w') || '800';
  const quality = url.searchParams.get('q') || '80';
  const format = url.searchParams.get('f') || 'webp';

  // Create optimized image URL
  const optimizedUrl = new URL(imageUrl);
  optimizedUrl.searchParams.set('w', width);
  optimizedUrl.searchParams.set('q', quality);
  optimizedUrl.searchParams.set('f', format);

  try {
    // Fetch the optimized image
    const imageResponse = await fetch(optimizedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Netlify-Image-Optimizer/1.0)',
        'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8'
      }
    });

    if (!imageResponse.ok) {
      return new Response('Failed to fetch image', { status: imageResponse.status });
    }

    // Create response with optimized headers
    const response = new Response(imageResponse.body, {
      status: imageResponse.status,
      headers: {
        'Content-Type': imageResponse.headers.get('Content-Type') || 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept-Encoding',
        'X-Optimized-By': 'Netlify-Edge',
        'X-Original-Size': imageResponse.headers.get('Content-Length') || 'unknown'
      }
    });

    return response;
  } catch (error) {
    console.error('Image optimization error:', error);
    return new Response('Image optimization failed', { status: 500 });
  }
};

