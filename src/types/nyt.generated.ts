// Auto-generated TypeScript interfaces from YAML schema
// Generated on: 2025-08-05T02:09:09.173Z
// Do not edit manually - regenerate using: npm run gen:types

export interface Article {
  web_url?: string;
  snippet?: string;
  print_page?: number;
  print_section?: string;
  source?: string;
  multimedia?: Multimedia;
  headline?: Headline;
  keywords?: Keyword[];
  pub_date?: string;
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

export interface Byline {
  original?: string;
}

export interface Headline {
  main?: string;
  kicker?: string;
  print_headline?: string;
}

export interface Keyword {
  name?: string;
  value?: string;
  rank?: number;
}

export interface Multimedia {
  caption?: string;
  credit?: string;
  default?: Image;
  thumbnail?: Image;
}

export interface Image {
  url?: string;
  height?: number;
  width?: number;
}

export interface Meta {
  hits?: number;
  offset?: number;
  time?: number;
}

export interface Response {
  docs?: Article[];
  meta?: Meta;
}

export interface NytApiResponse {
  status?: string;
  copyright?: string;
  response?: Response;
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

