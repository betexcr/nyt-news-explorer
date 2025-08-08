import { z } from 'zod';

// Base schemas based on the YAML spec
export const ImageSchema = z.object({
  url: z.string(),
  height: z.number(),
  width: z.number(),
});

export const MultimediaSchema = z.object({
  caption: z.string().optional(),
  credit: z.string().optional(),
  subtype: z.string().optional(),
  url: z.string().optional(),
  height: z.number().optional(),
  width: z.number().optional(),
  default: ImageSchema.optional(),
  thumbnail: ImageSchema.optional(),
});

export const HeadlineSchema = z.object({
  main: z.string(),
  kicker: z.string().optional(),
  print_headline: z.string().optional(),
});

export const BylineSchema = z.object({
  original: z.string().optional(),
});

export const KeywordSchema = z.object({
  name: z.string(),
  value: z.string(),
  rank: z.number(),
});

// Main Article schema based on the actual API response
export const ArticleSchema = z.object({
  web_url: z.string(),
  snippet: z.string(),
  print_page: z.number().optional(),
  print_section: z.string().optional(),
  source: z.string().optional(),
  multimedia: MultimediaSchema, // Fixed: multimedia is a single object
  headline: HeadlineSchema,
  keywords: z.array(KeywordSchema),
  pub_date: z.string(),
  document_type: z.string().optional(),
  desk: z.string().optional(),
  section_name: z.string().optional(),
  byline: BylineSchema.optional(),
  type_of_material: z.string().optional(),
  word_count: z.number().optional(),
  uri: z.string().optional(),
  // Additional fields that might be present
  _id: z.string().optional(),
  lead_paragraph: z.string().optional(),
});

// API Response schemas
export const MetaSchema = z.object({
  hits: z.number(),
  offset: z.number(),
  time: z.number(),
});

export const ResponseSchema = z.object({
  docs: z.array(ArticleSchema),
  meta: MetaSchema.optional(), // Made optional since it might be missing
});

export const NytApiResponseSchema = z.object({
  status: z.string(),
  copyright: z.string(),
  response: ResponseSchema,
});

// Search parameters schema
export const SearchParamsSchema = z.object({
  'api-key': z.string(),
  q: z.string().optional(),
  page: z.number().min(0).max(100).optional(),
  // Using string here for TS 4.9 compatibility with current Zod version in CRA build
  sort: z.string().optional(),
  begin_date: z.string().regex(/^\d{8}$/).optional(),
  end_date: z.string().regex(/^\d{8}$/).optional(),
  fq: z.string().optional(),
});

// Type exports
export type Image = z.infer<typeof ImageSchema>;
export type Multimedia = z.infer<typeof MultimediaSchema>;
export type Headline = z.infer<typeof HeadlineSchema>;
export type Byline = z.infer<typeof BylineSchema>;
export type Keyword = z.infer<typeof KeywordSchema>;
export type Article = z.infer<typeof ArticleSchema>;
export type Meta = z.infer<typeof MetaSchema>;
export type Response = z.infer<typeof ResponseSchema>;
export type NytApiResponse = z.infer<typeof NytApiResponseSchema>;
export type SearchParams = z.infer<typeof SearchParamsSchema>; 