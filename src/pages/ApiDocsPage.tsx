import React from 'react';
import { Helmet } from 'react-helmet';
import SwaggerUIComponent from '../components/SwaggerUI';

const ApiDocsPage: React.FC = () => {
  return (
    <div className="api-docs-page">
      <Helmet>
        <title>API Documentation - NYT News Explorer</title>
        <meta name="description" content="New York Times Article Search API Documentation" />
      </Helmet>
      
      <div className="api-docs-container">
        <h1>NYT Article Search API Documentation</h1>
        <p className="api-docs-description">
          This page displays the complete API documentation for the New York Times Article Search API.
          You can explore the available endpoints, parameters, response schemas, and entity definitions below.
        </p>
        
        <SwaggerUIComponent className="swagger-ui-container" />
      </div>
    </div>
  );
};

export default ApiDocsPage; 