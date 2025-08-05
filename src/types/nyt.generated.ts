// Auto-generated TypeScript interfaces from Zod schemas
// Generated on: 2025-08-05T05:05:39.473Z
// Do not edit manually - regenerate using: npm run gen:types

export interface Image {
  url: string;
  height: number;
  width: number;
}

export interface Multimedia {
  caption?: string;
  credit?: string;
  subtype?: string;
  url?: string;
  height?: number;
  width?: number;
  default?: any;
  thumbnail?: any;
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
  print_page?: number;
  print_section?: string;
  source?: string;
  multimedia: any;
  headline: any;
  keywords: any[];
  pub_date: string;
  document_type?: string;
  desk?: string;
  section_name?: string;
  byline?: any;
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
  docs: any[];
  meta?: any;
}

export interface NytApiResponse {
  status: string;
  copyright: string;
  response: any;
}

export interface SearchParams {
  'api-key': string;
  q?: string;
  page?: number;
  sort?: any;
  begin_date?: string;
  end_date?: string;
  fq?: string;
}


// Legacy type aliases for backward compatibility
export type NytMultimedia = Multimedia;
export type NytMultimediaImage = Image;
export type NytHeadline = Headline;
export type NytArticle = Article;

