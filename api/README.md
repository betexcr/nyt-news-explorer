# NYT News Explorer API v1

🚀 **High-performance, secure Node.js API following modern best practices**

A comprehensive implementation of a modern web API following RFC standards and security best practices, featuring OAuth 2.0 with PKCE, JWT hardening, OWASP API Security compliance, and enterprise-grade observability.

## ✨ Features

### 🔒 Security (RFC 9700, RFC 8725, OWASP)
- **OAuth 2.0 Security BCP (RFC 9700)**: Authorization Code + PKCE flow, no implicit grants, exact-match redirects, token rotation
- **JWT Hardening (RFC 8725)**: iss/aud/exp/nbf validation, JWKS rotation, short-lived access tokens, sender-constrained tokens
- **OWASP API Security Top 10**: BOLA/BOPLA prevention, schema validation, unbounded resource consumption protection
- **Transport Security**: TLS 1.3, HTTP/3 over QUIC support, automatic mTLS in service mesh
- **Security Headers**: Comprehensive helmet configuration, CSP, HSTS, frame protection

### ⚡ Performance & Scalability
- **Modern HTTP**: HTTP/3, TLS 1.3, connection multiplexing, 0-RTT/1-RTT optimization
- **Compression**: Brotli (browsers), zstd (server-to-server), intelligent content-type detection
- **Caching**: ETag + conditional requests, Redis distributed cache, optimistic concurrency control
- **Rate Limiting**: Token bucket + leaky bucket algorithms, distributed Redis-based limiting, jitter

### 🛡️ Resilience Patterns
- **Circuit Breakers**: Opossum-based circuit breakers with fallbacks, health monitoring
- **Bulkheads**: Isolation for different endpoint categories, concurrent request limiting  
- **Retries**: Exponential backoff with jitter, thundering herd prevention
- **Idempotency**: Safe retries with idempotency keys for POST operations

### 📊 Observability (OpenTelemetry)
- **Tracing**: End-to-end distributed tracing with W3C Trace Context propagation
- **Metrics**: RED/Four Golden Signals, custom business metrics, performance monitoring
- **Logging**: Structured JSON logs, correlation IDs, PII protection, log sampling
- **Monitoring**: Prometheus integration, Jaeger tracing, health checks, SLO monitoring

### 🏗️ API Design
- **Problem Details (RFC 9457)**: Machine-readable, consistent error responses
- **GraphQL**: Complete schema with APQ, DataLoader for N+1 elimination
- **OpenAPI 3.0**: Comprehensive documentation with security schemes, examples
- **RESTful**: Proper HTTP semantics, resource-based design, HATEOAS principles

### ☸️ Cloud Native & Kubernetes
- **Production-Ready**: Multi-stage Docker build, security hardening, non-root user
- **Kubernetes**: Complete manifests with security context, probes, network policies
- **Autoscaling**: HPA with multiple metrics (CPU, memory, custom), VPA support
- **Service Mesh**: Istio/Linkerd integration, automatic mTLS, traffic management

## 🏛️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Gateway API   │    │   Kubernetes    │    │   Service Mesh  │
│   (HTTP/3 TLS)  │────│   (Autoscaling) │────│   (mTLS, LB)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Fastify     │    │  Circuit Break  │    │      Redis      │
│   (Rate Limit)  │────│   (Resilience)  │────│    (Cache)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   OpenTelemetry │    │     GraphQL     │    │   External APIs │
│   (Observability)     │   (Optimized)  │    │   (NYT, OAuth) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Redis 6+
- NYT API Key
- Docker (optional)
- Kubernetes cluster (for production)

### Development Setup

```bash
# Clone and setup
git checkout node-js-api-v1
cd api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start Redis (Docker)
docker run -d -p 6379:6379 redis:alpine

# Build and run
npm run build
npm start

# Or development mode
npm run dev
```

### Docker Deployment

```bash
# Build production image
docker build -t nyt-api:v1.0.0 .

# Run with Redis
docker-compose up -d
```

### Kubernetes Deployment

```bash
# Apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml  # Configure secrets first
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

# Check status
kubectl get pods -n nyt-news-api
kubectl get svc -n nyt-news-api
```

## 📚 API Documentation

- **Interactive Docs**: `http://localhost:3000/docs`
- **OpenAPI Spec**: `http://localhost:3000/openapi.json`
- **Health Checks**: `http://localhost:3000/health`
- **Metrics**: `http://localhost:3000/metrics`

### Key Endpoints

