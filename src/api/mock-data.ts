// Mock data for NYT APIs
import type { MostPopularArticle, TopStory, Book, ArchiveArticle } from '../types/nyt.other';
import type { MovieReview } from './nyt-apis';

// Helper function to create complete MostPopularArticle objects
const createMockMostPopularArticle = (data: Partial<MostPopularArticle>): MostPopularArticle => ({
  id: 100000008764123,
  title: "Breaking: Major Tech Company Announces Revolutionary AI Breakthrough",
  abstract: "A leading technology company has unveiled what experts are calling the most significant artificial intelligence advancement in decades.",
  url: "https://www.nytimes.com/2024/01/15/technology/ai-breakthrough.html",
  published_date: "2024-01-15",
  section: "Technology",
  byline: "By Sarah Johnson",
  adx_keywords: "",
  column: null,
  type: "Article",
  source: "The New York Times",
  des_facet: [],
  org_facet: [],
  per_facet: [],
  geo_facet: [],
  media: [],
  eta_id: 0,
  ...data
});

// Mock Most Popular Articles
export const mockTrendingArticles: MostPopularArticle[] = [
  createMockMostPopularArticle({
    id: 100000008764123,
    title: "Breaking: Major Tech Company Announces Revolutionary AI Breakthrough",
    abstract: "A leading technology company has unveiled what experts are calling the most significant artificial intelligence advancement in decades.",
    url: "https://www.nytimes.com/2024/01/15/technology/ai-breakthrough.html",
    section: "Technology",
    byline: "By Sarah Johnson",
    media: [
      {
        type: "image",
        subtype: "photo",
        caption: "AI researchers working on breakthrough technology",
        copyright: "The New York Times",
        approved_for_syndication: 1,
        "media-metadata": [
          {
            url: "https://static01.nyt.com/images/2024/01/15/technology/ai-breakthrough/ai-breakthrough-thumbStandard.jpg",
            format: "Standard Thumbnail",
            height: 75,
            width: 75
          },
          {
            url: "https://static01.nyt.com/images/2024/01/15/technology/ai-breakthrough/ai-breakthrough-mediumThreeByTwo210.jpg",
            format: "mediumThreeByTwo210",
            height: 140,
            width: 210
          },
          {
            url: "https://static01.nyt.com/images/2024/01/15/technology/ai-breakthrough/ai-breakthrough-large.jpg",
            format: "Large",
            height: 400,
            width: 600
          }
        ]
      }
    ]
  }),
  createMockMostPopularArticle({
    id: 100000008764124,
    title: "Global Climate Summit Reaches Historic Agreement",
    abstract: "World leaders have agreed on unprecedented measures to combat climate change, marking a turning point in international environmental policy.",
    url: "https://www.nytimes.com/2024/01/15/climate/global-summit-agreement.html",
    section: "Climate",
    byline: "By Michael Chen",
    media: [
      {
        type: "image",
        subtype: "photo",
        caption: "World leaders at climate summit",
        copyright: "The New York Times",
        approved_for_syndication: 1,
        "media-metadata": [
          {
            url: "https://static01.nyt.com/images/2024/01/15/climate/summit/summit-thumbStandard.jpg",
            format: "Standard Thumbnail",
            height: 75,
            width: 75
          },
          {
            url: "https://static01.nyt.com/images/2024/01/15/climate/summit/summit-mediumThreeByTwo210.jpg",
            format: "mediumThreeByTwo210",
            height: 140,
            width: 210
          }
        ]
      }
    ]
  }),
  createMockMostPopularArticle({
    id: 100000008764125,
    title: "Revolutionary Medical Treatment Shows Promising Results",
    abstract: "A new medical breakthrough has shown remarkable success in treating previously incurable conditions, offering hope to millions of patients worldwide.",
    url: "https://www.nytimes.com/2024/01/15/health/medical-breakthrough.html",
    section: "Health",
    byline: "By Dr. Emily Rodriguez",
    media: [
      {
        type: "image",
        subtype: "photo",
        caption: "Medical researchers in laboratory",
        copyright: "The New York Times",
        approved_for_syndication: 1,
        "media-metadata": [
          {
            url: "https://static01.nyt.com/images/2024/01/15/health/medical/medical-thumbStandard.jpg",
            format: "Standard Thumbnail",
            height: 75,
            width: 75
          },
          {
            url: "https://static01.nyt.com/images/2024/01/15/health/medical/medical-mediumThreeByTwo210.jpg",
            format: "mediumThreeByTwo210",
            height: 140,
            width: 210
          }
        ]
      }
    ]
  })
];

