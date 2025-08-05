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
    
    const list = listRef.current;
    if (!list) return;

    // Access the outer element properly
    const outerElement = (list as any).outerRef as HTMLElement;
    if (!outerElement) return;

    const { scrollTop, scrollHeight, clientHeight } = outerElement;
    const threshold = 200; // pixels from bottom to trigger load more
    
    if (scrollHeight - scrollTop - clientHeight < threshold && hasMore && !loadingMore) {
      onLoadMore();
    }
  }, [hasMore, loadingMore, onLoadMore]);

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