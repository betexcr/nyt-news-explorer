#!/bin/bash

echo "Installing Zod, Swagger UI, and helpers..."
bun add zod zod-to-ts swagger-ui-express
bun add -D @types/swagger-ui-express

echo "Creating Zod schema file..."
mkdir -p src/schemas

cat > src/schemas/zodSchemas.ts << 'EOF'
import { z } from "zod";

export const NytMediaItem = z.object({
  url: z.string(),
  type: z.string(),
  subtype: z.string().optional(),
  caption: z.string().optional(),
  copyright: z.string().optional(),
  height: z.number().optional(),
  width: z.number().optional(),
  legacy: z
    .object({
      xlarge: z.string().optional(),
      thumbnail: z.string().optional(),
      wide: z.string().optional(),
    })
    .optional(),
});

export const NytByline = z.object({
  original: z.string().optional(),
  person: z
    .array(
      z.object({
        firstname: z.string().optional(),
        middlename: z.string().optional(),
        lastname: z.string().optional(),
        organization: z.string().optional(),
      })
    )
    .optional(),
  organization: z.string().optional(),
});

export const NytHeadline = z.object({
  main: z.string(),
  kicker: z.string().optional(),
  print_headline: z.string().optional(),
});

export const NytArticle = z.object({
  _id: z.string(),
  web_url: z.string(),
  snippet: z.string(),
  lead_paragraph: z.string().optional(),
  multimedia: z.array(NytMediaItem),
  headline: NytHeadline,
  pub_date: z.string(),
  section_name: z.string().optional(),
  byline: NytByline.optional(),
});
EOF

echo "Creating Swagger setup in Express..."
mkdir -p src/swagger

cat > src/swagger/openapi.json << 'EOF'
{
  "openapi": "3.0.0",
  "info": {
    "title": "NYT News Explorer API",
    "version": "1.0.0"
  },
  "paths": {
    "/api/articles": {
      "get": {
        "summary": "Get NYT articles",
        "responses": {
          "200": {
            "description": "List of articles",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NytArticle"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "NytArticle": {
        "type": "object",
        "properties": {
          "_id": { "type": "string" },
          "web_url": { "type": "string" },
          "snippet": { "type": "string" },
          "lead_paragraph": { "type": "string" },
          "multimedia": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/NytMediaItem" }
          },
          "headline": {
            "type": "object",
            "properties": {
              "main": { "type": "string" },
              "kicker": { "type": "string" },
              "print_headline": { "type": "string" }
            }
          },
          "pub_date": { "type": "string" },
          "section_name": { "type": "string" },
          "byline": {
            "type": "object",
            "properties": {
              "original": { "type": "string" },
              "organization": { "type": "string" }
            }
          }
        }
      },
      "NytMediaItem": {
        "type": "object",
        "properties": {
          "url": { "type": "string" },
          "type": { "type": "string" },
          "subtype": { "type": "string" },
          "caption": { "type": "string" },
          "copyright": { "type": "string" },
          "height": { "type": "number" },
          "width": { "type": "number" },
          "legacy": {
            "type": "object",
            "properties": {
              "xlarge": { "type": "string" },
              "thumbnail": { "type": "string" },
              "wide": { "type": "string" }
            }
          }
        }
      }
    }
  }
}
EOF

echo "Patching your Express server with Swagger UI..."

cat >> src/index.ts << 'EOF'

/**
 * Swagger UI setup
 */
import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger/openapi.json";

const app = express();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

console.log("Swagger UI available at http://localhost:3000/api-docs");
EOF

echo "✅ Done. You can now open Swagger at http://localhost:3000/api-docs"