# NYT News Explorer

A modern React application for exploring and searching articles from The New York Times API.

## Features

- 🔍 **Advanced Search**: Search articles with multiple filters and categories
- ❤️ **Favorites**: Save and manage your favorite articles
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- 🚀 **Virtualized Lists**: Smooth scrolling with large datasets
- 🎨 **Modern UI**: Clean, intuitive interface with dark/light themes
- ⚡ **Performance Optimized**: Fast loading and smooth interactions

## Tech Stack

- **Frontend**: React 18, TypeScript, CSS3
- **State Management**: Zustand
- **API**: New York Times Article Search API
- **Build Tool**: Bun
- **Testing**: Jest, React Testing Library
- **Deployment**: Hostinger Git Deployment

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
bun run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_NYT_API_KEY=your_nyt_api_key_here
```

## Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run test` - Run tests
- `bun run test:cov` - Run tests with coverage
- `bun run gen:types` - Generate TypeScript types from Zod schemas

## API Integration

The app integrates with the New York Times Article Search API v2, providing:

- Article search with multiple filters
- Section-based filtering (U.S., World, Technology, etc.)
- Advanced search with date ranges and categories
- Real-time search results

## Deployment

This project is deployed using Hostinger's Git deployment system:

1. **Automatic Deployment**: Pushes to `master` branch trigger deployment
2. **Webhook Integration**: Uses GitHub Actions to trigger Hostinger deployment
3. **Live URL**: https://nyt.brainvaultdev.com/

## Testing

The project includes comprehensive tests with 100% code coverage:

- Unit tests for all components
- Integration tests for search functionality
- API mocking and error handling tests
- Accessibility and user interaction tests

## Project Structure

```
src/
├── components/          # React components
├── pages/              # Page components
├── store/              # Zustand state management
├── api/                # API integration
├── types/              # TypeScript type definitions
├── schemas/            # Zod validation schemas
├── styles/             # CSS stylesheets
└── utils/              # Utility functions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.

---

**Test commit for Hostinger Git deployment verification** ✅
