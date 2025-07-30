import React from "react";
import { Link } from "react-router-dom";

const HomePage: React.FC = () => {
  return (
    <Link
      to="/search"
      state={{ fromHome: true }}
      aria-label="Go to Search"
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
    >
      <section className="panel" style={{ padding: "1rem 1.25rem" }}>
        <h1 style={{ marginTop: 0 }}>NYT News Explorer</h1>
        <p>Quickly find recent articles from The New York Times.</p>
        <img src="/home-hero.jpg" alt="" className="home-hero" loading="lazy" />
      </section>
    </Link>
  );
};

export default HomePage;
