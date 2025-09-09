# NYT News GraphQL Backend

A GraphQL API backend for the NYT News Explorer, deployed on Vercel.

## Features

- **Top Stories**: Fetch top stories by section
- **Most Popular**: Get most popular articles
- **Search**: Search articles by query
- **Article Details**: Get specific article by ID
- **GraphQL Playground**: Interactive API explorer

## Setup

1. **Install dependencies**:
   ```bash
   cd graphql-backend
   npm install
   ```

2. **Configure API Key**:
   - Get your NYT API key from [NYT Developer Portal](https://developer.nytimes.com/)
   - For local development: Create `.env.local` with your API key
   - For production: Set environment variable in Vercel dashboard

3. **Local Development**:
   ```bash
   vercel dev
   ```
   This will start the GraphQL server at `http://localhost:3000/graphql`

4. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

## GraphQL Schema

### Queries

- `topStories(section: String)`: Get top stories (default: "home")
- `mostPopular`: Get most popular articles
- `searchArticles(query: String!, page: Int)`: Search articles
- `articleById(id: String!)`: Get specific article

### Example Queries

```graphql
# Get top stories
query {
  topStories(section: "technology") {
    title
    abstract
    url
    published_date
  }
}

# Search articles
query {
  searchArticles(query: "artificial intelligence", page: 0) {
    title
    abstract
    url
    section
  }
}
```

## Environment Variables

- `NYT_API_KEY`: Your New York Times API key

## Deployment

This backend is designed to be deployed on Vercel with zero configuration. The `vercel.json` file handles all the routing and build configuration.
