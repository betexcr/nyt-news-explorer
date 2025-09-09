import React, { useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import ArticleCard from './ArticleCard';
import Spinner from './Spinner';
import type { NytArticle } from '../types/nyt';
import '../styles/virtualized-list.css';

interface VirtualizedArticleListProps {
  articles: NytArticle[];
  height: number;
  itemHeight: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

const VirtualizedArticleList: React.FC<VirtualizedArticleListProps> = ({ 
  articles, 
  height, 
  itemHeight,
  hasMore,
  loadingMore,
  onLoadMore
}) => {
  const listRef = useRef<List>(null);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const article = articles[index];
    return (
      <div style={style}>
        <ArticleCard article={article} />
      </div>
    );
  };

  // Use window scroll instead of internal scroll to match grid view behavior
  useEffect(() => {
    if (!hasMore || loadingMore || !articles) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Trigger load more when user is near bottom (same as grid view)
      if (documentHeight - scrollTop - windowHeight < 200) {
        onLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, articles, onLoadMore]);

  return (
    <div className="virtualized-list-container">
      <List
        ref={listRef}
        height={height}
        itemCount={articles.length}
        itemSize={itemHeight}
        width="100%"
        className="virtualized-list"
      >
        {Row}
      </List>
      
      {loadingMore && (
        <div className="loading-more">
          <Spinner />
          <p>Loading more articles...</p>
        </div>
      )}
      
      {!hasMore && articles.length > 0 && (
        <div className="no-more-results">
          <p>No more articles to load</p>
        </div>
      )}
    </div>
  );
};

export default VirtualizedArticleList; 