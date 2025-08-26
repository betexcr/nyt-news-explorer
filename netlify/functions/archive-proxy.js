// Netlify Function: Proxy NYT Archive API to avoid CORS from the browser
// Usage: /.netlify/functions/archive-proxy?year=YYYY&month=M

export const handler = async (event) => {
  try {
    const apiKey = process.env.NYT_API_KEY || process.env.REACT_APP_NYT_API_KEY || event?.queryStringParameters?.apiKey;
    if (!apiKey) return json(500, { error: 'Missing NYT_API_KEY' });

    const year = Number(event?.queryStringParameters?.year);
    const month = Number(event?.queryStringParameters?.month);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return json(400, { error: 'Invalid year or month' });
    }

    const url = `https://api.nytimes.com/svc/archive/v1/${year}/${month}.json?api-key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return json(res.status, { error: `Upstream HTTP ${res.status}` });
    const data = await res.json();
    const docs = Array.isArray(data?.response?.docs) ? data.response.docs : [];
    return json(200, { docs, year, month, count: docs.length });
  } catch (err) {
    const status = err?.name === 'AbortError' ? 504 : 500;
    return json(status, { error: err?.message || 'archive-proxy failed' });
  }
};

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}


