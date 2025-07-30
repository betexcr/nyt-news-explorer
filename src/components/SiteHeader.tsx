import React from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

export const SiteHeader: React.FC = () => {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "saturate(180%) blur(6px)",
        background: "var(--header)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link to="/" style={{ textDecoration: "none", color: "var(--text)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.02em" }}
            >
              NYT News Explorer
            </span>
            <span style={{ fontSize: 12, opacity: 0.7 }}>by You</span>
          </div>
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link
            to="/"
            style={{
              color: "var(--textMuted)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Home
          </Link>
          <Link
            to="/favorites"
            style={{
              color: "var(--textMuted)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Favorites
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
};
