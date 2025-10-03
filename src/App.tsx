import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import TrendingPage from "./pages/TrendingPage";
import TopStoriesPage from "./pages/TopStoriesPage";
import ArchivePage from "./pages/ArchivePage";
import DetailPage from "./pages/DetailPage";
import FavoritesPage from "./pages/FavoritesPage";
import ApiDocsPage from "./pages/ApiDocsPage";
import BooksPage from "./pages/BooksPage";
import CacheHealthPage from "./pages/CacheHealthPage";
import CacheHealthMonitor from "./components/CacheHealthMonitor";
import { ViewTransitionsProvider } from "./components/ViewTransitionsProvider";
import { QueryProvider } from "./providers/QueryProvider";
import "./index.css";
import "./styles/header.css";
import "./styles/api-docs.css";
import "./styles/view-transitions.css";


function App() {
  useEffect(() => {
    // Register service worker for static asset caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.warn('Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <QueryProvider>
      <Router>
        <ViewTransitionsProvider>
          <SiteHeader />
          <main style={{ paddingTop: "70px" }}>
            <div 
              className="container view-transition-page-root"
              style={{ viewTransitionName: "page-root" }}
            >
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/top-stories" element={<TopStoriesPage />} />
                <Route path="/archive" element={<ArchivePage />} />
                <Route path="/books" element={<BooksPage />} />
                <Route path="/detail" element={<DetailPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/api-docs" element={<ApiDocsPage />} />
                <Route path="/cache-health" element={<CacheHealthPage />} />
              </Routes>
            </div>
                  </main>
                </ViewTransitionsProvider>
              </Router>
              <CacheHealthMonitor />
            </QueryProvider>
          );
        }

export default App;
