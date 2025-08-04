// Re-export generated types
export type {
  Image,
  Multimedia,
  Headline,
  Byline,
  Keyword,
  Article,
  Meta,
  Response,
  NytApiResponse,
  SearchParams,
  // Legacy aliases
  NytMultimedia,
  NytMultimediaImage,
  NytHeadline,
  NytArticle,
} from './nyt.generated';

// Re-export Zod schemas for runtime validation
export {
  ImageSchema,
  MultimediaSchema,
  HeadlineSchema,
  BylineSchema,
  KeywordSchema,
  ArticleSchema,
  MetaSchema,
  ResponseSchema,
  NytApiResponseSchema,
  SearchParamsSchema,
} from './nyt.schemas';
