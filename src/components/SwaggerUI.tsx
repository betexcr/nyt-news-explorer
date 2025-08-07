import React, { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

interface SwaggerUIProps {
  className?: string;
}

const SwaggerUIComponent: React.FC<SwaggerUIProps> = ({ className }) => {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSpec = async () => {
      try {
        // Load the YAML file from public directory
        const response = await fetch('/api-spec.yaml');
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

    loadSpec();
  }, []);

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
