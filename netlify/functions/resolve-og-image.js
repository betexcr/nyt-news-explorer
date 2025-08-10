// Netlify Function: Resolve OG image for a given article URL
// Usage: /.netlify/functions/resolve-og-image?url=<encoded_article_url>

export const handler = async (event) => {
  try {
    const url = event?.queryStringParameters?.url;
    if (!url || !/^https?:\/\//i.test(url)) {
      return json(400, { error: 'Missing or invalid url parameter' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // Pretend to be a regular browser so NYT serves full HTML
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return json(res.status, { error: `Upstream error: ${res.status}` });
    }

    const html = await res.text();
    const og = extractOgImage(html);
    if (og) return json(200, { image: normalizeUrl(og), source: 'og' });

    const tm = extractTimesMachineImage(html);
    if (tm) return json(200, { image: normalizeUrl(tm), source: 'timesmachine' });

    return json(404, { error: 'Image not found' });
  } catch (err) {
    const status = err?.name === 'AbortError' ? 504 : 500;
    return json(status, { error: err?.message || 'Resolver failed' });
  }
};

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

function extractOgImage(html) {
  // Try common meta tags
  const patterns = [
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["'][^>]*>/i,
    /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["'][^>]*>/i,
    /<link\s+rel=["']image_src["']\s+href=["']([^"']+)["'][^>]*>/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

function extractTimesMachineImage(html) {
  const re = /(https?:\/\/s1\.nyt\.com\/timesmachine\/pages\/[^"'>\s]+?\.(?:png|jpg|jpeg))(?:\?[^"'>\s]*)?/i;
  const m = html.match(re);
  return m ? m[1] : null;
}

function normalizeUrl(u) {
  // Ensure we return https URLs where possible
  if (u.startsWith('//')) return `https:${u}`;
  return u;
}


