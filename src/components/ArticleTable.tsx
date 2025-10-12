import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { UnifiedArticle } from '../services/unifiedSearchService';
import ImageWithRetry from './ImageWithRetry';
import '../styles/table.css';

interface ArticleTableProps {
  articles: UnifiedArticle[];
}

const ArticleTable: React.FC<ArticleTableProps> = ({ articles }) => {
  const navigate = useNavigate();

  const handleRowClick = (article: UnifiedArticle) => {
    // Convert UnifiedArticle to NytArticle format for detail page
    const nytArticle = {
      _id: article.id,
      headline: { main: article.title },
      snippet: article.abstract,
      web_url: article.url,
      pub_date: article.publishedDate,
      byline: { original: article.byline },
      section_name: article.section,
      multimedia: article.imageUrl ? [{ url: article.imageUrl }] : undefined
    };
    navigate('/detail', { state: { article: nytArticle } });
  };

  const getThumbnailUrl = (article: UnifiedArticle): string | null => {
    return article.imageUrl || null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="table-container">
      <table className="article-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Headline</th>
            <th>Section</th>
            <th>Author</th>
            <th>Published</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <tr 
              key={article.id} 
              className="table-row"
              onClick={() => handleRowClick(article)}
            >
              <td className="image-cell">
                {getThumbnailUrl(article) ? (
                  <ImageWithRetry
                    src={getThumbnailUrl(article)!}
                    alt="Article thumbnail"
                    className="table-image"
                    fallbackSrc="/logo.png"
                    maxRetries={3}
                    retryDelay={1000}
                  />
                ) : (
                  <div className="no-image">
                    No Image
                  </div>
                )}
              </td>
              <td className="title">
                {article.title || 'No title'}
              </td>
              <td className="section">
                {article.section || 'No section'}
              </td>
              <td className="author">
                {article.byline || 'No author'}
              </td>
              <td className="date">
                {formatDate(article.publishedDate || '')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ArticleTable; 