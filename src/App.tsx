import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import DetailPage from "./pages/DetailPage";
import "./index.css";
import "./styles/header.css";

// Updated deployment test - $(date)
function App() {
  return (
    <Router>
      <SiteHeader />
      <main style={{ paddingTop: "70px" }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/detail" element={<DetailPage />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
