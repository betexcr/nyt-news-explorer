# NYT News Explorer

A modern React application for exploring and searching articles from The New York Times API, featuring comprehensive API documentation and advanced search capabilities.

## 🚀 Features

### Core Functionality
- 🔍 **Advanced Search**: Search articles with multiple filters and categories
- 📚 **Interactive API Documentation**: Complete SwaggerUI integration with full OpenAPI specification
- ❤️ **Favorites Management**: Save and manage your favorite articles with persistent storage
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- 🚀 **Virtualized Lists**: Smooth scrolling performance with large datasets
- 🎨 **Modern UI**: Clean, intuitive interface with dark/light theme toggle
- ⚡ **Performance Optimized**: Fast loading and smooth interactions

### API Documentation
- 📖 **SwaggerUI Integration**: Interactive API documentation with full OpenAPI 2.0 specification
- 🔗 **Entity Definitions**: Complete documentation of all API entities (Article, Byline, Headline, etc.)
- 🧪 **Try It Out**: Test API endpoints directly from the documentation
- 📋 **Parameter Reference**: Detailed parameter descriptions and examples
- 🔐 **Authentication Guide**: API key setup and usage instructions

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, CSS3
- **State Management**: Zustand
- **API**: New York Times Article Search API v2
- **API Documentation**: SwaggerUI, OpenAPI 2.0
- **Build Tool**: Bun
- **Testing**: Jest, React Testing Library (100% coverage)
- **Deployment**: Hostinger Git Deployment

## 🚀 Getting Started

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
REACT_APP_NYT_API_KEY=your_nyt_api_key_here
```

## 📜 Available Scripts

- `bun run start` - Start development server
- `bun run build` - Build for production
- `bun run test` - Run tests
- `bun run test:cov` - Run tests with coverage
- `bun run gen:types` - Generate TypeScript types from Zod schemas

## 🔌 API Integration

The app integrates with the New York Times Article Search API v2, providing:

- **Article Search**: Full-text search with multiple filters
- **Section Filtering**: Filter by news sections (U.S., World, Technology, etc.)
- **Advanced Search**: Date ranges, categories, and custom filters
- **Real-time Results**: Instant search results with debounced input
- **Error Handling**: Comprehensive error handling and user feedback

### API Documentation Access

Navigate to the **API Documentation** page to explore:
- Complete endpoint documentation
- Request/response schemas
- Parameter descriptions and examples
- Entity definitions (Article, Byline, Headline, Multimedia)
- Interactive "Try It Out" functionality

## 🧪 Testing

The project includes comprehensive tests with **100% code coverage**:

- ✅ **Unit Tests**: All components and utilities
- ✅ **Integration Tests**: Search functionality and API integration
- ✅ **API Mocking**: Comprehensive API response mocking
- ✅ **Error Handling**: Edge cases and error scenarios
- ✅ **Accessibility**: User interaction and accessibility tests
- ✅ **SwaggerUI Tests**: API documentation component testing

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── __tests__/      # Component tests
│   ├── ApiDocs.tsx     # Static API documentation
│   ├── SwaggerUI.tsx   # Interactive API documentation
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
├── utils/              # Utility functions
└── external-apis/      # OpenAPI specifications
    └── nyt/
        └── article-search/
            └── articlesearch-product.yaml
```

## 🌐 Deployment

This project is deployed using Hostinger's Git deployment system:

- **Automatic Deployment**: Pushes to `master` branch trigger deployment
- **Webhook Integration**: Uses GitHub Actions to trigger Hostinger deployment
- **Live URL**: https://nyt.brainvaultdev.com/
- **API Documentation**: Available at `/api-docs` route

## 🔧 Development Features

### Code Quality
- **TypeScript**: Full type safety throughout the application
- **ESLint**: Code linting and formatting
- **Prettier**: Consistent code formatting
- **100% Test Coverage**: Comprehensive test suite

### Performance
- **Virtualized Lists**: Efficient rendering of large datasets
- **Debounced Search**: Optimized API calls
- **Lazy Loading**: Component and route lazy loading
- **Bundle Optimization**: Tree shaking and code splitting

### User Experience
- **Dark/Light Theme**: Theme toggle with persistent storage
- **Responsive Design**: Mobile-first approach
- **Loading States**: Comprehensive loading indicators
- **Error Boundaries**: Graceful error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`bun run test:cov`)
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Current Status**: ✅ **Fully Functional** with comprehensive API documentation, 100% test coverage, and production-ready deployment.

**Last Updated**: December 2024
