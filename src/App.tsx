import React from "react";
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
import ViewTransitionsProvider from "./components/ViewTransitionsProvider";
import "./index.css";
import "./styles/header.css";
import "./styles/api-docs.css";
import "./styles/view-transitions.css";


function App() {
  return (
    <Router>
      <ViewTransitionsProvider>
        <SiteHeader />
        <main style={{ paddingTop: "70px" }}>
          <div className="container">
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
            </Routes>
          </div>
        </main>
      </ViewTransitionsProvider>
    </Router>
  );
}

export default App;
