// Shared NYT API interfaces for non-Article Search endpoints

// Most Popular API
export interface MostPopularArticle {
  id: number;
  url: string;
  adx_keywords: string;
  column: string | null;
  section: string;
  byline: string;
  type: string;
  title: string;
  abstract: string;
  published_date: string;
  source: string;
  des_facet: string[];
  org_facet: string[];
  per_facet: string[];
  geo_facet: string[];
  media: Array<{
    type: string;
    subtype: string;
    caption: string;
    copyright: string;
    approved_for_syndication: number;
    "media-metadata": Array<{
      url: string;
      format: string;
      height: number;
      width: number;
    }>;
  }>;
  eta_id: number;
}

export interface MostPopularResponse {
  status: string;
  copyright: string;
  num_results: number;
  results: MostPopularArticle[];
}

// Top Stories API
export interface TopStory {
  section: string;
  subsection: string;
  title: string;
  abstract: string;
  url: string;
  uri: string;
  byline: string;
  item_type: string;
  updated_date: string;
  created_date: string;
  published_date: string;
  material_type_facet: string;
  kicker: string;
  des_facet: string[];
  org_facet: string[];
  per_facet: string[];
  geo_facet: string[];
  multimedia: Array<{
    rank: number;
    subtype: string;
    caption: string | null;
    credit: string | null;
    type: string;
    url: string;
    height: number;
    width: number;
    legacy: {
      xlarge: string;
      xlargewidth: number;
      xlargeheight: number;
    };
    subType: string;
    crop_name: string;
  }>;
  short_url: string;
}

export interface TopStoriesResponse {
  status: string;
  copyright: string;
  section: string;
  last_updated: string;
  num_results: number;
  results: TopStory[];
}

// Books API (Best Sellers)
export interface Book {
  rank: number;
  rank_last_week: number;
  weeks_on_list: number;
  asterisk: number;
  dagger: number;
  primary_isbn10: string;
  primary_isbn13: string;
  publisher: string;
  description: string;
  price: string;
  title: string;
  author: string;
  contributor: string;
  contributor_note: string;
  book_image: string;
  book_image_width: number;
  book_image_height: number;
  amazon_product_url: string;
  age_group: string;
  book_review_link: string;
  first_chapter_link: string;
  sunday_review_link: string;
  article_chapter_link: string;
  isbns: Array<{ isbn10: string; isbn13: string }>;
  buy_links: Array<{ name: string; url: string }>;
  book_uri: string;
}

export interface BooksResponse {
  status: string;
  copyright: string;
  num_results: number;
  last_modified: string;
  results: Book[];
}

// Archive API
export interface ArchiveArticle {
  web_url: string;
  snippet: string;
  lead_paragraph: string;
  abstract: string;
  print_page: number;
  blog: any[];
  source: string;
  multimedia: any[];
  headline: {
    main: string;
    kicker: string | null;
    content_kicker: string | null;
    print_headline: string | null;
    name: string | null;
    seo: string | null;
    sub: string | null;
  };
  keywords: Array<{
    name: string;
    value: string;
    rank: number;
    major: string;
  }>;
  pub_date: string;
  document_type: string;
  news_desk: string;
  section_name: string;
  subsection_name: string;
  byline: {
    original: string;
    person: Array<{
      firstname: string;
      middlename: string | null;
      lastname: string;
      qualifier: string | null;
      title: string | null;
      role: string;
      organization: string;
      rank: number;
    }>;
    organization: string | null;
  };
  type_of_material: string;
  _id: string;
  word_count: number;
  score: number;
  uri: string;
}

export interface ArchiveResponse {
  status: string;
  copyright: string;
  response: {
    docs: ArchiveArticle[];
    meta: {
      hits: number;
      offset: number;
      time: number;
    };
  };
}


