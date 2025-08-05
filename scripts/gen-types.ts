import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

interface SwaggerDefinition {
  definitions: Record<string, any>;
}

function generateTypeScriptInterface(name: string, schema: any): string {
  if (schema.type === 'object' && schema.properties) {
    const properties: string[] = [];
    
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const propType = getTypeScriptType(propName, propSchema);
      const required = schema.required?.includes(propName) ? '' : '?';
      properties.push(`  ${propName}${required}: ${propType};`);
    }
    
    return `export interface ${name} {
${properties.join('\n')}
}`;
  }
  
  return `export interface ${name} {
  // TODO: Implement for ${schema.type} type
}`;
}

function getTypeScriptType(propName: string, schema: any): string {
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    return refName;
  }
  
  switch (schema.type) {
    case 'string':
      return 'string';
    case 'integer':
      return 'number';
    case 'array':
      if (schema.items?.$ref) {
        const refName = schema.items.$ref.split('/').pop();
        return `${refName}[]`;
      }
      return 'any[]';
    case 'object':
      return 'any';
    default:
      return 'any';
  }
}

function main() {
  try {
    // Read the YAML file
    const yamlPath = path.join(__dirname, '../articlesearch-product.yaml');
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const swagger = yaml.load(yamlContent) as SwaggerDefinition;
    
    if (!swagger.definitions) {
      console.error('No definitions found in YAML file');
      return;
    }
    
    const interfaces: string[] = [];
    
    // Generate interfaces for each definition
    for (const [name, schema] of Object.entries(swagger.definitions)) {
      const interfaceCode = generateTypeScriptInterface(name, schema);
      interfaces.push(interfaceCode);
    }
    
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
    const content = `// Auto-generated TypeScript interfaces from YAML schema
// Generated on: ${new Date().toISOString()}
// Do not edit manually - regenerate using: npm run gen:types

${interfaces.join('\n\n')}
`;
    
    fs.writeFileSync(outputPath, content);
    console.log(`✅ Wrote ${Object.keys(swagger.definitions).length} types to src/types/nyt.generated.ts`);
    
  } catch (error) {
    console.error('Error generating types:', error);
  }
}

main();
