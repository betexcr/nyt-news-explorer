import axios from "axios";
import type {
  MostPopularArticle,
  TopStory,
  Book,
  ArchiveArticle,
} from "../types/nyt.other";
import type { NytArticle } from "../types/nyt";

// GraphQL endpoint configuration
const GRAPHQL_ENDPOINT = process.env.REACT_APP_API_URL 
  ? `${process.env.REACT_APP_API_URL}/api/v1/graphql`
  : 'http://localhost:3001/api/v1/graphql';

// GraphQL query definitions
const QUERIES = {
  SEARCH_ARTICLES: `
    query SearchArticles($query: String!, $page: Int, $sort: SortOrder, $beginDate: String, $endDate: String, $filteredQuery: String) {
      searchArticles(query: $query, page: $page, sort: $sort, beginDate: $beginDate, endDate: $endDate, filteredQuery: $filteredQuery) {
        articles {
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
          multimedia {
            url
            format
            height
            width
            type
            subtype
            caption
            copyright
          }
          keywords {
            name
            value
            rank
            major
          }
          headline {
            main
            kicker
            contentKicker
            printHeadline
            name
            seo
            sub
          }
          byline {
            original
            person {
              firstname
              middlename
              lastname
              qualifier
              title
              role
              organization
              rank
            }
            organization
          }
        }
        meta {
          hits
          offset
          time
        }
      }
    }
  `,

  TOP_STORIES: `
    query TopStories($section: Section) {
      topStories(section: $section) {
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
        multimedia {
          url
          format
          height
          width
          type
          subtype
          caption
          copyright
        }
        keywords {
          name
          value
          rank
          major
        }
        headline {
          main
          kicker
          contentKicker
          printHeadline
          name
          seo
          sub
        }
        byline {
          original
          person {
            firstname
            middlename
            lastname
            qualifier
            title
            role
            organization
            rank
          }
          organization
        }
      }
    }
  `,

  MOST_POPULAR: `
    query MostPopular($category: MostPopularCategory!, $period: Int!, $type: String) {
      mostPopular(category: $category, period: $period, type: $type) {
        id
        url
        title
        abstract
        publishedDate
        section
        byline
      }
    }
  `,

  ARCHIVE: `
    query Archive($year: Int!, $month: Int!) {
      archive(year: $year, month: $month) {
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
        multimedia {
          url
          format
          height
          width
          type
          subtype
          caption
          copyright
        }
        keywords {
          name
          value
          rank
          major
        }
        headline {
          main
          kicker
          contentKicker
          printHeadline
          name
          seo
          sub
        }
        byline {
          original
          person {
            firstname
            middlename
            lastname
            qualifier
            title
            role
            organization
            rank
          }
          organization
        }
      }
    }
  `,

  ARCHIVE_BY_DAY: `
    query ArchiveByDay($year: Int!, $month: Int!, $day: Int!, $limit: Int) {
      archiveByDay(year: $year, month: $month, day: $day, limit: $limit) {
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
        multimedia {
          url
          format
          height
          width
          type
          subtype
          caption
          copyright
        }
        keywords {
          name
          value
          rank
          major
        }
        headline {
          main
          kicker
          contentKicker
          printHeadline
          name
          seo
          sub
        }
        byline {
          original
          person {
            firstname
            middlename
            lastname
            qualifier
            title
            role
            organization
            rank
          }
          organization
        }
      }
    }
  `,

  BOOKS_LISTS: `
    query ListNames {
      listNames {
        listName
        displayName
        listNameEncoded
        oldestPublishedDate
        newestPublishedDate
        updated
      }
    }
  `,

  BESTSELLERS: `
    query Bestsellers($list: String!, $date: String) {
      bestsellers(list: $list, date: $date) {
        listName
        displayName
        updated
        books {
          title
          author
          description
          publisher
          rank
          weeksOnList
          amazonProductUrl
          bookImage
          isbn13
        }
      }
    }
  `,
};

// Error handling utility
class GraphQLError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = "GraphQLError";
  }
}

