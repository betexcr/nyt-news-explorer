// Auto-generated TypeScript interfaces from Zod schemas
// Generated on: 2025-08-04T21:55:48.939Z
// Do not edit manually - regenerate using: npm run generate-types

export interface Image {
  url: string;
  height: number;
  width: number;
}

export interface Multimedia {
  caption?: string;
  credit?: string;
  default?: Image;
  thumbnail?: Image;
}

export interface Headline {
  main: string;
  kicker?: string;
  print_headline?: string;
}

export interface Byline {
  original?: string;
}

export interface Keyword {
  name: string;
  value: string;
  rank: number;
}

export interface Article {
  web_url: string;
  snippet: string;
  print_page?: string;
  print_section?: string;
  source?: string;
  multimedia: Multimedia;
  headline: Headline;
  keywords: Keyword[];
  pub_date: string;
  document_type?: string;
  desk?: string;
  section_name?: string;
  byline?: Byline;
  type_of_material?: string;
  word_count?: number;
  uri?: string;
  _id?: string;
  lead_paragraph?: string;
}

export interface Meta {
  hits: number;
  offset: number;
  time: number;
}

export interface Response {
  docs: Article[];
  meta?: Meta;
}

export interface NytApiResponse {
  status: string;
  copyright: string;
  response: Response;
}

export interface SearchParams {
  q?: string;
  page?: number;
  sort?: 'best' | 'newest' | 'oldest' | 'relevance';
  begin_date?: string;
  end_date?: string;
  fq?: string;
  'api-key'?: string;
}

// Legacy type aliases for backward compatibility
export type NytMultimedia = Multimedia;
export type NytMultimediaImage = Image;
export type NytHeadline = Headline;
export type NytArticle = Article;