// Mock Top Stories
export const mockTopStories: TopStory[] = [
  {
    section: "home",
    subsection: "",
    title: "President Announces Major Infrastructure Investment Plan",
    abstract: "The administration has unveiled a comprehensive plan to modernize the nation's infrastructure, creating millions of jobs and improving economic competitiveness.",
    url: "https://www.nytimes.com/2024/01/15/us/politics/infrastructure-plan.html",
    uri: "nyt://article/12345678-1234-1234-1234-123456789012",
    byline: "By David Thompson",
    item_type: "Article",
    updated_date: "2024-01-15T10:00:00-05:00",
    created_date: "2024-01-15T08:00:00-05:00",
    published_date: "2024-01-15",
    material_type_facet: "",
    kicker: "",
    des_facet: ["Infrastructure", "Politics", "Economy"],
    org_facet: ["White House"],
    per_facet: [],
    geo_facet: ["United States"],
    multimedia: [
      {
        rank: 0,
        url: "https://static01.nyt.com/images/2024/01/15/us/politics/infrastructure/infrastructure-thumbStandard.jpg",
        height: 75,
        width: 75,
        type: "image",
        subtype: "photo",
        caption: "Infrastructure project site",
        credit: "The New York Times",
        legacy: {
          xlarge: "https://static01.nyt.com/images/2024/01/15/us/politics/infrastructure/infrastructure-articleLarge.jpg",
          xlargewidth: 600,
          xlargeheight: 400
        },
        subType: "",
        crop_name: "thumbStandard"
      }
    ],
    short_url: "https://nyti.ms/3abc123"
  },
  {
    section: "business",
    subsection: "",
    title: "Stock Market Reaches New Record High Amid Economic Recovery",
    abstract: "Major indices have surged to unprecedented levels as economic indicators show strong recovery from recent challenges.",
    url: "https://www.nytimes.com/2024/01/15/business/stock-market-record.html",
    uri: "nyt://article/87654321-4321-4321-4321-210987654321",
    byline: "By Lisa Wang",
    item_type: "Article",
    updated_date: "2024-01-15T16:30:00-05:00",
    created_date: "2024-01-15T14:30:00-05:00",
    published_date: "2024-01-15",
    material_type_facet: "",
    kicker: "",
    des_facet: ["Stock Market", "Economy", "Business"],
    org_facet: ["New York Stock Exchange"],
    per_facet: [],
    geo_facet: ["United States"],
    multimedia: [
      {
        rank: 0,
        subtype: "photo",
        caption: "Trading floor activity",
        credit: "The New York Times",
        type: "image",
        url: "https://static01.nyt.com/images/2024/01/15/business/stock-market/stock-market-thumbStandard.jpg",
        height: 75,
        width: 75,
        legacy: {
          xlarge: "https://static01.nyt.com/images/2024/01/15/business/stock-market/stock-market-articleLarge.jpg",
          xlargewidth: 600,
          xlargeheight: 400
        },
        subType: "",
        crop_name: "thumbStandard"
      }
    ],
    short_url: "https://nyti.ms/3def456"
  },
  {
    section: "technology",
    subsection: "",
    title: "New Smartphone Technology Revolutionizes Mobile Computing",
    abstract: "Latest smartphone innovations are changing how we interact with technology, featuring advanced AI capabilities and enhanced security.",
    url: "https://www.nytimes.com/2024/01/15/technology/smartphone-innovation.html",
    uri: "nyt://article/11111111-2222-3333-4444-555555555555",
    byline: "By Alex Kim",
    item_type: "Article",
    updated_date: "2024-01-15T12:15:00-05:00",
    created_date: "2024-01-15T10:15:00-05:00",
    published_date: "2024-01-15",
    material_type_facet: "",
    kicker: "",
    des_facet: ["Smartphones", "Technology", "Artificial Intelligence"],
    org_facet: ["Apple Inc", "Samsung Electronics"],
    per_facet: [],
    geo_facet: ["United States", "South Korea"],
    multimedia: [
      {
        rank: 0,
        subtype: "photo",
        caption: "Latest smartphone models",
        credit: "The New York Times",
        type: "image",
        url: "https://static01.nyt.com/images/2024/01/15/technology/smartphone/smartphone-thumbStandard.jpg",
        height: 75,
        width: 75,
        legacy: {
          xlarge: "https://static01.nyt.com/images/2024/01/15/technology/smartphone/smartphone-articleLarge.jpg",
          xlargewidth: 600,
          xlargeheight: 400
        },
        subType: "",
        crop_name: "thumbStandard"
      }
    ],
    short_url: "https://nyti.ms/3ghi789"
  }
];

