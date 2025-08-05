import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { NytArticle } from '../types/nyt';
import '../styles/table.css';

interface ArticleTableProps {
  articles: NytArticle[];
}

const ArticleTable: React.FC<ArticleTableProps> = ({ articles }) => {
  const navigate = useNavigate();

  const handleRowClick = (article: NytArticle) => {
    navigate('/detail', { state: { article } });
  };

  const getThumbnailUrl = (article: NytArticle): string | null => {
    if (article.multimedia) {
      // Try thumbnail first, then default
      if (article.multimedia.thumbnail && article.multimedia.thumbnail.url) {
        return article.multimedia.thumbnail.url; // URLs are already complete
      }
      
      if (article.multimedia.default && article.multimedia.default.url) {
        return article.multimedia.default.url; // URLs are already complete
      }
    }
    return null;
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
              key={article.web_url} 
              className="table-row"
              onClick={() => handleRowClick(article)}
            >
              <td className="image-cell">
                {getThumbnailUrl(article) ? (
                  <img 
                    src={getThumbnailUrl(article)!} 
                    alt="Article thumbnail"
                    className="table-image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`no-image ${getThumbnailUrl(article) ? 'hidden' : ''}`}>
                  No Image
                </div>
              </td>
              <td className="title">
                {article.headline?.main || 'No title'}
              </td>
              <td className="section">
                {article.section_name || 'No section'}
              </td>
              <td className="author">
                {article.byline?.original || 'No author'}
              </td>
              <td className="date">
                {formatDate(article.pub_date || '')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ArticleTable; 