// Netlify Function: Fetch up to N archive articles that match today's day across recent years
// Usage: /.netlify/functions/archive-today?years=3
// Note: Uses NYT Archive API server-side to avoid large client payloads

export const handler = async (event) => {
  try {
    const apiKeyParam = event?.queryStringParameters?.apiKey;
    const apiKey = process.env.NYT_API_KEY || process.env.REACT_APP_NYT_API_KEY || apiKeyParam;
    if (!apiKey) return json(500, { error: 'Missing NYT_API_KEY' });

    const yearsParam = parseInt(event?.queryStringParameters?.years || '3', 10);
    const maxYears = Number.isFinite(yearsParam) ? Math.max(1, Math.min(12, yearsParam)) : 3;

    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();
    const currentYear = now.getFullYear();

    const START_YEAR = 1851;
    const MIN_YEAR = month < 10 ? START_YEAR + 1 : START_YEAR; // Archive starts Oct 1851

    // Build candidate years from most recent backwards
    const candidateYears = [];
    for (let i = 1; candidateYears.length < maxYears && currentYear - i >= MIN_YEAR; i += 1) {
      candidateYears.push(currentYear - i);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const promises = candidateYears.slice(0, maxYears).map(async (y) => {
      const m = y === 1851 && month < 10 ? 10 : month;
      const url = `https://api.nytimes.com/svc/archive/v1/${y}/${m}.json?api-key=${encodeURIComponent(apiKey)}`;
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return null;
        const data = await res.json();
        const docs = data?.response?.docs || [];
        const match = docs.find((d) => new Date(d.pub_date).getDate() === day) || null;
        return match;
      } catch {
        return null;
      }
    });

    const results = await Promise.allSettled(promises);
    clearTimeout(timeout);

    const picks = results
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter(Boolean)
      .slice(0, maxYears);

    return json(200, { results: picks, count: picks.length, years: candidateYears.slice(0, maxYears) });
  } catch (err) {
    const status = err?.name === 'AbortError' ? 504 : 500;
    return json(status, { error: err?.message || 'archive-today failed' });
  }
};

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}



