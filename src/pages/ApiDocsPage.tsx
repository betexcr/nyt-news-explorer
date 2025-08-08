import React from 'react';
import { Helmet } from 'react-helmet';
import SwaggerUIComponent from '../components/SwaggerUI';
import '../styles/page-header.css';

const ApiDocsPage: React.FC = () => {
  return (
    <div className="api-docs-page">
      <Helmet>
        <title>API Documentation - NYT News Explorer</title>
        <meta name="description" content="New York Times API Documentation (Article Search, Top Stories, Most Popular, Books, Archive, Movies)" />
      </Helmet>
      
      <div className="api-docs-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">NYT API Documentation</h1>
            <p className="page-subtitle">Select a spec to view endpoints and schemas</p>
          </div>
        </div>
        
        <SwaggerUIComponent className="swagger-ui-container" />
      </div>
    </div>
  );
};

export default ApiDocsPage; 