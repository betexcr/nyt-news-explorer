import React, { useCallback, useRef } from 'react';
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

  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }: any) => {
    if (scrollUpdateWasRequested) return;

    // Fallback based on known itemHeight and list height to ensure scroll works in all modes
    const totalContentHeight = articles.length * itemHeight;
    const visibleHeight = height;
    const threshold = 200; // pixels from bottom to trigger load more

    if (totalContentHeight - scrollOffset - visibleHeight < threshold && hasMore && !loadingMore) {
      onLoadMore();
    }
  }, [articles.length, itemHeight, height, hasMore, loadingMore, onLoadMore]);

  return (
    <div className="virtualized-list-container">
      <List
        ref={listRef}
        height={height}
        itemCount={articles.length}
        itemSize={itemHeight}
        width="100%"
        className="virtualized-list"
        onScroll={handleScroll}
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