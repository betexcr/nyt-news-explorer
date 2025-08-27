import { z } from 'zod';
import crypto from 'crypto';
/**
 * Favorites routes with user-specific data management
 * - CRUD operations for user favorites
 * - Idempotency support
 * - Optimistic concurrency with ETags
 * - Proper authorization checks
 */
const addFavoriteSchema = z.object({
    articleId: z.string().min(1, 'Article ID is required'),
    url: z.string().url('Valid URL is required'),
    title: z.string().min(1, 'Title is required'),
    abstract: z.string().optional(),
    publishedDate: z.string().datetime().optional(),
    section: z.string().optional(),
    author: z.string().optional(),
    imageUrl: z.string().url().optional(),
});
const updateFavoriteSchema = z.object({
    title: z.string().min(1).optional(),
    notes: z.string().max(1000).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
});
export async function favoritesRoutes(fastify) {
    // Get user's favorites
    fastify.get('/', {
        schema: {
            tags: ['Favorites'],
            summary: 'Get User Favorites',
            description: 'Retrieve all favorites for the authenticated user',
            security: [{ BearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'integer', minimum: 0, default: 0 },
                    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                    sort: { type: 'string', enum: ['created_asc', 'created_desc', 'title_asc', 'title_desc'], default: 'created_desc' },
                    tag: { type: 'string', description: 'Filter by tag' },
                    search: { type: 'string', description: 'Search in title and notes' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        favorites: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    articleId: { type: 'string' },
                                    url: { type: 'string' },
                                    title: { type: 'string' },
                                    abstract: { type: 'string' },
                                    publishedDate: { type: 'string' },
                                    section: { type: 'string' },
                                    author: { type: 'string' },
                                    imageUrl: { type: 'string' },
                                    notes: { type: 'string' },
                                    tags: { type: 'array', items: { type: 'string' } },
                                    createdAt: { type: 'string' },
                                    updatedAt: { type: 'string' },
                                },
                            },
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                page: { type: 'integer' },
                                limit: { type: 'integer' },
                                total: { type: 'integer' },
                                pages: { type: 'integer' },
                            },
                        },
                    },
                },
                401: { $ref: '#/components/responses/401' },
            },
        },
    }, async (request, reply) => {
        try {
            const userId = request.user.id;
            const query = request.query;
            // Build cache key
            const cacheKey = `favorites:${userId}:${crypto.createHash('md5').update(JSON.stringify(query)).digest('hex')}`;
            // Check cache first
            const cached = await fastify.cache.get(cacheKey);
            if (cached) {
                const etag = `"${crypto.createHash('md5').update(JSON.stringify(cached)).digest('hex')}"`;
                if (request.headers['if-none-match'] === etag) {
                    return reply.code(304).header('etag', etag).send();
                }
                return reply
                    .header('etag', etag)
                    .header('x-cache', 'HIT')
                    .send(cached);
            }
            // Get favorites from storage (placeholder implementation)
            const favorites = await getUserFavorites(userId, query);
            // Cache the response for 5 minutes
            await fastify.cache.set(cacheKey, favorites, 300);
            const etag = `"${crypto.createHash('md5').update(JSON.stringify(favorites)).digest('hex')}"`;
            reply
                .header('etag', etag)
                .header('cache-control', 'private, max-age=300')
                .header('x-cache', 'MISS')
                .send(favorites);
        }
        catch (error) {
            request.log.error({ error, userId: request.user?.id }, 'Failed to get favorites');
            reply.code(500).send({
                type: 'https://api.nyt-news-explorer.com/problems/favorites-fetch-failed',
                title: 'Failed to Fetch Favorites',
                status: 500,
                detail: 'Unable to retrieve favorites',
                instance: request.url,
                correlationId: request.headers['x-correlation-id'],
            });
        }
    });
    // Add a favorite (idempotent)
    fastify.post('/', {
        schema: {
            tags: ['Favorites'],
            summary: 'Add Favorite',
            description: 'Add an article to user favorites (idempotent)',
            security: [{ BearerAuth: [] }],
            headers: {
                type: 'object',
                properties: {
                    'x-idempotency-key': { type: 'string', description: 'Idempotency key for safe retries' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    articleId: { type: 'string', minLength: 1 },
                    url: { type: 'string', format: 'uri' },
                    title: { type: 'string', minLength: 1 },
                    abstract: { type: 'string' },
                    publishedDate: { type: 'string', format: 'date-time' },
                    section: { type: 'string' },
                    author: { type: 'string' },
                    imageUrl: { type: 'string', format: 'uri' },
                    notes: { type: 'string', maxLength: 1000 },
                    tags: { type: 'array', items: { type: 'string', maxLength: 50 }, maxItems: 10 },
                },
                required: ['articleId', 'url', 'title'],
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        articleId: { type: 'string' },
                        message: { type: 'string' },
                        created: { type: 'boolean' },
                    },
                },
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        articleId: { type: 'string' },
                        message: { type: 'string' },
                        created: { type: 'boolean' },
                    },
                },
                400: { $ref: '#/components/responses/400' },
                401: { $ref: '#/components/responses/401' },
            },
        },
    }, async (request, reply) => {
        try {
            const userId = request.user.id;
            const favoriteData = addFavoriteSchema.parse(request.body);
            const idempotencyKey = request.headers['x-idempotency-key'];
            // Handle idempotency
            if (idempotencyKey) {
                const idempotencyCache = await fastify.cache.get(`idempotency:${idempotencyKey}`);
                if (idempotencyCache) {
                    return reply.code(200).send(idempotencyCache);
                }
            }
            // Check if favorite already exists
            const existingFavorite = await getUserFavoriteByArticleId(userId, favoriteData.articleId);
            let favorite;
            let created = false;
            let statusCode = 200;
            if (existingFavorite) {
                favorite = existingFavorite;
            }
            else {
                // Create new favorite
                favorite = {
                    id: crypto.randomUUID(),
                    userId,
                    articleId: favoriteData.articleId,
                    url: favoriteData.url,
                    title: favoriteData.title,
                    abstract: favoriteData.abstract,
                    publishedDate: favoriteData.publishedDate,
                    section: favoriteData.section,
                    author: favoriteData.author,
                    imageUrl: favoriteData.imageUrl,
                    notes: request.body.notes || '',
                    tags: request.body.tags || [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await saveFavorite(favorite);
                created = true;
                statusCode = 201;
                // Invalidate cache
                await fastify.invalidateCache([`favorites:${userId}:*`]);
            }
            const response = {
                id: favorite.id,
                articleId: favorite.articleId,
                message: created ? 'Favorite added successfully' : 'Article already in favorites',
                created,
            };
            // Cache idempotency result
            if (idempotencyKey) {
                await fastify.cache.set(`idempotency:${idempotencyKey}`, response, 3600); // 1 hour
            }
            reply.code(statusCode).send(response);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({
                    type: 'https://api.nyt-news-explorer.com/problems/invalid-favorite-data',
                    title: 'Invalid Favorite Data',
                    status: 400,
                    detail: 'The favorite data provided is invalid',
                    instance: request.url,
                    errors: error.errors,
                    correlationId: request.headers['x-correlation-id'],
                });
            }
            request.log.error({ error, userId: request.user?.id }, 'Failed to add favorite');
            reply.code(500).send({
                type: 'https://api.nyt-news-explorer.com/problems/favorite-add-failed',
                title: 'Failed to Add Favorite',
                status: 500,
                detail: 'Unable to add article to favorites',
                instance: request.url,
                correlationId: request.headers['x-correlation-id'],
            });
        }
    });
    // Update a favorite
    fastify.patch('/:id', {
        schema: {
            tags: ['Favorites'],
            summary: 'Update Favorite',
            description: 'Update favorite notes and tags with optimistic concurrency',
            security: [{ BearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'Favorite ID' },
                },
                required: ['id'],
            },
            headers: {
                type: 'object',
                properties: {
                    'if-match': { type: 'string', description: 'ETag for optimistic concurrency' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    title: { type: 'string', minLength: 1 },
                    notes: { type: 'string', maxLength: 1000 },
                    tags: { type: 'array', items: { type: 'string', maxLength: 50 }, maxItems: 10 },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        message: { type: 'string' },
                        updatedAt: { type: 'string' },
                    },
                },
                400: { $ref: '#/components/responses/400' },
                401: { $ref: '#/components/responses/401' },
                404: { $ref: '#/components/responses/404' },
                412: {
                    description: 'Precondition Failed (ETag mismatch)',
                    content: {
                        'application/problem+json': {
                            schema: { $ref: '#/components/schemas/ProblemDetails' },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const userId = request.user.id;
            const { id } = request.params;
            const updates = updateFavoriteSchema.parse(request.body);
            const ifMatch = request.headers['if-match'];
            // Get existing favorite
            const favorite = await getUserFavoriteById(userId, id);
            if (!favorite) {
                return reply.code(404).send({
                    type: 'https://api.nyt-news-explorer.com/problems/favorite-not-found',
                    title: 'Favorite Not Found',
                    status: 404,
                    detail: 'The requested favorite was not found',
                    instance: request.url,
                    correlationId: request.headers['x-correlation-id'],
                });
            }
            // Check ETag for optimistic concurrency
            if (ifMatch) {
                const currentEtag = `"${crypto.createHash('md5').update(JSON.stringify(favorite)).digest('hex')}"`;
                if (ifMatch !== currentEtag) {
                    return reply.code(412).send({
                        type: 'https://api.nyt-news-explorer.com/problems/precondition-failed',
                        title: 'Precondition Failed',
                        status: 412,
                        detail: 'The If-Match header does not match the current ETag. The favorite may have been modified.',
                        instance: request.url,
                        currentEtag,
                        providedEtag: ifMatch,
                        correlationId: request.headers['x-correlation-id'],
                    });
                }
            }
            // Update favorite
            const updatedFavorite = {
                ...favorite,
                ...updates,
                updatedAt: new Date().toISOString(),
            };
            await updateFavorite(updatedFavorite);
            // Invalidate cache
            await fastify.invalidateCache([`favorites:${userId}:*`]);
            const newEtag = `"${crypto.createHash('md5').update(JSON.stringify(updatedFavorite)).digest('hex')}"`;
            reply
                .header('etag', newEtag)
                .send({
                id,
                message: 'Favorite updated successfully',
                updatedAt: updatedFavorite.updatedAt,
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({
                    type: 'https://api.nyt-news-explorer.com/problems/invalid-update-data',
                    title: 'Invalid Update Data',
                    status: 400,
                    detail: 'The update data provided is invalid',
                    instance: request.url,
                    errors: error.errors,
                    correlationId: request.headers['x-correlation-id'],
                });
            }
            request.log.error({ error, favoriteId: request.params }, 'Failed to update favorite');
            reply.code(500).send({
                type: 'https://api.nyt-news-explorer.com/problems/favorite-update-failed',
                title: 'Failed to Update Favorite',
                status: 500,
                detail: 'Unable to update favorite',
                instance: request.url,
                correlationId: request.headers['x-correlation-id'],
            });
        }
    });
    // Delete a favorite
    fastify.delete('/:id', {
        schema: {
            tags: ['Favorites'],
            summary: 'Delete Favorite',
            description: 'Remove an article from user favorites',
            security: [{ BearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'Favorite ID' },
                },
                required: ['id'],
            },
            response: {
                204: { description: 'Favorite deleted successfully' },
                401: { $ref: '#/components/responses/401' },
                404: { $ref: '#/components/responses/404' },
            },
        },
    }, async (request, reply) => {
        try {
            const userId = request.user.id;
            const { id } = request.params;
            // Check if favorite exists and belongs to user
            const favorite = await getUserFavoriteById(userId, id);
            if (!favorite) {
                return reply.code(404).send({
                    type: 'https://api.nyt-news-explorer.com/problems/favorite-not-found',
                    title: 'Favorite Not Found',
                    status: 404,
                    detail: 'The requested favorite was not found',
                    instance: request.url,
                    correlationId: request.headers['x-correlation-id'],
                });
            }
            // Delete favorite
            await deleteFavorite(userId, id);
            // Invalidate cache
            await fastify.invalidateCache([`favorites:${userId}:*`]);
            reply.code(204).send();
        }
        catch (error) {
            request.log.error({ error, favoriteId: request.params }, 'Failed to delete favorite');
            reply.code(500).send({
                type: 'https://api.nyt-news-explorer.com/problems/favorite-delete-failed',
                title: 'Failed to Delete Favorite',
                status: 500,
                detail: 'Unable to delete favorite',
                instance: request.url,
                correlationId: request.headers['x-correlation-id'],
            });
        }
    });
}
// Placeholder database functions - implement with your storage system
async function getUserFavorites(userId, query) {
    // This should query your database for user's favorites
    return {
        favorites: [],
        pagination: {
            page: query.page || 0,
            limit: query.limit || 20,
            total: 0,
            pages: 0,
        },
    };
}
async function getUserFavoriteByArticleId(userId, articleId) {
    // Check if user already has this article in favorites
    return null;
}
async function getUserFavoriteById(userId, favoriteId) {
    // Get specific favorite by ID
    return null;
}
async function saveFavorite(favorite) {
    // Save favorite to database
}
async function updateFavorite(favorite) {
    // Update favorite in database
}
async function deleteFavorite(userId, favoriteId) {
    // Delete favorite from database
}
