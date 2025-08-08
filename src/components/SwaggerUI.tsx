import React, { useEffect, useMemo, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

interface SwaggerUIProps {
  className?: string;
}

const SwaggerUIComponent: React.FC<SwaggerUIProps> = ({ className }) => {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<string>('article-search');

  const apiOptions = useMemo(
    () => [
      { id: 'article-search', label: 'Article Search', path: '/apis/nyt/articlesearch-product.yaml' },
      { id: 'top-stories', label: 'Top Stories', path: '/apis/nyt/top-stories-product.yaml' },
      { id: 'most-popular', label: 'Most Popular', path: '/apis/nyt/most-popular-product.yaml' },
      { id: 'books', label: 'Books', path: '/apis/nyt/books-product.yaml' },
      { id: 'archive', label: 'Archive', path: '/apis/nyt/archive-product.yaml' },
      { id: 'movies', label: 'Movie Reviews', path: '/apis/nyt/movie-reviews-api.yaml' },
    ],
    []
  );

  useEffect(() => {
    const loadSpec = async () => {
      try {
        const current = apiOptions.find((o) => o.id === api) || apiOptions[0];
        const response = await fetch(current.path);
        if (!response.ok) {
          throw new Error(`Failed to load specification: ${response.statusText}`);
        }
        const yamlText = await response.text();
        
        // Parse YAML to JSON
        const yaml = require('js-yaml');
        const parsedSpec = yaml.load(yamlText);
        setSpec(parsedSpec);
      } catch (err) {
        console.error('Failed to load OpenAPI specification:', err);
        setError('Failed to load API specification');
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    setError(null);
    loadSpec();
  }, [api, apiOptions]);

  if (loading) {
    return (
      <div className={className}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>Loading API documentation...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          <div>Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className={className}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>No API specification found</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ fontWeight: 700 }}>NYT APIs</div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Spec:</span>
          <select value={api} onChange={(e) => setApi(e.target.value)} style={{ padding: '0.35rem 0.5rem', borderRadius: 8, border: '1px solid var(--border)' }}>
            {apiOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>
      <SwaggerUI 
        spec={spec}
        docExpansion="list"
        defaultModelsExpandDepth={2}
        defaultModelExpandDepth={2}
        displayOperationId={false}
        displayRequestDuration={true}
        filter={true}
        showExtensions={true}
        showCommonExtensions={true}
        tryItOutEnabled={false}
        supportedSubmitMethods={[]}
        deepLinking={true}
        persistAuthorization={true}
      />
    </div>
  );
};

export default SwaggerUIComponent;
