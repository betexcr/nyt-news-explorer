import { z } from "zod";

export const imageSchema = z.object({
  url: z.string(),
  height: z.number().optional(),
  width: z.number().optional(),
});

export const multimediaSchema = z.object({
  caption: z.string().optional(),
  credit: z.string().optional(),
  default: imageSchema.optional(), // Reserved word, but fine in schema
  thumbnail: imageSchema.optional(), // Fix typo if needed
});

export const headlineSchema = z.object({
  main: z.string().optional(),
  kicker: z.string().optional(),
  print_headline: z.string().optional(),
});

export const keywordSchema = z.object({
  name: z.string(),
  value: z.string(),
  rank: z.number().optional(),
});

export const bylineSchema = z.object({
  original: z.string().optional(),
});

export const nytArticleSchema = z.object({
  web_url: z.string(),
  snippet: z.string(),
  print_page: z.number().optional(),
  print_section: z.string().optional(),
  source: z.string().optional(),
  multimedia: multimediaSchema.array(),
  headline: headlineSchema,
  keywords: keywordSchema.array(),
  pub_date: z.string(),
  document_type: z.string().optional(),
  desk: z.string().optional(),
  section_name: z.string().optional(),
  byline: bylineSchema.optional(),
  type_of_material: z.string().optional(),
  word_count: z.number().optional(),
  uri: z.string().optional(),
});

export const schemas = {
  ImageSchema: imageSchema,
  MultimediaSchema: multimediaSchema,
  HeadlineSchema: headlineSchema,
  KeywordSchema: keywordSchema,
  BylineSchema: bylineSchema,
  NytArticleSchema: nytArticleSchema,
};
