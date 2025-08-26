// Netlify Function: Image Optimizer
// Usage: /.netlify/functions/img?url=<remote>&w=480&q=72&fmt=webp

const ALLOWED_HOSTS = new Set([
  'static01.nyt.com',
  'static.nyt.com',
  'www.nytimes.com',
  'nytimes.com',
]);

function isAllowed(hostname) {
  if (!hostname) return false;
  if (ALLOWED_HOSTS.has(hostname)) return true;
  // Allow any subdomain of nyt.com/nytimes.com in dev
  return /(^|\.)nyt\.com$/i.test(hostname) || /(^|\.)nytimes\.com$/i.test(hostname);
}

export const handler = async (event) => {
  try {
    const u = new URL(event.rawUrl || `https://example.com${event.path}?${event.rawQuery || ''}`);
    const target = event.queryStringParameters?.url;
    if (!target) return imageError(400, 'Missing url');

    const src = new URL(target);
    if (!isAllowed(src.hostname)) return imageError(403, 'Host not allowed');

    const width = clampInt(event.queryStringParameters?.w, 60, 1600, 480);
    const quality = clampInt(event.queryStringParameters?.q, 30, 90, 72);
    const fmt = (event.queryStringParameters?.fmt || 'webp').toLowerCase();
    const format = ['webp', 'jpeg', 'png', 'avif'].includes(fmt) ? fmt : 'webp';

    // Add a fetch timeout; on failure, fall back to redirecting to the origin URL
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 4000);
    let resp;
    try {
      resp = await fetch(src.toString(), { headers: { accept: 'image/*' }, signal: ac.signal });
    } catch (e) {
      clearTimeout(timer);
      return redirect(src.toString());
    }
    clearTimeout(timer);
    if (!resp.ok) return redirect(src.toString());
    const buffer = Buffer.from(await resp.arrayBuffer());

    let sharp;
    try { sharp = (await import('sharp')).default; } catch (e) { return binary(buffer, resp.headers.get('content-type') || 'image/jpeg'); }

    const pipeline = sharp(buffer, { failOn: false }).resize({ width, withoutEnlargement: true });
    let out;
    switch (format) {
      case 'jpeg':
        out = await pipeline.jpeg({ quality, progressive: true }).toBuffer();
        break;
      case 'png':
        out = await pipeline.png().toBuffer();
        break;
      case 'avif':
        out = await pipeline.avif({ quality }).toBuffer();
        break;
      default:
        out = await pipeline.webp({ quality }).toBuffer();
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentTypeFor(format),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
      body: out.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('img function error:', err);
    return imageError(500, err?.message || 'img function failed');
  }
};

function clampInt(v, min, max, def) {
  const n = parseInt(v ?? '', 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function imageError(status, msg) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ error: msg }),
  };
}

function binary(buffer, type) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
    body: Buffer.from(buffer).toString('base64'),
    isBase64Encoded: true,
  };
}

function redirect(url) {
  return {
    statusCode: 302,
    headers: {
      Location: url,
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
    body: '',
  };
}

function contentTypeFor(fmt) {
  if (fmt === 'webp') return 'image/webp';
  if (fmt === 'jpeg') return 'image/jpeg';
  if (fmt === 'png') return 'image/png';
  if (fmt === 'avif') return 'image/avif';
  return 'application/octet-stream';
}


