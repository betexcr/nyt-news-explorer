import * as fs from "fs";
import * as path from "path";

// Import our Zod schemas
import {
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
} from '../src/types/nyt.schemas';

function generateTypeScriptFromZod(schema: any, name: string): string {
  const shape = schema._def.shape();
  const properties: string[] = [];
  
  for (const [propertyName, value] of Object.entries(shape)) {
    const zodValue = value as any;
    const optional = zodValue._def.typeName === 'ZodOptional' ? '?' : '';
    let typeName = 'any';
    
    if (zodValue._def.typeName === 'ZodString') {
      typeName = 'string';
    } else if (zodValue._def.typeName === 'ZodNumber') {
      typeName = 'number';
    } else if (zodValue._def.typeName === 'ZodBoolean') {
      typeName = 'boolean';
    } else if (zodValue._def.typeName === 'ZodArray') {
      const itemType = zodValue._def.type._def.typeName;
      if (itemType === 'ZodString') {
        typeName = 'string[]';
      } else if (itemType === 'ZodNumber') {
        typeName = 'number[]';
      } else if (itemType === 'ZodObject') {
        // For arrays of objects, use the existing type names
        const itemShape = zodValue._def.type._def.shape();
        const itemKeys = Object.keys(itemShape);
        if (itemKeys.includes('name') && itemKeys.includes('value') && itemKeys.includes('rank')) {
          typeName = 'Keyword[]';
        } else {
          typeName = 'any[]';
        }
      } else {
        typeName = 'any[]';
      }
    } else if (zodValue._def.typeName === 'ZodEnum') {
      const enumValues = zodValue._def.values.map((v: string) => `'${v}'`).join(' | ');
      typeName = enumValues;
    } else if (zodValue._def.typeName === 'ZodOptional') {
      const innerType = zodValue._def.innerType._def.typeName;
      if (innerType === 'ZodString') {
        typeName = 'string';
      } else if (innerType === 'ZodNumber') {
        typeName = 'number';
      } else if (innerType === 'ZodBoolean') {
        typeName = 'boolean';
      } else if (innerType === 'ZodObject') {
        // For optional objects, use existing type names
        const innerShape = zodValue._def.innerType._def.shape();
        const innerKeys = Object.keys(innerShape);
        if (innerKeys.includes('url') && innerKeys.includes('height') && innerKeys.includes('width')) {
          typeName = 'Image';
        } else if (innerKeys.includes('main')) {
          typeName = 'Headline';
        } else if (innerKeys.includes('original')) {
          typeName = 'Byline';
        } else if (innerKeys.includes('caption') || innerKeys.includes('credit') || innerKeys.includes('default') || innerKeys.includes('thumbnail')) {
          typeName = 'Multimedia';
        } else {
          typeName = 'any';
        }
      } else {
        typeName = 'any';
      }
    } else if (zodValue._def.typeName === 'ZodObject') {
      // For nested objects, use existing type names
      const nestedShape = zodValue._def.shape();
      const nestedKeys = Object.keys(nestedShape);
      if (nestedKeys.includes('url') && nestedKeys.includes('height') && nestedKeys.includes('width') && !nestedKeys.includes('default') && !nestedKeys.includes('thumbnail')) {
        typeName = 'Image';
      } else if (nestedKeys.includes('main')) {
        typeName = 'Headline';
      } else if (nestedKeys.includes('original')) {
        typeName = 'Byline';
      } else if (nestedKeys.includes('caption') || nestedKeys.includes('credit') || nestedKeys.includes('default') || nestedKeys.includes('thumbnail')) {
        typeName = 'Multimedia';
      } else {
        typeName = 'any';
      }
    }
    
    properties.push(`  ${propertyName}${optional}: ${typeName};`);
  }
  
  return `export interface ${name} {
${properties.join('\n')}
}`;
}

function main() {
  try {
    const interfaces: string[] = [];
    
    // Generate interfaces from our Zod schemas
    interfaces.push(generateTypeScriptFromZod(ImageSchema, 'Image'));
    interfaces.push(generateTypeScriptFromZod(MultimediaSchema, 'Multimedia'));
    interfaces.push(generateTypeScriptFromZod(HeadlineSchema, 'Headline'));
    interfaces.push(generateTypeScriptFromZod(BylineSchema, 'Byline'));
    interfaces.push(generateTypeScriptFromZod(KeywordSchema, 'Keyword'));
    interfaces.push(generateTypeScriptFromZod(ArticleSchema, 'Article'));
    interfaces.push(generateTypeScriptFromZod(MetaSchema, 'Meta'));
    interfaces.push(generateTypeScriptFromZod(ResponseSchema, 'Response'));
    interfaces.push(generateTypeScriptFromZod(NytApiResponseSchema, 'NytApiResponse'));
    interfaces.push(generateTypeScriptFromZod(SearchParamsSchema, 'SearchParams'));
    
    // Add legacy type aliases
    interfaces.push(`
// Legacy type aliases for backward compatibility
export type NytMultimedia = Multimedia;
export type NytMultimediaImage = Image;
export type NytHeadline = Headline;
export type NytArticle = Article;
`);
    
    // Write to generated file
    const outputPath = path.join(__dirname, '../src/types/nyt.generated.ts');
    const content = `// Auto-generated TypeScript interfaces from Zod schemas
// Generated on: ${new Date().toISOString()}
// Do not edit manually - regenerate using: bun run gen:types

${interfaces.join('\n\n')}
`;
    
    fs.writeFileSync(outputPath, content);
    console.log(`✅ Wrote ${interfaces.length - 1} types to src/types/nyt.generated.ts`);
    
  } catch (error) {
    console.error('Error generating types:', error);
  }
}

main();
