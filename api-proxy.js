const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for your domain
app.use(cors({
  origin: ['https://nyt.brainvaultdev.com', 'http://localhost:3000'],
  credentials: true
}));

// Proxy API requests to your local API server
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.url} to localhost:3000`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Response: ${proxyRes.statusCode} for ${req.url}`);
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API Proxy running on port ${PORT}`);
  console.log(`Proxying /api/* to http://localhost:3000/api/*`);
});
