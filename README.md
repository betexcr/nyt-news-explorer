# NYT News Explorer

[![Tests](https://github.com/betexcr/nyt-news-explorer/actions/workflows/test.yml/badge.svg)](https://github.com/betexcr/nyt-news-explorer/actions/workflows/test.yml)
[![Deploy](https://github.com/betexcr/nyt-news-explorer/actions/workflows/deploy.yml/badge.svg)](https://github.com/betexcr/nyt-news-explorer/actions/workflows/deploy.yml)
[![Code Coverage](https://img.shields.io/badge/coverage-73.27%25-brightgreen)](https://github.com/betexcr/nyt-news-explorer)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0-orange)](https://bun.sh/)
[![View Transitions](https://img.shields.io/badge/View%20Transitions-API-brightgreen)](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)

A modern React application for exploring and searching articles from The New York Times API, featuring comprehensive API documentation, advanced search capabilities, and smooth View Transitions for an enhanced user experience.

## Features

### Core Functionality
- **Powerful Search**: Debounced search with simple and advanced modes (sort, section, date range)
- **Interactive API Docs**: Built‑in Swagger UI backed by local OpenAPI specs
- **Favorites**: Add/remove favorites anywhere, with persistent storage
- **View Modes**: Grid, List, and Table views with consistent controls
- **Card Resizing & Full‑Width**: Grid cards can be resized or expanded to full width (Search, Trending, Top Stories)
- **Infinite Scrolling**: Seamless load‑more; 12 results per page
- **Virtualized Lists**: Virtual scrolling in list mode for smooth performance with large result sets
- **Modern UI**: Clean, responsive design with dark/light theme toggle
- **Performance Optimizations**: Debounce, virtualization, and efficient rendering

### 🎬 View Transitions Integration
- **Smooth Navigation**: Seamless page transitions with View Transitions API
- **Image Transitions**: Hero images and article cards animate smoothly between pages
- **Cross-Browser Support**: Graceful fallbacks for browsers without View Transitions support
- **Performance Optimized**: 60fps smooth animations with minimal performance impact
- **Accessibility**: Respects `prefers-reduced-motion` for users with motion sensitivity

### API Documentation
- 📖 **SwaggerUI Integration**: Interactive API documentation with full OpenAPI 2.0 specification
- 🔗 **Entity Definitions**: Complete documentation of all API entities (Article, Byline, Headline, etc.)
- 🧪 **Try It Out**: Test API endpoints directly from the documentation
- 📋 **Parameter Reference**: Detailed parameter descriptions and examples
- 🔐 **Authentication Guide**: API key setup and usage instructions

### Enterprise CI/CD Pipeline
- **Multi-Stage Testing**: API unit tests, integration tests, and frontend tests with comprehensive coverage
- **Automated Deployment**: GitHub Actions workflow with conditional deployment based on test success
- **Deployment Validation**: Post-deployment health checks and accessibility testing
- **Security Scanning**: OWASP ZAP integration for vulnerability detection
- **Performance Testing**: k6 load testing and Artillery scenario testing
- **Container Orchestration**: Kubernetes manifests for scalable deployment
- **Monitoring & Observability**: OpenTelemetry integration with distributed tracing
- **Robust Deployment**: Fixed deployment scripts with proper error handling and lftp compatibility

## Tech Stack

- **Frontend**: React 18, TypeScript, CSS3
- **Backend API**: Node.js, Fastify, OpenAPI 3.0
- **State Management**: Zustand
- **API**: New York Times Article Search API v2
- **API Documentation**: SwaggerUI, OpenAPI 2.0
- **Build Tool**: Bun
- **Testing**: Jest, React Testing Library, k6, Artillery (comprehensive coverage)
- **CI/CD**: GitHub Actions with multi-stage pipelines
- **Deployment**: Hostinger Git Deployment + Kubernetes (EKS)
- **Security**: OWASP ZAP, OAuth 2.0 with PKCE, JWT hardening
- **Performance**: Redis caching, rate limiting, circuit breakers
- **Monitoring**: OpenTelemetry, distributed tracing, metrics collection
- **View Transitions**: Modern CSS animations with View Transitions API
- **CORS Handling**: Comprehensive proxy configuration with fallback mechanisms

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- NYT API Key (get from [NYT Developer Portal](https://developer.nytimes.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/betexcr/nyt-news-explorer.git
cd nyt-news-explorer

# Install dependencies
bun install

# Generate TypeScript types from Zod schemas
bun run gen:types

# Start development server
bun run start
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# New York Times API Key (required)
REACT_APP_NYT_API_KEY=your_nyt_api_key_here

# Optional: Custom CORS Proxy URL (if needed)
REACT_APP_CORS_PROXY=https://your-cors-proxy.com/

# Environment override (optional)
NODE_ENV=development
```

**Note**: The app includes comprehensive CORS handling with automatic fallback mechanisms for development and production environments.

## Available Scripts

- `bun run start` - Start development server (auto‑selects free port, no interactive prompts)
- `bun run build` - Build for production (source maps disabled to suppress noisy third‑party warnings)
- `bun run test` - Run tests
- `bun run test:cov` - Run tests with coverage
- `bun run gen:types` - Generate TypeScript types from Zod schemas

Notes:
- CI treats warnings as errors. The build is configured to avoid noisy third‑party source‑map warnings.
- ESLint must report 0 errors for deploys.

## API Integration

The app integrates with the New York Times Article Search API v2, providing:

- **Article Search**: Full-text search with multiple filters
- **Section Filtering**: Filter by news sections (U.S., World, Technology, etc.)
- **Advanced Search**: Date ranges, categories, and custom filters
- **Real‑time Results**: Instant search results with debounced input and incremental pagination (12/page)
- **Error Handling**: Comprehensive error handling and user feedback
- **CORS Resolution**: Automatic proxy configuration with fallback mechanisms for seamless API access

### API Documentation Access

Navigate to the **API Documentation** page to explore:
- Complete endpoint documentation
- Request/response schemas
- Parameter descriptions and examples
- Entity definitions (Article, Byline, Headline, Multimedia)
- Interactive "Try It Out" functionality

## Testing

The project includes comprehensive tests:

- ✅ **Unit Tests**: All components and utilities
- ✅ **Integration Tests**: Search functionality and API integration
- ✅ **API Mocking**: Comprehensive API response mocking
- ✅ **Error Handling**: Edge cases and error scenarios
- ✅ **Accessibility**: User interaction and accessibility tests

## Project Structure

```
src/
├── components/          # React components
│   ├── __tests__/      # Component tests
│   ├── ApiDocs.tsx     # Static API documentation
│   ├── SwaggerUI.tsx   # Interactive API documentation
│   ├── ViewTransitionLink.tsx    # Enhanced Link with View Transitions
│   ├── ViewTransitionImage.tsx   # Image component with View Transitions
│   ├── ViewTransitionsProvider.tsx # Global View Transitions provider
│   └── ...             # Other components
├── pages/              # Page components
│   ├── __tests__/      # Page tests
│   ├── ApiDocsPage.tsx # API documentation page
│   └── ...             # Other pages
├── store/              # Zustand state management
├── api/                # API integration
├── types/              # TypeScript type definitions
├── schemas/            # Zod validation schemas
├── styles/             # CSS stylesheets
│   └── view-transitions.css  # View Transitions animations
├── utils/              # Utility functions
│   └── cors.ts         # CORS handling utilities
├── config/             # Configuration files
│   └── api.ts          # API configuration
├── hooks/              # Custom React hooks
│   └── useViewTransition.ts # View Transitions hook
└── external-apis/      # OpenAPI specifications
    └── nyt/
        └── article-search/
            └── articlesearch-product.yaml
```

## Deployment

This project features a comprehensive deployment pipeline:

### Frontend Deployment
- **Automatic Deployment**: Pushes to `master` branch trigger deployment
- **Conditional Workflow**: Deployment only runs after successful test completion
- **Post-Deployment Validation**: Health checks and accessibility testing
- **Robust Deployment Scripts**: Fixed lftp commands with proper error handling
- **Live URL**: https://nyt.brainvaultdev.com/
- **API Documentation**: Available at `/api-docs` route

### Backend API Deployment
- **Multi-Environment**: Staging (develop branch) and Production (main branch) deployments
- **Kubernetes Orchestration**: EKS clusters with HPA, ingress controllers, and service mesh
- **Canary Deployments**: Gradual traffic shifting for safe production releases
- **Security Scanning**: Automated OWASP ZAP scans and custom security tests
- **Performance Gates**: Load testing with SLO validation before deployment

### CI/CD Pipeline Features
- **Quality Gates**: Spec validation, breaking changes detection, contract testing
- **Security Testing**: OWASP API Top 10 compliance, vulnerability scanning
- **Performance Testing**: k6 load tests, Artillery scenario testing, SLO validation
- **Container Management**: Multi-architecture Docker images (AMD64/ARM64)
- **Observability**: Distributed tracing, metrics collection, structured logging
- **Deployment Reliability**: Fixed deployment scripts with proper lftp command handling

## Development Features

### Code Quality
- **TypeScript**: Full type safety throughout the application
- **ESLint**: Strict rules; deployments require 0 ESLint errors
- **Prettier**: Consistent code formatting
- **CI**: Warnings treated as errors; tests and build must pass

### Performance
- **Virtualized Lists**: Efficient rendering of large datasets
- **Debounced Search**: Optimized API calls
- **Lazy Loading**: Component and route lazy loading
- **Bundle Optimization**: Tree shaking and code splitting
- **View Transitions**: Smooth 60fps animations with minimal performance impact
- **CORS Optimization**: Efficient proxy handling with automatic fallbacks

## Pages & Behaviors

- **Home**: Landing with hero, quick navigation
- **Search**:
  - Simple and advanced modes (sort newest/oldest, section, date range)
  - View modes: Grid, List (virtualized), Table
  - Controls: Card size slider, Full‑width toggle (Grid)
  - Infinite scroll with 12 results per page
- **Trending**:
  - Time period selector (Today, This Week, This Month)
  - View modes with the same Grid controls (Card size, Full‑width)
- **Top Stories**:
  - Section selector (e.g., Home, World, Technology)
  - View modes with the same Grid controls (Card size, Full‑width)
- **Archive**:
  - Defaults to the earliest available date: Oct 01, 1851
  - Constrained year/month slider so you can’t go earlier than that
  - List‑only layout aligned to Search’s list style
  - Centered secondary date title
- **Favorites**: Grid list of saved articles with quick remove
- **API Docs**: Interactive Swagger UI backed by OpenAPI specs

### User Experience
- **Dark/Light Theme**: Theme toggle with persistent storage
- **Responsive Design**: Mobile-first approach
- **Loading States**: Comprehensive loading indicators
- **Error Boundaries**: Graceful error handling
- **Smooth Transitions**: View Transitions API for seamless navigation
- **Accessibility**: Respects user motion preferences and WCAG guidelines

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`bun run test:cov`)
6. Submit a pull request

## Key Achievements

### 🚀 Production-Ready Features
- **Enterprise CI/CD Pipeline**: Implemented comprehensive GitHub Actions workflows with quality gates, security scanning, and automated deployment
- **Multi-Environment Deployment**: Set up staging and production environments with Kubernetes orchestration
- **Security Compliance**: OWASP API Top 10 compliance with automated vulnerability scanning
- **Performance Optimization**: Achieved 73.27% test coverage with virtualized lists and optimized rendering
- **API-First Design**: Complete OpenAPI 3.0 specification with interactive documentation
- **Modern UX**: View Transitions API integration for premium user experience
- **CORS Resolution**: Comprehensive proxy configuration with automatic fallback mechanisms

### 🛡️ Security & Reliability
- **OAuth 2.0 with PKCE**: Implemented secure authentication following RFC 9700 standards
- **JWT Hardening**: Token rotation, short-lived access tokens, and sender-constrained tokens
- **Rate Limiting**: Distributed Redis-based rate limiting with token bucket algorithms
- **Circuit Breakers**: Resilience patterns with fallbacks and health monitoring
- **Security Headers**: Comprehensive helmet configuration with CSP and HSTS

### 📊 Monitoring & Observability
- **Distributed Tracing**: OpenTelemetry integration with W3C Trace Context propagation
- **Performance Monitoring**: RED/Four Golden Signals with custom business metrics
- **Structured Logging**: JSON logs with correlation IDs and PII protection
- **Health Checks**: Comprehensive health endpoints with dependency monitoring

### 🎯 User Experience
- **Responsive Design**: Mobile-first approach with dark/light theme support
- **Performance**: Virtualized lists, debounced search, and optimized bundle size
- **Accessibility**: WCAG compliance with comprehensive testing
- **Error Handling**: Graceful error boundaries and user-friendly error messages
- **Smooth Animations**: View Transitions API for seamless page transitions
- **Motion Sensitivity**: Respects `prefers-reduced-motion` for accessibility

## License

This project is licensed under the MIT License.

---

**Current Status**: **Production-Ready** with enterprise-grade CI/CD pipeline, comprehensive security measures, 73.27% test coverage, and modern View Transitions integration.

**Live Demo**: https://nyt.brainvaultdev.com/

**Last Updated**: January 2025
