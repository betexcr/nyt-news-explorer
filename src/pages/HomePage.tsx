import React from "react";
import { Link } from "react-router-dom";
import { useSearchStore } from "../store/searchStore";

const HomePage: React.FC = () => {
  const reset = useSearchStore((state) => state.reset);

  const handleHomeClick = () => {
    // Clear search state when navigating to home
    reset();
  };

  return (
    <Link
      to="/search"
      state={{ fromHome: true }}
      onClick={handleHomeClick}
      aria-label="Go to Search"
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
    >
      <section className="panel" style={{ padding: "1rem 1.25rem" }}>
        <h1 style={{ marginTop: 0 }}>NYT News Explorer</h1>
        <p>Quickly find recent articles from The New York Times.</p>
        <picture>
          <source
            type="image/avif"
            srcSet="/home-hero-800.avif 800w,
            /home-hero-1200.avif 1200w,
            /home-hero-1600.avif 1600w,
            /home-hero-2400.avif 2400w"
            sizes="100vw"
          />
          <source
            type="image/webp"
            srcSet="/home-hero-800.webp 800w,
            /home-hero-1200.webp 1200w,
            /home-hero-1600.webp 1600w,
            /home-hero-2400.webp 2400w"
            sizes="100vw"
          />
          <img
            src="/home-hero.jpg"  
            srcSet="/home-hero-800.jpg 800w,
            /home-hero-1200.jpg 1200w,
            /home-hero-1600.jpg 1600w,
            /home-hero-2400.jpg 2400w"
            sizes="100vw"
            alt="Home hero"
            className="home-hero"
            fetchPriority="high"
            decoding="sync" 
          />
        </picture>
      </section>
    </Link>
  );
};

export default HomePage;
