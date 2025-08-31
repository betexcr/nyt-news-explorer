import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useSearchStore } from "../store/searchStore";
import ViewTransitionLink from "./ViewTransitionLink";

export const SiteHeader: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const reset = useSearchStore((state) => state.reset);
  const location = useLocation();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleOptions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOptionsOpen(!isOptionsOpen);
  };

  const handleClearCache = () => {
    reset();
    sessionStorage.clear();
    localStorage.clear();
    setIsOptionsOpen(false);
    setIsMenuOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setIsOptionsOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu when pressing Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsOptionsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header
      className="site-header"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backdropFilter: "saturate(180%) blur(12px)",
        background: "rgba(var(--panel-rgb, 255, 255, 255), 0.8)",
        borderBottom: "1px solid var(--border)",
        transition: "all 0.3s ease",
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
        {/* Logo/Brand */}
        <ViewTransitionLink to="/" style={{ textDecoration: "none", color: "var(--text)" }} viewTransitionName="site-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src="/logo.webp"
              srcSet="/logo.webp 1x, /logo@2x.webp 2x"
              alt="NYT News Explorer"
              style={{ width: 28, height: 28 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span
                style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.02em" }}
              >
                NYT News Explorer
              </span>
              <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 4 }}>by Alberto Muñoz</span>
            </div>
          </div>
        </ViewTransitionLink>

        {/* Desktop Navigation */}
        <nav 
          style={{ 
            alignItems: "center", 
            gap: "0.5rem"
          }}
          className="desktop-nav view-transition-navigation"
        >
          <ViewTransitionLink
            to="/"
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
            viewTransitionName="nav-home"
          >
            Home
          </ViewTransitionLink>
          <ViewTransitionLink
            to="/trending"
            className={`nav-link ${location.pathname === "/trending" ? "active" : ""}`}
            viewTransitionName="nav-trending"
          >
            Trending
          </ViewTransitionLink>
          <ViewTransitionLink
            to="/top-stories"
            className={`nav-link ${location.pathname === "/top-stories" ? "active" : ""}`}
            viewTransitionName="nav-top-stories"
          >
            Top Stories
          </ViewTransitionLink>
          <ViewTransitionLink
            to="/archive"
            className={`nav-link ${location.pathname === "/archive" ? "active" : ""}`}
            viewTransitionName="nav-archive"
          >
            Archive
          </ViewTransitionLink>
          <ViewTransitionLink
            to="/books"
            className={`nav-link ${location.pathname === "/books" ? "active" : ""}`}
            viewTransitionName="nav-books"
          >
            Books
          </ViewTransitionLink>
          <ViewTransitionLink
            to="/search"
            className={`nav-link ${location.pathname === "/search" ? "active" : ""}`}
            viewTransitionName="nav-search"
          >
            Search
          </ViewTransitionLink>
          <ViewTransitionLink
            to="/favorites"
            className={`nav-link ${location.pathname === "/favorites" ? "active" : ""}`}
            viewTransitionName="nav-favorites"
          >
            Favorites
          </ViewTransitionLink>
          
          {/* Options Dropdown */}
          <div style={{ position: "relative" }} ref={optionsRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleOptions(e);
              }}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                color: "var(--text)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease",
              }}
            >
              Options
              <span style={{ fontSize: "12px" }}>
                {isOptionsOpen ? "▼" : "▶"}
              </span>
            </button>
            
            {isOptionsOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "0.5rem",
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  boxShadow: "var(--shadow)",
                  padding: "0.75rem",
                  minWidth: "200px",
                  zIndex: 1001,
                }}
              >
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                    Settings
                  </div>
                  <ThemeToggle />
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                    Quick Actions
                  </div>
                  <Link
                    to="/api-docs"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      color: "var(--text)",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      transition: "background 0.2s ease",
                      textDecoration: "none",
                    }}
                    onClick={() => setIsOptionsOpen(false)}
                  >
                    API Documentation
                  </Link>
                  <button
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      color: "var(--text)",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      transition: "background 0.2s ease",
                    }}
                    onClick={handleClearCache}
                  >
                    Clear Cache
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.5rem",
            color: "var(--text)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            transition: "all 0.2s ease",
          }}
          className="mobile-menu-btn"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span style={{ 
              width: "20px", 
              height: "2px", 
              background: "var(--text)",
              transition: "all 0.3s ease",
              transform: isMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "none"
            }} />
            <span style={{ 
              width: "20px", 
              height: "2px", 
              background: "var(--text)",
              transition: "all 0.3s ease",
              opacity: isMenuOpen ? 0 : 1
            }} />
            <span style={{ 
              width: "20px", 
              height: "2px", 
              background: "var(--text)",
              transition: "all 0.3s ease",
              transform: isMenuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none"
            }} />
          </div>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          ref={mobileMenuRef}
          style={{
            position: "fixed",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--panel)",
            borderTop: "1px solid var(--border)",
            padding: "1rem",
            zIndex: 999,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            animation: "slideDown 0.3s ease",
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <ViewTransitionLink
              to="/"
              style={{
                color: "var(--text)",
                textDecoration: "none",
                fontWeight: 600,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                transition: "background 0.2s ease",
              }}
              onClick={() => setIsMenuOpen(false)}
              className="mobile-nav-link"
              viewTransitionName="mobile-nav-home"
            >
              Home
            </ViewTransitionLink>
            <ViewTransitionLink
              to="/trending"
              style={{
                color: "var(--text)",
                textDecoration: "none",
                fontWeight: 600,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                transition: "background 0.2s ease",
              }}
              onClick={() => setIsMenuOpen(false)}
              className="mobile-nav-link"
              viewTransitionName="mobile-nav-trending"
            >
              Trending
            </ViewTransitionLink>
            <ViewTransitionLink
              to="/top-stories"
              style={{
                color: "var(--text)",
                textDecoration: "none",
                fontWeight: 600,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                transition: "background 0.2s ease",
              }}
              onClick={() => setIsMenuOpen(false)}
              className="mobile-nav-link"
              viewTransitionName="mobile-nav-top-stories"
            >
              Top Stories
            </ViewTransitionLink>
            <ViewTransitionLink
              to="/archive"
              style={{
                color: "var(--text)",
                textDecoration: "none",
                fontWeight: 600,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                transition: "background 0.2s ease",
              }}
              onClick={() => setIsMenuOpen(false)}
              className="mobile-nav-link"
              viewTransitionName="mobile-nav-archive"
            >
              Archive
            </ViewTransitionLink>
            <ViewTransitionLink
              to="/books"
              style={{
                color: "var(--text)",
                textDecoration: "none",
                fontWeight: 600,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                transition: "background 0.2s ease",
              }}
              onClick={() => setIsMenuOpen(false)}
              className="mobile-nav-link"
              viewTransitionName="mobile-nav-books"
            >
              Books
            </ViewTransitionLink>
            <ViewTransitionLink
              to="/search"
              style={{
                color: "var(--text)",
                textDecoration: "none",
                fontWeight: 600,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                transition: "background 0.2s ease",
              }}
              onClick={() => setIsMenuOpen(false)}
              className="mobile-nav-link"
              viewTransitionName="mobile-nav-search"
            >
              Search
            </ViewTransitionLink>
            <ViewTransitionLink
              to="/favorites"
              style={{
                color: "var(--text)",
                textDecoration: "none",
                fontWeight: 600,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                transition: "background 0.2s ease",
              }}
              onClick={() => setIsMenuOpen(false)}
              className="mobile-nav-link"
              viewTransitionName="mobile-nav-favorites"
            >
              Favorites
            </ViewTransitionLink>
            
            <div style={{ 
              borderTop: "1px solid var(--border)", 
              marginTop: "0.5rem", 
              paddingTop: "0.75rem" 
            }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                Settings
              </div>
              <ThemeToggle />
            </div>
            
            <div style={{ 
              borderTop: "1px solid var(--border)", 
              marginTop: "0.75rem", 
              paddingTop: "0.75rem" 
            }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Developer
              </div>
              <ViewTransitionLink
                to="/api-docs"
                style={{
                  color: "var(--text)",
                  textDecoration: "none",
                  fontWeight: 600,
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  transition: "background 0.2s ease",
                  display: "block",
                }}
                onClick={() => setIsMenuOpen(false)}
                className="mobile-nav-link"
                viewTransitionName="mobile-nav-api-docs"
              >
                API Documentation
              </ViewTransitionLink>
            </div>
            
            <div style={{ 
              borderTop: "1px solid var(--border)", 
              marginTop: "0.75rem", 
              paddingTop: "0.75rem" 
            }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Quick Actions
              </div>
              <button
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  transition: "background 0.2s ease",
                }}
                onClick={handleClearCache}
              >
                Clear Cache
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
