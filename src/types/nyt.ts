export interface NytMultimedia {
  url: string;
  credit?: string;
  default?: NytMultimediaImage; 
  thumbnail?: NytMultimediaImage; 
}

export interface NytMultimediaImage {
  width: number;
  height: number;
  url: string;
}
export interface NytHeadline {
  main: string;
}

export interface NytArticle {
  _id: string;
  web_url: string;
  snippet: string;
  lead_paragraph?: string;
  multimedia: NytMultimedia;
  headline: NytHeadline;
  pub_date: string;
  section_name?: string;
  byline?: { original?: string };
}
