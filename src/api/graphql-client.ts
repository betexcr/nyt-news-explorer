import axios from 'axios';
import type { Book, ArchiveArticle } from '../types/nyt.other';

const GRAPHQL_ENDPOINT = process.env.REACT_APP_GRAPHQL_ENDPOINT || 'http://localhost:3000/api/v1/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function gqlRequest<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const res = await axios.post<GraphQLResponse<T>>(GRAPHQL_ENDPOINT, { query, variables }, {
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
  });
  if (res.data.errors && res.data.errors.length) {
    throw new Error(res.data.errors.map(e => e.message).join('; '));
  }
  if (!res.data.data) throw new Error('No data returned from GraphQL');
  return res.data.data;
}

function transformGraphQLBook(b: any): Book {
  // Map camelCase GraphQL fields to our snake_case Book type
  return {
    rank: b.rank ?? 0,
    rank_last_week: b.rankLastWeek ?? b.rank_last_week ?? 0,
    weeks_on_list: b.weeksOnList ?? b.weeks_on_list ?? 0,
    asterisk: b.asterisk ?? 0,
    dagger: b.dagger ?? 0,
    primary_isbn10: b.primaryIsbn10 ?? b.primary_isbn10 ?? '',
    primary_isbn13: b.primaryIsbn13 ?? b.primary_isbn13 ?? '',
    publisher: b.publisher ?? '',
    description: b.description ?? '',
    price: b.price ?? '0.00',
    title: b.title ?? '',
    author: b.author ?? '',
    contributor: b.contributor ?? '',
    contributor_note: b.contributorNote ?? b.contributor_note ?? '',
    book_image: b.bookImage ?? b.book_image ?? '',
    book_image_width: b.bookImageWidth ?? b.book_image_width ?? 0,
    book_image_height: b.bookImageHeight ?? b.book_image_height ?? 0,
    amazon_product_url: b.amazonProductUrl ?? b.amazon_product_url ?? '',
    age_group: b.ageGroup ?? b.age_group ?? '',
    book_review_link: b.bookReviewLink ?? b.book_review_link ?? '',
    first_chapter_link: b.firstChapterLink ?? b.first_chapter_link ?? '',
    sunday_review_link: b.sundayReviewLink ?? b.sunday_review_link ?? '',
    article_chapter_link: b.articleChapterLink ?? b.article_chapter_link ?? '',
    isbns: Array.isArray(b.isbns) ? b.isbns.map((i: any) => ({ isbn10: i.isbn10 ?? '', isbn13: i.isbn13 ?? '' })) : [],
    buy_links: Array.isArray(b.buyLinks ?? b.buy_links) ? (b.buyLinks ?? b.buy_links).map((l: any) => ({ name: l.name ?? '', url: l.url ?? '' })) : [],
    book_uri: b.bookUri ?? b.book_uri ?? '',
  };
}

export async function fetchBestsellers(list: string, date: string): Promise<Book[]> {
  const isCurrent = date === 'current' || !date;
  const query = isCurrent
    ? `query Bestsellers($list: String!){ bestsellers(list: $list){ listName displayName updated books { rank rankLastWeek weeksOnList asterisk dagger primaryIsbn10 primaryIsbn13 publisher description price title author contributor contributorNote bookImage bookImageWidth bookImageHeight amazonProductUrl ageGroup bookReviewLink firstChapterLink sundayReviewLink articleChapterLink isbns { isbn10 isbn13 } buyLinks { name url } bookUri } } }`
    : `query BestsellersByDate($list: String!, $date: String!){ bestsellersByDate(list: $list, date: $date){ listName displayName updated books { rank rankLastWeek weeksOnList asterisk dagger primaryIsbn10 primaryIsbn13 publisher description price title author contributor contributorNote bookImage bookImageWidth bookImageHeight amazonProductUrl ageGroup bookReviewLink firstChapterLink sundayReviewLink articleChapterLink isbns { isbn10 isbn13 } buyLinks { name url } bookUri } } }`;

  const variables: Record<string, any> = isCurrent ? { list } : { list, date };
  const data = await gqlRequest<any>(query, variables);
  const container = (data.bestsellers || data.bestsellersByDate || {});
  const rawBooks = Array.isArray(container.books) ? container.books : [];
  return rawBooks.map(transformGraphQLBook);
}

// Archive (single day) via GraphQL
function transformGraphQLArticleToArchive(a: any): ArchiveArticle {
  return {
    web_url: a.url ?? '',
    snippet: a.snippet ?? '',
    lead_paragraph: a.leadParagraph ?? '',
    abstract: a.abstract ?? '',
    print_page: 0,
    blog: [],
    source: a.source ?? 'The New York Times',
    multimedia: Array.isArray(a.multimedia) ? a.multimedia : [],
    headline: {
      main: a.headline?.main ?? a.title ?? '',
      kicker: a.headline?.kicker ?? null,
      content_kicker: a.headline?.contentKicker ?? null,
      print_headline: a.headline?.printHeadline ?? null,
      name: a.headline?.name ?? null,
      seo: a.headline?.seo ?? null,
      sub: a.headline?.sub ?? null,
    },
    keywords: Array.isArray(a.keywords)
      ? a.keywords.map((k: any) => ({
          name: k.name ?? '',
          value: k.value ?? '',
          rank: k.rank ?? 0,
          major: k.major ?? '',
        }))
      : [],
    pub_date: a.publishedDate ?? '',
    document_type: 'article',
    news_desk: '',
    section_name: a.section ?? '',
    subsection_name: a.subsection ?? '',
    byline: {
      original: a.byline?.original ?? '',
      person: Array.isArray(a.byline?.person) ? a.byline.person : [],
      organization: a.byline?.organization ?? null,
    },
    type_of_material: '',
    _id: a.id ?? a.url ?? '',
    word_count: 0,
    score: 0,
    uri: a.url ?? '',
  };
}

export async function fetchArchiveByDay(year: number, month: number, day: number, limit: number = 50): Promise<ArchiveArticle[]> {
  const query = `query ArchiveByDay($year: Int!, $month: Int!, $day: Int!, $limit: Int){
    archiveByDay(year: $year, month: $month, day: $day, limit: $limit){
      id
      url
      title
      abstract
      snippet
      leadParagraph
      source
      publishedDate
      author
      section
      subsection
      headline { main kicker contentKicker printHeadline name seo sub }
      byline { original }
      keywords { name value rank major }
      multimedia { url format height width type subtype caption copyright }
    }
  }`;
  const variables = { year, month, day, limit };
  const data = await gqlRequest<any>(query, variables);
  const items = Array.isArray(data.archiveByDay) ? data.archiveByDay : [];
  return items.map(transformGraphQLArticleToArchive);
}