// Generic GraphQL request function
async function makeGraphQLRequest<T>(
  query: string,
  variables: Record<string, any> = {},
  signal?: AbortSignal,
  options?: { timeoutMs?: number }
): Promise<T> {
  try {
    const response = await axios.post(
      GRAPHQL_ENDPOINT,
      {
        query,
        variables,
      },
      {
        signal,
        timeout: options?.timeoutMs || 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.errors) {
      const error = response.data.errors[0];
      throw new GraphQLError(
        error.message || 'GraphQL error',
        response.status,
        error.extensions?.code
      );
    }

    return response.data.data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new GraphQLError('Request was cancelled', 0, 'ABORTED');
    }
    if (error instanceof GraphQLError) {
      throw error;
    }
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    throw new GraphQLError(`GraphQL request failed: ${message}`, status);
  }
}

// Transform GraphQL article to match existing types
function transformGraphQLArticle(article: any): NytArticle {
  return {
    _id: article.id,
    web_url: article.url,
    headline: {
      main: article.title,
      kicker: article.headline?.kicker,
      content_kicker: article.headline?.contentKicker,
      print_headline: article.headline?.printHeadline,
      name: article.headline?.name,
      seo: article.headline?.seo,
      sub: article.headline?.sub,
    },
    abstract: article.abstract,
    snippet: article.snippet,
    lead_paragraph: article.leadParagraph,
    source: article.source,
    pub_date: article.publishedDate,
    byline: {
      original: article.author || article.byline?.original,
      person: article.byline?.person || [],
      organization: article.byline?.organization,
    },
    section_name: article.section,
    subsection_name: article.subsection,
    multimedia: article.multimedia || [],
    keywords: article.keywords || [],
  };
}

function transformGraphQLTopStory(story: any): TopStory {
  return {
    url: story.url,
    title: story.title,
    abstract: story.abstract,
    published_date: story.publishedDate,
    byline: story.author || story.byline?.original,
    section: story.section,
    subsection: story.subsection,
    multimedia: story.multimedia || [],
  };
}

function transformGraphQLMostPopular(item: any): MostPopularArticle {
  return {
    id: item.id,
    url: item.url,
    title: item.title,
    abstract: item.abstract,
    published_date: item.publishedDate,
    section: item.section,
    byline: item.byline,
  };
}

function transformGraphQLBook(book: any): Book {
  return {
    title: book.title,
    author: book.author,
    description: book.description,
    publisher: book.publisher,
    rank: book.rank,
    weeks_on_list: book.weeksOnList,
    amazon_product_url: book.amazonProductUrl,
    book_image: book.bookImage,
    isbns: book.isbn13?.map((isbn: string) => ({ isbn13: isbn })) || [],
  };
}

// API functions that match the existing interface
export async function searchArticles(
  query: string,
  signal?: AbortSignal
): Promise<NytArticle[]> {
  const q = (query || "").trim();
  if (!q) return [];
  
  const data = await makeGraphQLRequest<{ searchArticles: { articles: any[] } }>(
    QUERIES.SEARCH_ARTICLES,
    { query: q, page: 0 },
    signal
  );
  
  return data.searchArticles.articles.map(transformGraphQLArticle);
}

export async function searchArticlesAdv(params: {
  q: string;
  page?: number;
  sort?: "newest" | "oldest" | "best" | "relevance";
  begin?: string;
  end?: string;
  section?: string;
  signal?: AbortSignal;
}): Promise<NytArticle[]> {
  const { q, page = 0, sort, begin, end, section, signal } = params;
  
  const variables: Record<string, any> = {
    query: q,
    page,
  };
  
  if (sort) {
    variables.sort = sort.toUpperCase();
  }
  
  if (begin) {
    variables.beginDate = begin;
  }
  
  if (end) {
    variables.endDate = end;
  }
  
  if (section) {
    variables.filteredQuery = `section_name:("${section}")`;
  }
  
  const data = await makeGraphQLRequest<{ searchArticles: { articles: any[] } }>(
    QUERIES.SEARCH_ARTICLES,
    variables,
    signal
  );
  
  return data.searchArticles.articles.map(transformGraphQLArticle);
}

export async function getTopStories(
  section: string = 'home',
  signal?: AbortSignal
): Promise<TopStory[]> {
  const data = await makeGraphQLRequest<{ topStories: any[] }>(
    QUERIES.TOP_STORIES,
    { section: section.toUpperCase() },
    signal
  );
  
  return data.topStories.map(transformGraphQLTopStory);
}

