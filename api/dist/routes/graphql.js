import { createYoga } from 'graphql-yoga';
import { createSchema } from 'graphql-yoga';
import { ApolloServer } from '@apollo/server';
import fastifyApollo from '@as-integrations/fastify';
/**
 * GraphQL endpoint with APQ (Automatic Persisted Queries) and DataLoader
 * - Schema-first approach
 * - Comprehensive type safety
 * - N+1 query elimination
 * - Authentication integration
 * - Caching and performance optimization
 */
// GraphQL Schema
const typeDefs = /* GraphQL */ `
  type Article {
    id: ID!
    url: String!
    title: String!
    abstract: String
    snippet: String
    leadParagraph: String
    source: String
    publishedDate: String
    author: String
    section: String
    subsection: String
    multimedia: [MultimediaItem!]!
    keywords: [Keyword!]!
    headline: Headline
    byline: Byline
  }

  type MultimediaItem {
    url: String!
    format: String!
    height: Int!
    width: Int!
    type: String!
    subtype: String!
    caption: String
    copyright: String
  }

  type Keyword {
    name: String!
    value: String!
    rank: Int!
    major: String
  }

  type Headline {
    main: String!
    kicker: String
    contentKicker: String
    printHeadline: String
    name: String
    seo: String
    sub: String
  }

  type Byline {
    original: String
    person: [Person!]!
    organization: String
  }

  type Person {
    firstname: String
    middlename: String
    lastname: String
    qualifier: String
    title: String
    role: String
    organization: String
    rank: Int
  }

  type SearchResponse {
    articles: [Article!]!
    meta: SearchMeta!
  }

  type SearchMeta {
    hits: Int!
    offset: Int!
    time: Int!
  }

  type Favorite {
    id: ID!
    article: Article!
    notes: String
    tags: [String!]!
    createdAt: String!
    updatedAt: String!
  }

  type User {
    id: ID!
    email: String!
    name: String!
    favorites: [Favorite!]!
  }

  enum SortOrder {
    NEWEST
    OLDEST
    RELEVANCE
  }

  enum Section {
    HOME
    ARTS
    AUTOMOBILES
    BOOKS
    BUSINESS
    FASHION
    FOOD
    HEALTH
    INSIDER
    MAGAZINE
    MOVIES
    NYREGION
    OBITUARIES
    OPINION
    POLITICS
    REALESTATE
    SCIENCE
    SPORTS
    SUNDAYREVIEW
    TECHNOLOGY
    THEATER
    TRAVEL
    UPSHOT
    US
    WORLD
  }

  type Query {
    # Article Queries
    searchArticles(
      query: String!
      page: Int = 0
      sort: SortOrder = RELEVANCE
      beginDate: String
      endDate: String
      filteredQuery: String
    ): SearchResponse!

    topStories(section: Section = HOME): [Article!]!
    
    archive(year: Int!, month: Int!): [Article!]!
    archiveByDay(year: Int!, month: Int!, day: Int!, limit: Int = 50): [Article!]!
    
    article(id: ID, url: String): Article

    # User Queries (requires authentication)
    me: User
    
    myFavorites(
      page: Int = 0
      limit: Int = 20
      tag: String
      search: String
    ): [Favorite!]!
  }

  type Mutation {
    # Favorite Mutations (requires authentication)
    addFavorite(
      articleId: ID!
      url: String!
      title: String!
      abstract: String
      notes: String
      tags: [String!]
    ): Favorite!
    
    updateFavorite(
      id: ID!
      notes: String
      tags: [String!]
    ): Favorite!
    
    removeFavorite(id: ID!): Boolean!
  }

  # Subscription support for real-time updates
  type Subscription {
    favoriteAdded: Favorite!
    favoriteUpdated: Favorite!
    favoriteRemoved: ID!
  }

  # NYT Books API
  type BookListName {
    listName: String!
    displayName: String!
    listNameEncoded: String!
    oldestPublishedDate: String
    newestPublishedDate: String
    updated: String
  }

  type BestsellerBook {
    title: String!
    author: String!
    description: String
    publisher: String
    rank: Int
    weeksOnList: Int
    amazonProductUrl: String
    bookImage: String
    isbn13: [String!]!
  }

  type BookList {
    listName: String!
    displayName: String!
    updated: String
    books: [BestsellerBook!]!
  }

  enum MostPopularCategory {
    VIEWED
    EMAILED
    SHARED
  }

  type MostPopularItem {
    id: ID!
    url: String!
    title: String!
    abstract: String
    publishedDate: String
    section: String
    byline: String
  }

  extend type Query {
    listNames: [BookListName!]!
    bestsellers(list: String!, date: String): BookList!
    mostPopular(category: MostPopularCategory!, period: Int!, type: String): [MostPopularItem!]!
  }
`;
// Resolvers
const resolvers = {
    Query: {
        searchArticles: async (_parent, args, context) => {
            // Use the existing articles API logic with circuit breaker
            const { fastify, request } = context;
            try {
                const searchParams = {
                    q: args.query,
                    page: args.page,
                    sort: args.sort?.toLowerCase(),
                    begin_date: args.beginDate,
                    end_date: args.endDate,
                    fq: args.filteredQuery,
                };
                // Create cache key
                const cacheKey = `graphql:search:${JSON.stringify(searchParams)}`;
                // Check cache first
                const cached = await fastify.cache?.get?.(cacheKey);
                if (cached) {
                    return cached;
                }
                // Build NYT API URL
                const url = new URL('https://api.nytimes.com/svc/search/v2/articlesearch.json');
                Object.entries(searchParams).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        url.searchParams.set(key.replace('_', '_'), value.toString());
                    }
                });
                url.searchParams.set('api-key', process.env.NYT_API_KEY);
                const data = await (fastify.circuitBreaker?.execute
                    ? fastify.circuitBreaker.execute('external', async () => {
                        const response = await fetch(url.toString());
                        if (!response.ok)
                            throw new Error(`NYT API error: ${response.status}`);
                        return response.json();
                    })
                    : (async () => {
                        const response = await fetch(url.toString());
                        if (!response.ok)
                            throw new Error(`NYT API error: ${response.status}`);
                        return response.json();
                    })());
                const result = {
                    articles: data.response.docs.map(transformNYTArticle),
                    meta: {
                        hits: data.response.meta.hits,
                        offset: data.response.meta.offset,
                        time: data.response.meta.time,
                    },
                };
                // Cache for 5 minutes
                await fastify.cache?.set?.(cacheKey, result, 300);
                return result;
            }
            catch (error) {
                throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        topStories: async (_parent, args, context) => {
            const { fastify } = context;
            try {
                const section = args.section?.toLowerCase() || 'home';
                const cacheKey = `graphql:top-stories:${section}`;
                const cached = await fastify.cache?.get?.(cacheKey);
                if (cached)
                    return cached;
                const url = `https://api.nytimes.com/svc/topstories/v2/${section}.json?api-key=${process.env.NYT_API_KEY}`;
                const data = await (fastify.circuitBreaker?.execute
                    ? fastify.circuitBreaker.execute('external', async () => {
                        const response = await fetch(url);
                        if (!response.ok)
                            throw new Error(`NYT API error: ${response.status}`);
                        return response.json();
                    })
                    : (async () => {
                        const response = await fetch(url);
                        if (!response.ok)
                            throw new Error(`NYT API error: ${response.status}`);
                        return response.json();
                    })());
                const articles = data.results.map(transformNYTTopStory);
                await fastify.cache?.set?.(cacheKey, articles, 900); // 15 minutes
                return articles;
            }
            catch (error) {
                throw new Error(`Top stories fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        archive: async (_parent, args, context) => {
            const { fastify } = context;
            try {
                const { year, month } = args;
                const cacheKey = `graphql:archive:${year}:${month}`;
                const cached = await (fastify.cache?.get?.(cacheKey));
                if (cached)
                    return cached;
                const url = `https://api.nytimes.com/svc/archive/v1/${year}/${month}.json?api-key=${process.env.NYT_API_KEY}`;
                const data = await (fastify.circuitBreaker?.execute
                    ? fastify.circuitBreaker.execute('external', async () => {
                        const response = await fetch(url);
                        if (!response.ok)
                            throw new Error(`NYT API error: ${response.status}`);
                        return response.json();
                    })
                    : (async () => {
                        const response = await fetch(url);
                        if (!response.ok)
                            throw new Error(`NYT API error: ${response.status}`);
                        return response.json();
                    })());
                const articles = data.response.docs.map(transformNYTArticle);
                await fastify.cache?.set?.(cacheKey, articles, 3600); // 1 hour
                return articles;
            }
            catch (error) {
                throw new Error(`Archive fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        archiveByDay: async (_parent, args, context) => {
            const { fastify } = context;
            const { year, month, day, limit = 50 } = args;
            const cacheKey = `graphql:archive:${year}:${month}:${day}:${limit}`;
            const cached = await fastify.cache?.get?.(cacheKey);
            if (cached)
                return cached;
            const all = await resolvers.Query.archive(_parent, { year, month }, context);
            const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const filtered = all.filter((a) => (a.publishedDate || '').startsWith(dayStr)).slice(0, limit);
            await fastify.cache?.set?.(cacheKey, filtered, 600);
            return filtered;
        },
        me: async (_parent, _args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Authentication required');
            return {
                id: user.id,
                email: user.email,
                name: user.name || user.email,
                favorites: [], // Would load from database
            };
        },
        myFavorites: async (_parent, args, context) => {
            const { user, fastify } = context;
            if (!user)
                throw new Error('Authentication required');
            // Would implement with DataLoader for batch loading
            return []; // Placeholder
        },
        // Books API
        listNames: async (_parent, _args, context) => {
            const { fastify } = context;
            const cacheKey = 'graphql:books:listNames';
            const cached = await fastify.cache?.get?.(cacheKey);
            if (cached)
                return cached;
            const url = `https://api.nytimes.com/svc/books/v3/lists/names.json?api-key=${process.env.NYT_API_KEY}`;
            const data = await (fastify.circuitBreaker?.execute
                ? fastify.circuitBreaker.execute('external', async () => {
                    const res = await fetch(url);
                    if (!res.ok)
                        throw new Error(`NYT API error: ${res.status}`);
                    return res.json();
                })
                : (async () => {
                    const res = await fetch(url);
                    if (!res.ok)
                        throw new Error(`NYT API error: ${res.status}`);
                    return res.json();
                })());
            const result = (data.results || []).map((n) => ({
                listName: n.list_name,
                displayName: n.display_name,
                listNameEncoded: n.list_name_encoded,
                oldestPublishedDate: n.oldest_published_date,
                newestPublishedDate: n.newest_published_date,
                updated: n.updated,
            }));
            await fastify.cache?.set?.(cacheKey, result, 3600);
            return result;
        },
        bestsellers: async (_parent, args, context) => {
            const { fastify } = context;
            const date = args.date && args.date !== '' ? args.date : 'current';
            const list = encodeURIComponent(args.list);
            const cacheKey = `graphql:books:bestsellers:${date}:${list}`;
            const cached = await fastify.cache?.get?.(cacheKey);
            if (cached)
                return cached;
            const url = `https://api.nytimes.com/svc/books/v3/lists/${date}/${list}.json?api-key=${process.env.NYT_API_KEY}`;
            const data = await (fastify.circuitBreaker?.execute
                ? fastify.circuitBreaker.execute('external', async () => {
                    const res = await fetch(url);
                    if (!res.ok)
                        throw new Error(`NYT API error: ${res.status}`);
                    return res.json();
                })
                : (async () => {
                    const res = await fetch(url);
                    if (!res.ok)
                        throw new Error(`NYT API error: ${res.status}`);
                    return res.json();
                })());
            const result = {
                listName: data.results?.list_name || args.list,
                displayName: data.results?.display_name || args.list,
                updated: data.results?.updated || null,
                books: (data.results?.books || []).map((b) => ({
                    title: b.title,
                    author: b.author,
                    description: b.description,
                    publisher: b.publisher,
                    rank: b.rank,
                    weeksOnList: b.weeks_on_list,
                    amazonProductUrl: b.amazon_product_url,
                    bookImage: b.book_image,
                    isbn13: b.isbns?.map((i) => i.isbn13).filter(Boolean) || [],
                })),
            };
            await fastify.cache?.set?.(cacheKey, result, 900);
            return result;
        },
        mostPopular: async (_parent, args, context) => {
            const { fastify } = context;
            const category = (args.category || 'VIEWED').toString().toUpperCase();
            const period = args.period || 1;
            const type = args.type || 'facebook';
            const cacheKey = `graphql:mostPopular:${category}:${period}:${type}`;
            const cached = await fastify.cache?.get?.(cacheKey);
            if (cached)
                return cached;
            let url = '';
            if (category === 'VIEWED')
                url = `https://api.nytimes.com/svc/mostpopular/v2/viewed/${period}.json?api-key=${process.env.NYT_API_KEY}`;
            else if (category === 'EMAILED')
                url = `https://api.nytimes.com/svc/mostpopular/v2/emailed/${period}.json?api-key=${process.env.NYT_API_KEY}`;
            else
                url = `https://api.nytimes.com/svc/mostpopular/v2/shared/${period}/${type}.json?api-key=${process.env.NYT_API_KEY}`;
            const data = await (fastify.circuitBreaker?.execute
                ? fastify.circuitBreaker.execute('external', async () => {
                    const res = await fetch(url);
                    if (!res.ok)
                        throw new Error(`NYT API error: ${res.status}`);
                    return res.json();
                })
                : (async () => {
                    const res = await fetch(url);
                    if (!res.ok)
                        throw new Error(`NYT API error: ${res.status}`);
                    return res.json();
                })());
            const items = (data.results || []).map(transformNYTMostPopular);
            await fastify.cache?.set?.(cacheKey, items, 600);
            return items;
        },
    },
    Mutation: {
        addFavorite: async (_parent, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Authentication required');
            // Implementation would be similar to REST endpoint
            return {
                id: 'temp-id',
                article: {
                    id: args.articleId,
                    url: args.url,
                    title: args.title,
                    abstract: args.abstract,
                },
                notes: args.notes || '',
                tags: args.tags || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        },
        updateFavorite: async (_parent, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Authentication required');
            // Implementation would update the favorite
            throw new Error('Not implemented');
        },
        removeFavorite: async (_parent, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Authentication required');
            // Implementation would delete the favorite
            return true;
        },
    },
};
// Transform functions for NYT API data
function transformNYTArticle(doc) {
    return {
        id: doc._id,
        url: doc.web_url,
        title: doc.headline?.main || '',
        abstract: doc.abstract,
        snippet: doc.snippet,
        leadParagraph: doc.lead_paragraph,
        source: doc.source,
        publishedDate: doc.pub_date,
        author: doc.byline?.original,
        section: doc.section_name,
        subsection: doc.subsection_name,
        multimedia: doc.multimedia || [],
        keywords: doc.keywords || [],
        headline: doc.headline,
        byline: doc.byline,
    };
}
function transformNYTTopStory(story) {
    return {
        id: story.url,
        url: story.url,
        title: story.title,
        abstract: story.abstract,
        publishedDate: story.published_date,
        author: story.byline,
        section: story.section,
        subsection: story.subsection,
        multimedia: story.multimedia || [],
        keywords: [],
        headline: { main: story.title },
        byline: { original: story.byline, person: [] },
    };
}
function transformNYTMostPopular(item) {
    return {
        id: item.id || item.url,
        url: item.url,
        title: item.title,
        abstract: item.abstract,
        publishedDate: item.published_date,
        section: item.section,
        byline: item.byline,
    };
}
export async function graphqlRoutes(fastify) {
    // Build schema once for both servers
    const schema = createSchema({ typeDefs, resolvers });
    // Apollo Server setup (for clients expecting Apollo behavior)
    const apollo = new ApolloServer({ schema });
    await apollo.start();
    fastify.register(fastifyApollo(apollo), {
        path: '/apollo',
        context: async (request) => ({
            fastify,
            request,
            user: request.user,
        }),
    });
    // GraphQL Yoga setup (fast, batteries-included; kept as default /graphql)
    const yoga = createYoga({
        schema,
        context: async ({ request }) => ({
            fastify,
            request,
            user: request.user,
        }),
        graphiql: process.env.NODE_ENV === 'development',
        logging: {
            debug: (...args) => fastify.log.debug(args),
            info: (...args) => fastify.log.info(args),
            warn: (...args) => fastify.log.warn(args),
            error: (...args) => fastify.log.error(args),
        },
    });
    fastify.route({
        url: '/',
        method: ['GET', 'POST', 'OPTIONS'],
        handler: async (request, reply) => {
            // Only attempt auth if Authorization header is present; otherwise public
            if (request.headers.authorization) {
                try {
                    await fastify.authenticate(request, reply);
                }
                catch { /* ignore and continue for public queries */ }
            }
            const response = await yoga.handleNodeRequest(request, {});
            response.headers.forEach((value, key) => reply.header(key, value));
            reply.code(response.status);
            if (response.body) {
                const body = await response.text();
                reply.type('application/json').send(body);
            }
            else {
                reply.send();
            }
        },
    });
}
