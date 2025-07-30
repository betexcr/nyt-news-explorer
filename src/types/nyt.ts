export interface NytMultimedia {
  url: string;
  subtype?: string;
  type?: string;
  width?: number;
  height?: number;
}

export interface NytHeadline {
  main: string;
}

export interface NytArticle {
  _id: string;
  web_url: string;
  snippet: string;
  lead_paragraph?: string;
  multimedia: NytMultimedia[];
  headline: NytHeadline;
  pub_date: string;
  section_name?: string;
  byline?: { original?: string };
}