```bash
# Authentication (OAuth 2.0 + PKCE)
POST /api/v1/auth/login
POST /api/v1/auth/register  
GET  /api/v1/auth/authorize
POST /api/v1/auth/token
POST /api/v1/auth/refresh

# Articles (with caching, rate limiting)
GET  /api/v1/articles/search?q=technology
GET  /api/v1/articles/archive/2024/1
GET  /api/v1/articles/top-stories/technology

# User Features (authentication required)
GET  /api/v1/favorites
POST /api/v1/favorites
PATCH /api/v1/favorites/:id
DELETE /api/v1/favorites/:id

# GraphQL (with APQ, DataLoader)
POST /api/v1/graphql

# Admin (admin role required)
GET  /api/v1/admin/metrics
DELETE /api/v1/admin/cache
POST /api/v1/admin/circuit-breakers/:name/:action
```

## 🛠️ Configuration

### Environment Variables

```bash
# Security
JWT_SECRET=your-256-bit-secret
OAUTH_CLIENT_ID=your-oauth-client-id
NYT_API_KEY=your-nyt-api-key

# Performance
RATE_LIMIT_MAX=100
REDIS_HOST=localhost
ENABLE_HTTP3=true

# Observability  
OTEL_SERVICE_NAME=nyt-news-api
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
LOG_LEVEL=info
```

### Security Hardening

```bash
# Generate strong JWT secret (256+ bits)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate TLS certificates
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Configure OAuth 2.0 provider
# - Set exact redirect URIs
# - Enable PKCE
# - Use Authorization Code flow only
```

## 🔍 Monitoring & Observability

### Health Checks
```bash
# Basic health
curl http://localhost:3000/health

# Detailed health (dependencies)
curl http://localhost:3000/health/detailed

# Kubernetes probes
curl http://localhost:3000/ready   # Readiness
curl http://localhost:3000/live    # Liveness  
curl http://localhost:3000/startup # Startup
```

### Circuit Breakers
```bash
# View status
curl http://localhost:3000/health/circuit-breakers

# Admin controls
curl -X POST http://localhost:3000/api/v1/admin/circuit-breakers/external/open
curl -X POST http://localhost:3000/api/v1/admin/circuit-breakers/external/reset
```

### Performance Metrics
```bash
# System metrics
curl http://localhost:3000/api/v1/admin/metrics

# Cache management
curl -X DELETE http://localhost:3000/api/v1/admin/cache?pattern=search:*
curl -X POST http://localhost:3000/api/v1/admin/cache/warmup
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# Security scan
npm audit
docker scan nyt-api:v1.0.0
```

## 📋 Compliance & Standards

### RFC Compliance
- ✅ **RFC 9700**: OAuth 2.0 Security Best Current Practice
- ✅ **RFC 8725**: JSON Web Token Best Current Practices  
- ✅ **RFC 9457**: Problem Details for HTTP APIs
- ✅ **RFC 7519**: JSON Web Tokens
- ✅ **RFC 6749**: OAuth 2.0 Authorization Framework

### Security Standards
- ✅ **OWASP API Security Top 10 (2023)**
- ✅ **NIST Cybersecurity Framework**
- ✅ **CIS Security Controls**
- ✅ **SANS Secure Coding Practices**

### Cloud Native
- ✅ **12-Factor App Methodology**
- ✅ **CNCF Security Standards**
- ✅ **Kubernetes Security Best Practices**
- ✅ **Container Security (NIST SP 800-190)**

## 🐛 Troubleshooting

### Common Issues

**TypeScript Compilation Errors**
```bash
# Install missing type definitions
npm install --save-dev @types/opossum @types/js-yaml

# Update plugin imports to default exports
# Fix config object properties (isDevelopment, isProduction)
```

**Redis Connection Issues**
```bash
# Check Redis status
redis-cli ping

# Update connection settings
export REDIS_HOST=localhost
export REDIS_PORT=6379
```

**Rate Limiting Too Strict**
```bash
# Adjust limits for development
export RATE_LIMIT_MAX=1000
export RATE_LIMIT_WINDOW_MS=60000
```

### Performance Tuning

**Memory Optimization**
```bash
# Adjust Node.js memory
export NODE_OPTIONS="--max-old-space-size=2048"

# Tune cache TTL values
# Optimize Redis memory usage
```

**CPU Optimization**
```bash
# Enable clustering (production)
# Optimize circuit breaker timeouts
# Tune rate limiting algorithms
```

## 🤝 Contributing

1. Follow security best practices
2. Add comprehensive tests
3. Update documentation  
4. Ensure zero ESLint warnings
5. Run security audits

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Resources

- [RFC 9700 - OAuth 2.0 Security BCP](https://tools.ietf.org/rfc/rfc9700.txt)
- [RFC 8725 - JWT Best Practices](https://tools.ietf.org/rfc/rfc8725.txt) 
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Fastify Documentation](https://fastify.dev/)
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/languages/js/)
- [Kubernetes Security](https://kubernetes.io/docs/concepts/security/)

---

**Built with ❤️ following modern security and performance best practices**