import { z } from 'zod';
import { 
  ArticleSchema, 
  MultimediaSchema, 
  HeadlineSchema, 
  BylineSchema, 
  KeywordSchema,
  NytApiResponseSchema,
  MetaSchema
} from '../../types/nyt.schemas';

describe('Zod Schemas', () => {
  describe('KeywordSchema', () => {
    test('validates valid keyword object', () => {
      const validKeyword = {
        name: 'subject',
        value: 'Technology',
        rank: 1
      };

      const result = KeywordSchema.safeParse(validKeyword);
      expect(result.success).toBe(true);
    });

    test('validates keyword with all required fields', () => {
      const minimalKeyword = {
        name: 'subject',
        value: 'Technology',
        rank: 1
      };

      const result = KeywordSchema.safeParse(minimalKeyword);
      expect(result.success).toBe(true);
    });

    test('rejects invalid keyword object', () => {
      const invalidKeyword = {
        name: 123, // should be string
        value: 'Technology',
        rank: 1
      };

      const result = KeywordSchema.safeParse(invalidKeyword);
      expect(result.success).toBe(false);
    });
  });

  describe('HeadlineSchema', () => {
    test('validates valid headline object', () => {
      const validHeadline = {
        main: 'Test Headline',
        kicker: 'Test Kicker',
        print_headline: 'Test Print Headline'
      };

      const result = HeadlineSchema.safeParse(validHeadline);
      expect(result.success).toBe(true);
    });

    test('validates headline with only main field', () => {
      const minimalHeadline = {
        main: 'Test Headline'
      };

      const result = HeadlineSchema.safeParse(minimalHeadline);
      expect(result.success).toBe(true);
    });

    test('rejects headline without main field', () => {
      const invalidHeadline = {
        kicker: 'Test Kicker'
      };

      const result = HeadlineSchema.safeParse(invalidHeadline);
      expect(result.success).toBe(false);
    });
  });

  describe('BylineSchema', () => {
    test('validates valid byline object', () => {
      const validByline = {
        original: 'By John Doe'
      };

      const result = BylineSchema.safeParse(validByline);
      expect(result.success).toBe(true);
    });

    test('validates byline with original field', () => {
      const minimalByline = {
        original: 'By John Doe'
      };

      const result = BylineSchema.safeParse(minimalByline);
      expect(result.success).toBe(true);
    });

    test('validates byline with empty object', () => {
      const emptyByline = {};

      const result = BylineSchema.safeParse(emptyByline);
      expect(result.success).toBe(true);
    });
  });

  describe('MultimediaSchema', () => {
    test('validates valid multimedia object', () => {
      const validMultimedia = {
        caption: 'Test Caption',
        credit: 'Test Credit',
        subtype: 'photo',
        url: 'https://example.com/image.jpg',
        height: 600,
        width: 800,
        default: {
          url: 'https://example.com/default.jpg',
          height: 600,
          width: 800
        },
        thumbnail: {
          url: 'https://example.com/thumbnail.jpg',
          height: 150,
          width: 200
        }
      };

      const result = MultimediaSchema.safeParse(validMultimedia);
      expect(result.success).toBe(true);
    });

    test('validates multimedia with minimal fields', () => {
      const minimalMultimedia = {
        caption: 'Test Caption',
        credit: 'Test Credit'
      };

      const result = MultimediaSchema.safeParse(minimalMultimedia);
      expect(result.success).toBe(true);
    });

    test('validates multimedia with empty object', () => {
      const emptyMultimedia = {};

      const result = MultimediaSchema.safeParse(emptyMultimedia);
      expect(result.success).toBe(true);
    });
  });

  describe('ArticleSchema', () => {
    test('validates valid article object', () => {
      const validArticle = {
        web_url: 'https://example.com/article',
        snippet: 'Test snippet',
        lead_paragraph: 'Test lead paragraph',
        print_page: 1,
        source: 'The New York Times',
        multimedia: {
          caption: 'Test Caption',
          credit: 'Test Credit',
          subtype: 'photo',
          url: 'https://example.com/image.jpg',
          height: 600,
          width: 800
        },
        headline: {
          main: 'Test Headline'
        },
        keywords: [
          {
            name: 'subject',
            value: 'Technology',
            rank: 1
          }
        ],
        pub_date: '2024-01-01T00:00:00Z',
        document_type: 'article',
        desk: 'Technology',
        section_name: 'Technology',
        byline: {
          original: 'By John Doe'
        },
        type_of_material: 'News',
        _id: 'test-id',
        word_count: 500,
        uri: 'nyt://article/test-id'
      };

      const result = ArticleSchema.safeParse(validArticle);
      expect(result.success).toBe(true);
    });

    test('validates article with minimal fields', () => {
      const minimalArticle = {
        web_url: 'https://example.com/article',
        snippet: 'Test snippet',
        headline: {
          main: 'Test Headline'
        },
        keywords: [],
        pub_date: '2024-01-01T00:00:00Z',
        multimedia: {}
      };

      const result = ArticleSchema.safeParse(minimalArticle);
      expect(result.success).toBe(true);
    });

    test('rejects article without required fields', () => {
      const invalidArticle = {
        snippet: 'Test snippet'
        // Missing web_url, headline, keywords, pub_date, multimedia
      };

      const result = ArticleSchema.safeParse(invalidArticle);
      expect(result.success).toBe(false);
    });

    test('validates article with any web_url string', () => {
      const articleWithAnyUrl = {
        web_url: 'not-a-url',
        snippet: 'Test snippet',
        headline: {
          main: 'Test Headline'
        },
        keywords: [],
        pub_date: '2024-01-01T00:00:00Z',
        multimedia: {}
      };

      const result = ArticleSchema.safeParse(articleWithAnyUrl);
      expect(result.success).toBe(true);
    });
  });

  describe('MetaSchema', () => {
    test('validates valid search meta object', () => {
      const validMeta = {
        hits: 100,
        offset: 0,
        time: 50
      };

      const result = MetaSchema.safeParse(validMeta);
      expect(result.success).toBe(true);
    });

    test('rejects search meta with invalid fields', () => {
      const invalidMeta = {
        hits: 'not-a-number',
        offset: 0,
        time: 50
      };

      const result = MetaSchema.safeParse(invalidMeta);
      expect(result.success).toBe(false);
    });
  });

  describe('NytApiResponseSchema', () => {
    test('validates valid search response', () => {
      const validResponse = {
        status: 'OK',
        copyright: 'Copyright (c) 2024 The New York Times Company',
        response: {
          docs: [
            {
              web_url: 'https://example.com/article',
              snippet: 'Test snippet',
              headline: {
                main: 'Test Headline'
              },
              keywords: [],
              pub_date: '2024-01-01T00:00:00Z',
              multimedia: {}
            }
          ],
          meta: {
            hits: 1,
            offset: 0,
            time: 10
          }
        }
      };

      const result = NytApiResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    test('validates search response with empty docs', () => {
      const validResponse = {
        status: 'OK',
        copyright: 'Copyright (c) 2024 The New York Times Company',
        response: {
          docs: [],
          meta: {
            hits: 0,
            offset: 0,
            time: 5
          }
        }
      };

      const result = NytApiResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    test('validates search response with any status string', () => {
      const responseWithAnyStatus = {
        status: 'INVALID',
        copyright: 'Copyright (c) 2024 The New York Times Company',
        response: {
          docs: [],
          meta: {
            hits: 0,
            offset: 0,
            time: 5
          }
        }
      };

      const result = NytApiResponseSchema.safeParse(responseWithAnyStatus);
      expect(result.success).toBe(true);
    });
  });
}); 