// Mock Movie Reviews
export const mockMovieReviews: MovieReview[] = [
  {
    display_title: "The Future is Now",
    mpaa_rating: "PG-13",
    critics_pick: 1,
    byline: "A.O. Scott",
    headline: "A Visionary Film That Redefines Science Fiction",
    summary_short: "This groundbreaking film explores the intersection of technology and humanity with stunning visuals and compelling storytelling.",
    publication_date: "2024-01-15",
    opening_date: "2024-01-12",
    date_updated: "2024-01-15T10:00:00-05:00",
    link: {
      type: "article",
      url: "https://www.nytimes.com/2024/01/15/movies/the-future-is-now-review.html",
      suggested_link_text: "Read the New York Times Review of The Future is Now"
    },
    multimedia: {
      type: "mediumThreeByTwo210",
      src: "https://static01.nyt.com/images/2024/01/15/movies/future-now/future-now-mediumThreeByTwo210.jpg",
      height: 140,
      width: 210
    }
  },
  {
    display_title: "Echoes of Yesterday",
    mpaa_rating: "R",
    critics_pick: 0,
    byline: "Manohla Dargis",
    headline: "A Poignant Reflection on Memory and Loss",
    summary_short: "This intimate drama explores the complexities of human relationships through the lens of memory and time.",
    publication_date: "2024-01-14",
    opening_date: "2024-01-10",
    date_updated: "2024-01-14T14:30:00-05:00",
    link: {
      type: "article",
      url: "https://www.nytimes.com/2024/01/14/movies/echoes-of-yesterday-review.html",
      suggested_link_text: "Read the New York Times Review of Echoes of Yesterday"
    },
    multimedia: {
      type: "mediumThreeByTwo210",
      src: "https://static01.nyt.com/images/2024/01/14/movies/echoes/echoes-mediumThreeByTwo210.jpg",
      height: 140,
      width: 210
    }
  }
];

// Mock Books
export const mockBooks: Book[] = [
  {
    rank: 1,
    rank_last_week: 0,
    weeks_on_list: 1,
    asterisk: 0,
    dagger: 0,
    primary_isbn10: "1234567890",
    primary_isbn13: "9781234567890",
    publisher: "Random House",
    description: "A gripping thriller that explores the dark side of human nature and the consequences of our choices.",
    price: "0.00",
    title: "The Silent Echo",
    author: "Jane Smith",
    contributor: "by Jane Smith",
    contributor_note: "",
    book_image: "https://storage.googleapis.com/du-prd/books/images/9781234567890.jpg",
    book_image_width: 128,
    book_image_height: 192,
    amazon_product_url: "https://www.amazon.com/Silent-Echo-Jane-Smith/dp/1234567890",
    age_group: "",
    book_review_link: "",
    first_chapter_link: "",
    sunday_review_link: "",
    article_chapter_link: "",
    isbns: [
      {
        isbn10: "1234567890",
        isbn13: "9781234567890"
      }
    ],
    buy_links: [
      {
        name: "Amazon",
        url: "https://www.amazon.com/Silent-Echo-Jane-Smith/dp/1234567890"
      },
      {
        name: "Apple Books",
        url: "https://books.apple.com/us/book/the-silent-echo/id1234567890"
      }
    ],
    book_uri: "nyt://book/12345678-1234-1234-1234-123456789012"
  },
  {
    rank: 2,
    rank_last_week: 1,
    weeks_on_list: 3,
    asterisk: 0,
    dagger: 0,
    primary_isbn10: "0987654321",
    primary_isbn13: "9780987654321",
    publisher: "Simon & Schuster",
    description: "A compelling memoir that chronicles one woman's journey through adversity and triumph.",
    price: "0.00",
    title: "Breaking Barriers",
    author: "Maria Rodriguez",
    contributor: "by Maria Rodriguez",
    contributor_note: "",
    book_image: "https://storage.googleapis.com/du-prd/books/images/9780987654321.jpg",
    book_image_width: 128,
    book_image_height: 192,
    amazon_product_url: "https://www.amazon.com/Breaking-Barriers-Maria-Rodriguez/dp/0987654321",
    age_group: "",
    book_review_link: "",
    first_chapter_link: "",
    sunday_review_link: "",
    article_chapter_link: "",
    isbns: [
      {
        isbn10: "0987654321",
        isbn13: "9780987654321"
      }
    ],
    buy_links: [
      {
        name: "Amazon",
        url: "https://www.amazon.com/Breaking-Barriers-Maria-Rodriguez/dp/0987654321"
      },
      {
        name: "Apple Books",
        url: "https://books.apple.com/us/book/breaking-barriers/id0987654321"
      }
    ],
    book_uri: "nyt://book/87654321-4321-4321-4321-210987654321"
  }
];