export async function getMostPopular(
  period: '1' | '7' | '30' = '7',
  signal?: AbortSignal
): Promise<MostPopularArticle[]> {
  const data = await makeGraphQLRequest<{ mostPopular: any[] }>(
    QUERIES.MOST_POPULAR,
    { 
      category: 'VIEWED',
      period: parseInt(period),
      type: 'facebook'
    },
    signal
  );
  
  return data.mostPopular.map(transformGraphQLMostPopular);
}

export async function getArchive(
  year: number,
  month: number,
  signal?: AbortSignal
): Promise<ArchiveArticle[]> {
  const data = await makeGraphQLRequest<{ archive: any[] }>(
    QUERIES.ARCHIVE,
    { year, month },
    signal
  );
  
  return data.archive.map(transformGraphQLArticle);
}

export async function searchArticlesByDay(
  year: number,
  month: number,
  day: number,
  signal?: AbortSignal
): Promise<ArchiveArticle[]> {
  const data = await makeGraphQLRequest<{ archiveByDay: any[] }>(
    QUERIES.ARCHIVE_BY_DAY,
    { year, month, day, limit: 50 },
    signal
  );
  
  return data.archiveByDay.map(transformGraphQLArticle);
}

export async function getBestSellers(
  list: string = 'hardcover-fiction',
  signal?: AbortSignal
): Promise<Book[]> {
  const data = await makeGraphQLRequest<{ bestsellers: { books: any[] } }>(
    QUERIES.BESTSELLERS,
    { list, date: 'current' },
    signal
  );
  
  return data.bestsellers.books.map(transformGraphQLBook);
}

export async function getBooksListsOverview(
  signal?: AbortSignal
): Promise<any> {
  const data = await makeGraphQLRequest<{ listNames: any[] }>(
    QUERIES.BOOKS_LISTS,
    {},
    signal
  );
  
  return data.listNames;
}

export async function getBooksListByDate(
  list: string,
  date: string,
  signal?: AbortSignal
): Promise<Book[]> {
  const data = await makeGraphQLRequest<{ bestsellers: { books: any[] } }>(
    QUERIES.BESTSELLERS,
    { list, date },
    signal
  );
  
  return data.bestsellers.books.map(transformGraphQLBook);
}

export async function getArticleByUrl(
  url: string,
  signal?: AbortSignal
): Promise<NytArticle | null> {
  // For now, we'll use the search with URL filter
  // This could be enhanced with a dedicated GraphQL query
  const articles = await searchArticlesAdv({
    q: '',
    filteredQuery: `web_url:("${url}")`,
    signal
  });
  
  return articles.length > 0 ? articles[0] : null;
}

export function makeSearchController() {
  let ctrl: AbortController | null = null;
  return async (q: string) => {
    ctrl?.abort();
    ctrl = new AbortController();
    return searchArticles(q, ctrl.signal);
  };
}

// Export constants for compatibility
export const TOP_STORIES_SECTIONS = [
  'home',
  'arts',
  'automobiles',
  'books',
  'business',
  'fashion',
  'food',
  'health',
  'insider',
  'magazine',
  'movies',
  'nyregion',
  'obituaries',
  'opinion',
  'politics',
  'realestate',
  'science',
  'sports',
  'sundayreview',
  'technology',
  'theater',
  'travel',
  'upshot',
  'us',
  'world'
] as const;

export const MOST_POPULAR_PERIODS = ['1', '7', '30'] as const;

export const BOOKS_LISTS = [
  'hardcover-fiction',
  'hardcover-nonfiction',
  'trade-fiction-paperback',
  'mass-market-paperback',
  'paperback-nonfiction',
  'e-book-fiction',
  'e-book-nonfiction',
  'combined-print-and-e-book-fiction',
  'combined-print-and-e-book-nonfiction',
  'advice-how-to-and-miscellaneous',
  'childrens-middle-grade-hardcover',
  'childrens-picture-books',
  'young-adult-hardcover',
  'series-books',
  'audio-fiction',
  'audio-nonfiction',
  'business-books',
  'celebrities',
  'crime-and-punishment',
  'culture',
  'education',
  'food-and-fitness',
  'games-and-activities',
  'graphic-books-and-manga',
  'hardcover-advice',
  'health',
  'humor',
  'indigenous-americans',
  'relationships',
  'science',
  'sports',
  'travel',
  'young-adult'
] as const;

// Export the error class for use in components
export { GraphQLError };
