import type { NytArticle } from '../types/nyt';
import type { TopStory, MostPopularArticle, ArchiveArticle } from '../types/nyt.other';

function buildImage(url?: string) {
  const safe = url && /^(https?:)?\/\//i.test(url) ? url : url ? `https://static01.nyt.com/${url.replace(/^\/+/, '')}` : undefined;
  return safe ? { url: safe, height: 0, width: 0 } : undefined;
}

function buildOptimized(url?: string, width: number = 480) {
  const base = buildImage(url)?.url;
  return base ? { url: `/.netlify/functions/img?url=${encodeURIComponent(base)}&w=${width}&q=72&fmt=webp`, height: 0, width } : undefined;
}

function pickSmallestTopStoryUrl(story: TopStory): string | undefined {
  const list = Array.isArray(story.multimedia) ? (story.multimedia as any[]) : [];
  if (!list.length) return undefined;
  const sorted = list
    .filter((m) => typeof m?.width === 'number' && typeof m?.url === 'string')
    .sort((a, b) => (a.width || 0) - (b.width || 0));
  return (sorted[0]?.url as string) || (list[0]?.url as string) || undefined;
}

export function normalizeTopStory(story: TopStory): NytArticle {
  const mm = story.multimedia?.[0] as any;
  const imageUrl = (mm?.legacy?.xlarge as string) || (mm?.url as string) || undefined;
  const smallestUrl = pickSmallestTopStoryUrl(story) || imageUrl;
  return {
    web_url: story.url,
    uri: story.uri,
    snippet: story.abstract || '',
    lead_paragraph: story.abstract || '',
    source: 'The New York Times',
    multimedia: {
      // Keep default image unoptimized; only generate a small thumbnail
      default: buildImage(imageUrl),
      thumbnail: buildOptimized(smallestUrl, 160) || buildImage(smallestUrl),
    } as any,
    headline: { main: story.title },
    keywords: [],
    pub_date: story.published_date || story.updated_date || new Date().toISOString(),
    section_name: story.section,
    byline: story.byline ? { original: story.byline } : undefined,
  };
}

export function normalizeMostPopular(article: MostPopularArticle): NytArticle {
  const media = article.media?.[0];
  const mm = (media && (media['media-metadata'] || [])) || [];
  const preferred =
    mm.find((m) => /^(Large|superJumbo|mediumThreeByTwo440)$/i.test(m.format)) ||
    mm.find((m) => /^(mediumThreeByTwo210|Large Thumbnail)$/i.test(m.format)) ||
    mm.find((m) => /^(Standard Thumbnail)$/i.test(m.format)) ||
    mm[0];
  const imageUrl = preferred?.url;
  return {
    web_url: article.url,
    uri: String(article.id),
    snippet: article.abstract || '',
    lead_paragraph: article.abstract || '',
    source: article.source || 'The New York Times',
    multimedia: {
      default: buildImage(imageUrl),
      thumbnail: buildOptimized(imageUrl, 160) || buildImage(imageUrl),
    } as any,
    headline: { main: article.title },
    keywords: [],
    pub_date: article.published_date || new Date().toISOString(),
    section_name: article.section,
    byline: article.byline ? { original: article.byline } : undefined,
  };
}

export function normalizeArchive(article: ArchiveArticle): NytArticle {
  const mm: any[] = (article as any).multimedia || [];
  const first = mm[0] as any;
  const imageUrl = first?.url as string | undefined;
  return {
    web_url: article.web_url,
    uri: article.uri,
    snippet: article.snippet || '',
    lead_paragraph: article.lead_paragraph || '',
    source: article.source || 'The New York Times',
    multimedia: {
      default: buildImage(imageUrl),
      thumbnail: buildOptimized(imageUrl, 160) || buildImage(imageUrl),
    } as any,
    headline: { main: article.headline?.main || article.abstract || '' },
    keywords: (article.keywords || []) as any,
    pub_date: article.pub_date || new Date().toISOString(),
    section_name: article.section_name,
    byline: article.byline?.original ? { original: article.byline.original } : undefined,
  };
}