// Mock Archive Articles
export const mockArchiveArticles: ArchiveArticle[] = [
  {
    abstract: "Historical article about the moon landing and its impact on society.",
    web_url: "https://www.nytimes.com/1969/07/21/archives/man-walks-on-moon.html",
    snippet: "Neil Armstrong becomes the first human to walk on the moon, marking a historic moment in space exploration.",
    lead_paragraph: "Men have landed and walked on the moon.",
    print_page: 1,
    blog: [],
    source: "The New York Times",
    multimedia: [
      {
        rank: 0,
        subtype: "photo",
        caption: "Neil Armstrong on the moon",
        credit: "NASA",
        type: "image",
        url: "https://static01.nyt.com/images/1969/07/21/archives/moon-landing/moon-landing-thumbStandard.jpg",
        height: 75,
        width: 75,
        legacy: {
          xlarge: "https://static01.nyt.com/images/1969/07/21/archives/moon-landing/moon-landing-articleLarge.jpg",
          xlargewidth: 600,
          xlargeheight: 400
        },
        subType: "",
        crop_name: "thumbStandard"
      }
    ],
    headline: {
      main: "Men Walk on Moon",
      kicker: "",
      content_kicker: "",
      print_headline: "",
      name: "",
      seo: "",
      sub: ""
    },
    keywords: [
      {
        name: "subject",
        value: "Moon",
        rank: 1,
        major: "N"
      },
      {
        name: "subject",
        value: "Space",
        rank: 2,
        major: "N"
      }
    ],
    pub_date: "1969-07-21T00:00:00Z",
    document_type: "article",
    news_desk: "Foreign",
    section_name: "Archives",
    subsection_name: "",
    byline: {
      original: "By John Noble Wilford",
      person: [
        {
          firstname: "John",
          middlename: "Noble",
          lastname: "Wilford",
          qualifier: "",
          title: "",
          role: "reported",
          organization: "",
          rank: 1
        }
      ],
      organization: null
    },
    type_of_material: "News",
    _id: "nyt://article/1969-07-21-0001",
    word_count: 1500,
    score: 1,
    uri: "nyt://article/1969-07-21-0001"
  },
  {
    abstract: "A look back at the fall of the Berlin Wall and the end of the Cold War era.",
    web_url: "https://www.nytimes.com/1989/11/10/archives/berlin-wall-falls.html",
    snippet: "The Berlin Wall, a symbol of the Cold War division between East and West Germany, begins to fall as crowds gather to celebrate.",
    lead_paragraph: "The Berlin Wall, the most potent symbol of the Cold War division between East and West Germany, began to fall tonight.",
    print_page: 1,
    blog: [],
    source: "The New York Times",
    multimedia: [
      {
        rank: 0,
        subtype: "photo",
        caption: "People celebrating at the Berlin Wall",
        credit: "Associated Press",
        type: "image",
        url: "https://static01.nyt.com/images/1989/11/10/archives/berlin-wall/berlin-wall-thumbStandard.jpg",
        height: 75,
        width: 75,
        legacy: {
          xlarge: "https://static01.nyt.com/images/1989/11/10/archives/berlin-wall/berlin-wall-articleLarge.jpg",
          xlargewidth: 600,
          xlargeheight: 400
        },
        subType: "",
        crop_name: "thumbStandard"
      }
    ],
    headline: {
      main: "Berlin Wall Falls",
      kicker: "",
      content_kicker: "",
      print_headline: "",
      name: "",
      seo: "",
      sub: ""
    },
    keywords: [
      {
        name: "subject",
        value: "Berlin Wall",
        rank: 1,
        major: "N"
      },
      {
        name: "subject",
        value: "Cold War",
        rank: 2,
        major: "N"
      }
    ],
    pub_date: "1989-11-10T00:00:00Z",
    document_type: "article",
    news_desk: "Foreign",
    section_name: "Archives",
    subsection_name: "",
    byline: {
      original: "By Serge Schmemann",
      person: [
        {
          firstname: "Serge",
          middlename: "",
          lastname: "Schmemann",
          qualifier: "",
          title: "",
          role: "reported",
          organization: "",
          rank: 1
        }
      ],
      organization: null
    },
    type_of_material: "News",
    _id: "nyt://article/1989-11-10-0001",
    word_count: 1200,
    score: 1,
    uri: "nyt://article/1989-11-10-0001"
  }
];
