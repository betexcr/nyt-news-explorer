import React from 'react';
import { FixedSizeList as List } from 'react-window';
import ArticleCard from './ArticleCard';
import type { NytArticle } from '../types/nyt';
import '../styles/virtualized-list.css';

interface VirtualizedArticleListProps {
  articles: NytArticle[];
  height: number;
  itemHeight: number;
}

const VirtualizedArticleList: React.FC<VirtualizedArticleListProps> = ({ 
  articles, 
  height, 
  itemHeight 
}) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const article = articles[index];
    return (
      <div style={style}>
        <ArticleCard article={article} />
      </div>
    );
  };

  return (
    <div className="virtualized-list-container">
      <List
        height={height}
        itemCount={articles.length}
        itemSize={itemHeight}
        width="100%"
        className="virtualized-list"
      >
        {Row}
      </List>
    </div>
  );
};

export default VirtualizedArticleList; 