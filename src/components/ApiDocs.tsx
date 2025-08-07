import React from 'react';

interface ApiDocsProps {
  className?: string;
}

const ApiDocsComponent: React.FC<ApiDocsProps> = ({ className }) => {
  return (
    <div className={className}>
      <div className="api-docs-content">
        <div className="api-section">
          <h2>NYT Article Search API</h2>
          <p>
            The New York Times Article Search API allows you to search for articles by keywords and filters.
            This API provides access to The New York Times archive of articles.
          </p>
        </div>

        <div className="api-section">
          <h3>Base URL</h3>
          <code>https://api.nytimes.com/svc/search/v2</code>
        </div>

        <div className="api-section">
          <h3>Authentication</h3>
          <p>All requests require an API key passed as a query parameter:</p>
          <code>?api-key=YOUR_API_KEY</code>
        </div>

        <div className="api-section">
          <h3>Endpoint</h3>
          <div className="endpoint">
            <span className="method">GET</span>
            <code>/articlesearch.json</code>
          </div>
          <p>Search for NYT articles by keywords and filters.</p>
        </div>

        <div className="api-section">
          <h3>Query Parameters</h3>
          <div className="parameters">
            <div className="parameter">
              <strong>q</strong> (optional) - Search query
            </div>
            <div className="parameter">
              <strong>begin_date</strong> (optional) - Start date in YYYYMMDD format
            </div>
            <div className="parameter">
              <strong>end_date</strong> (optional) - End date in YYYYMMDD format
            </div>
            <div className="parameter">
              <strong>fq</strong> (optional) - Filter query using Lucene syntax
            </div>
            <div className="parameter">
              <strong>page</strong> (optional) - Page number (0-100)
            </div>
            <div className="parameter">
              <strong>sort</strong> (optional) - Sort order: best, newest, oldest, relevance
            </div>
          </div>
        </div>

        <div className="api-section">
          <h3>Example Request</h3>
          <div className="example">
            <code>
              https://api.nytimes.com/svc/search/v2/articlesearch.json?q=climate+change&begin_date=20230101&end_date=20231231&api-key=YOUR_API_KEY
            </code>
          </div>
        </div>

        <div className="api-section">
          <h3>Response Format</h3>
          <div className="response-example">
            <pre>{`{
  "status": "OK",
  "copyright": "Copyright (c) 2024 The New York Times Company",
  "response": {
    "docs": [
      {
        "web_url": "https://www.nytimes.com/...",
        "snippet": "Article snippet...",
        "headline": {
          "main": "Article Headline"
        },
        "pub_date": "2024-01-15T10:30:00Z",
        "section_name": "Science",
        "type_of_material": "News"
      }
    ],
    "meta": {
      "hits": 150,
      "offset": 0,
      "time": 25
    }
  }
}`}</pre>
          </div>
        </div>

        <div className="api-section">
          <h3>Filter Examples</h3>
          <div className="filter-examples">
            <div className="filter-example">
              <strong>By Section:</strong>
              <code>fq=section_name:("Science" OR "Technology")</code>
            </div>
            <div className="filter-example">
              <strong>By Date Range:</strong>
              <code>begin_date=20230101&end_date=20231231</code>
            </div>
            <div className="filter-example">
              <strong>By Article Type:</strong>
              <code>fq=type_of_material:News</code>
            </div>
          </div>
        </div>

        <div className="api-section">
          <h3>Rate Limits</h3>
          <p>
            The API has rate limits to ensure fair usage. Please refer to the official NYT API documentation
            for current rate limit information.
          </p>
        </div>

        <div className="api-section">
          <h3>Error Codes</h3>
          <div className="error-codes">
            <div className="error-code">
              <strong>400</strong> - Bad request. Check your query parameters.
            </div>
            <div className="error-code">
              <strong>401</strong> - Unauthorized request. Make sure api-key is set.
            </div>
            <div className="error-code">
              <strong>429</strong> - Too many requests. You reached your rate limit.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocsComponent; 