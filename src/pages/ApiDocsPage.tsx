import React from 'react';
import { Helmet } from 'react-helmet';
import SwaggerUIComponent from '../components/SwaggerUI';

const ApiDocsPage: React.FC = () => {
  return (
    <div className="api-docs-page">
      <Helmet>
        <title>API Documentation - NYT News Explorer</title>
        <meta name="description" content="New York Times API Documentation (Article Search, Top Stories, Most Popular, Books, Archive, Movies)" />
      </Helmet>
      
      <div className="api-docs-container">
        <h1>NYT API Documentation</h1>
        <p className="api-docs-description">Select a spec from the dropdown to view its endpoints and schemas.</p>
        
        <SwaggerUIComponent className="swagger-ui-container" />
      </div>
    </div>
  );
};

export default ApiDocsPage; 