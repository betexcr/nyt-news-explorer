import React from "react";
import { useSearchStore } from "../store/searchStore";
import ArticleCard from "../components/ArticleCard";
import type { NytArticle } from "../types/nyt";
import "../styles/page-header.css";

const FavoritesPage: React.FC = () => {
  const { favorites, removeFavorite } = useSearchStore();

  const handleRemoveFavorite = (article: NytArticle) => {
    removeFavorite(article.web_url);
  };

  if (favorites.length === 0) {
    return (
      <div className="container">
        <main style={{ paddingTop: "70px" }}>
          <div className="page-header">
            <div>
              <h1 className="page-title">Favorites</h1>
              <p className="page-subtitle">Your saved articles</p>
            </div>
          </div>
          <section className="panel" style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
              You haven't added any articles to your favorites yet.
            </p>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
              Search for articles and click the heart icon to add them to your favorites.
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <main style={{ paddingTop: "70px" }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Favorites ({favorites.length})</h1>
            <p className="page-subtitle">Your saved articles</p>
          </div>
        </div>
        <section className="panel" style={{ padding: "1rem 1.25rem" }}>
          <div className="grid results">
            {favorites.map((article) => (
              <div key={article.web_url} style={{ position: "relative" }}>
                <ArticleCard article={article} />
                <button
                  onClick={() => handleRemoveFavorite(article)}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "rgba(255, 0, 0, 0.8)",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    transition: "all 0.2s ease",
                  }}
                  title="Remove from favorites"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default FavoritesPage; 