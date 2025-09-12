/* eslint-disable @typescript-eslint/no-var-requires */
const { createProxyMiddleware } = require('http-proxy-middleware');

// CRA dev server proxy to avoid CORS when calling external GraphQL on Vercel
// Usage: set VERCEL_GRAPHQL_URL to your deployed API URL (e.g., https://...vercel.app/api)
module.exports = function(app) {
  const target = process.env.VERCEL_GRAPHQL_URL;
  if (!target) return;
  app.use(
    '/graphql',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: true,
      pathRewrite: {
        '^/graphql': '',
      },
      onProxyReq(proxyReq) {
        // Ensure JSON content type for GraphQL POSTs
        if (!proxyReq.getHeader('content-type')) {
          proxyReq.setHeader('content-type', 'application/json');
        }
      },
      logLevel: 'silent',
    })
  );
};



