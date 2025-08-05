import React from 'react';
import { Helmet } from 'react-helmet';
import type { NytArticle } from '../types/nyt';

interface SocialMetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  article?: NytArticle | null;
}

const SocialMetaTags: React.FC<SocialMetaTagsProps> = ({
  title = 'NYT News Explorer - Modern News Discovery',
  description = 'Explore and search articles from The New York Times with advanced filtering, favorites, and a modern interface.',
  image = 'https://nyt.brainvaultdev.com/home-hero-1200.jpg',
  url = 'https://nyt.brainvaultdev.com/',
  article,
}) => {
  // If we have an article, use its data for better social sharing
  const finalTitle = article?.headline?.main || title;
  const finalDescription = article?.snippet || description;
  const finalImage = article?.multimedia?.default?.url 
    ? `https://static01.nyt.com/${article.multimedia.default.url}`
    : image;
  const finalUrl = article?.web_url || url;

  return (
    <Helmet>
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={article ? "article" : "website"} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={finalTitle} />
      <meta property="og:site_name" content="NYT News Explorer" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={finalUrl} />
      <meta property="twitter:title" content={finalTitle} />
      <meta property="twitter:description" content={finalDescription} />
      <meta property="twitter:image" content={finalImage} />
      <meta property="twitter:image:alt" content={finalTitle} />
      
      {/* Article-specific meta tags */}
      {article && (
        <>
          <meta property="article:published_time" content={article.pub_date} />
          <meta property="article:section" content={article.section_name} />
          {article.keywords?.map((keyword, index) => (
            <meta key={index} property="article:tag" content={keyword.value} />
          ))}
        </>
      )}
      
      {/* Page title */}
      <title>{finalTitle}</title>
    </Helmet>
  );
};

export default SocialMetaTags; 