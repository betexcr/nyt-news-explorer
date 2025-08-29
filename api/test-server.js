const fastify = require('fastify')

async function testServer() {
  const server = fastify({
    logger: true
  })

  server.get('/', async (request, reply) => {
    return { hello: 'world' }
  })

  try {
    await server.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Test server running on port 3000')
  } catch (err) {
    console.error('Error starting test server:', err)
    process.exit(1)
  }
}

testServer()