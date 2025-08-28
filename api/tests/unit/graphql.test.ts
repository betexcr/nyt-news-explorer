import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest'
import fastify, { FastifyInstance } from 'fastify'
import { registerPlugins } from '@/plugins/index-simple.js'
import { graphqlRoutes } from '@/routes/graphql.js'

const gql = (q: string) => ({ query: q })

const queryTopStories = `{
  topStories(section: HOME) { id title url }
}`

describe('GraphQL (Yoga and Apollo)', () => {
  let app: FastifyInstance
  const realFetch = global.fetch as any

  beforeAll(async () => {
    app = fastify({ logger: false })
    await registerPlugins(app)
    await app.register(async (f) => f.register(graphqlRoutes, { prefix: '/graphql' }))
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      // minimal stubs by endpoint flavor
      if (url.includes('/topstories/')) {
        return {
          ok: true,
          json: async () => ({ results: [{ url: 'u', title: 't', abstract: 'a', published_date: 'p', byline: 'b', section: 's' }] })
        } as any
      }
      if (url.includes('/archive/')) {
        return {
          ok: true,
          json: async () => ({ response: { docs: [{ _id: 'id1', web_url: 'w', headline: { main: 'h' }, abstract: 'a', pub_date: '2020-01-02T00:00:00Z' }] } })
        } as any
      }
      if (url.includes('/books/v3/lists/names.json')) {
        return {
          ok: true,
          json: async () => ({ results: [{ list_name: 'Hardcover Fiction', display_name: 'Hardcover Fiction', list_name_encoded: 'hardcover-fiction', updated: 'WEEKLY' }] })
        } as any
      }
      if (url.includes('/books/v3/lists/')) {
        return {
          ok: true,
          json: async () => ({ results: { list_name: 'Hardcover Fiction', display_name: 'Hardcover Fiction', updated: 'WEEKLY', books: [{ title: 'X', author: 'Y', description: 'Z', publisher: 'P', rank: 1, weeks_on_list: 2, amazon_product_url: 'A', book_image: 'I', isbns: [{ isbn13: '123' }] }] } })
        } as any
      }
      if (url.includes('/mostpopular/v2/')) {
        return {
          ok: true,
          json: async () => ({ results: [{ id: 1, url: 'u', title: 't', abstract: 'a', published_date: 'p', section: 's', byline: 'b' }] })
        } as any
      }
      return { ok: true, json: async () => ({}) } as any
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    global.fetch = realFetch
  })

  it('responds via Yoga at /graphql with correlation id', async () => {
    const correlationId = 'gql-yoga-123'
    const res = await app.inject({
      method: 'POST',
      url: '/graphql/',
      headers: { 'content-type': 'application/json', 'x-correlation-id': correlationId },
      payload: gql(queryTopStories)
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['x-correlation-id']).toBe(correlationId)
    const body = JSON.parse(res.body)
    expect(body).toHaveProperty('data.topStories')
  })

  it('responds via Apollo at /graphql/apollo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/graphql/apollo',
      headers: { 'content-type': 'application/json' },
      payload: gql(queryTopStories)
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toHaveProperty('data.topStories')
  })

  it('supports listNames and bestsellers', async () => {
    const res1 = await app.inject({ method: 'POST', url: '/graphql/', headers: { 'content-type': 'application/json' }, payload: gql(`{ listNames { listName displayName } }`) })
    expect(res1.statusCode).toBe(200)
    const j1 = JSON.parse(res1.body)
    expect(j1.data.listNames.length).toBeGreaterThan(0)

    const res2 = await app.inject({ method: 'POST', url: '/graphql/', headers: { 'content-type': 'application/json' }, payload: gql(`{ bestsellers(list: "hardcover-fiction") { listName books { title author } } }`) })
    expect(res2.statusCode).toBe(200)
    const j2 = JSON.parse(res2.body)
    expect(j2.data.bestsellers.books.length).toBeGreaterThan(0)
  })

  it('supports mostPopular and archiveByDay', async () => {
    const mp = await app.inject({ method: 'POST', url: '/graphql/', headers: { 'content-type': 'application/json' }, payload: gql(`{ mostPopular(category: VIEWED, period: 1) { id title } }`) })
    expect(mp.statusCode).toBe(200)

    const abd = await app.inject({ method: 'POST', url: '/graphql/', headers: { 'content-type': 'application/json' }, payload: gql(`{ archiveByDay(year: 2020, month: 1, day: 2, limit: 5) { id title } }`) })
    expect(abd.statusCode).toBe(200)
  })
})

