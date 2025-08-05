import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import ArticleCard from "../ArticleCard";
import type { NytArticle } from "../../types/nyt"; 

const mockAddFavorite = jest.fn();
const mockRemoveFavorite = jest.fn();
const mockSetScrollY = jest.fn();

// Mock the store
jest.mock("../../store/searchStore", () => ({
  useSearchStore: jest.fn(),
}));

function makeArticle(overrides: Partial<NytArticle> = {}): NytArticle {
  return {
    _id: "id-1",
    web_url: "https://www.nytimes.com/2024/05/01/world/example.html",
    snippet: "snippet",
    lead_paragraph: "lead",
    multimedia: [{ url: "images/2024/05/01/thumb.jpg" }],
    headline: { main: "Headline" },
    pub_date: "2024-05-01T12:00:00Z",
    section_name: "World",
    keywords: [],
    ...overrides,
  };
}

describe('ArticleCard', () => {
  const { useSearchStore } = require("../../store/searchStore");

  beforeEach(() => {
    jest.clearAllMocks();
    useSearchStore.mockReturnValue({
      favorites: [],
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite,
      setScrollY: mockSetScrollY,
    });
  });

  test("renders headline, snippet, and link destination", () => {
    render(
      <MemoryRouter>
        <ArticleCard article={makeArticle()} />
      </MemoryRouter>
    );
    expect(screen.getByText("Headline")).toBeInTheDocument();
    expect(screen.getByText("snippet")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /headline/i }); 
    expect(link.getAttribute("href")).toContain("/detail?url=");
  });

  test("renders favorite button", () => {
    render(
      <MemoryRouter>
        <ArticleCard article={makeArticle()} />
      </MemoryRouter>
    );
    
    const favoriteButton = screen.getByTitle("Add to favorites");
    expect(favoriteButton).toBeInTheDocument();
    expect(favoriteButton).toHaveTextContent("♡");
  });

  test("shows filled heart when article is favorited", () => {
    useSearchStore.mockReturnValue({
      favorites: [makeArticle()],
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite,
      setScrollY: mockSetScrollY,
    });

    render(
      <MemoryRouter>
        <ArticleCard article={makeArticle()} />
      </MemoryRouter>
    );
    
    const favoriteButton = screen.getByTitle("Remove from favorites");
    expect(favoriteButton).toBeInTheDocument();
    expect(favoriteButton).toHaveTextContent("♥");
  });

  test("calls addFavorite when clicking unfavorited heart", () => {
    useSearchStore.mockReturnValue({
      favorites: [],
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite,
      setScrollY: mockSetScrollY,
    });

    const article = makeArticle();
    render(
      <MemoryRouter>
        <ArticleCard article={article} />
      </MemoryRouter>
    );
    
    const favoriteButton = screen.getByTitle("Add to favorites");
    fireEvent.click(favoriteButton);
    
    expect(mockAddFavorite).toHaveBeenCalledWith(article);
  });

  test("calls removeFavorite when clicking favorited heart", () => {
    const article = makeArticle();
    useSearchStore.mockReturnValue({
      favorites: [article],
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite,
      setScrollY: mockSetScrollY,
    });

    render(
      <MemoryRouter>
        <ArticleCard article={article} />
      </MemoryRouter>
    );
    
    const favoriteButton = screen.getByTitle("Remove from favorites");
    fireEvent.click(favoriteButton);
    
    expect(mockRemoveFavorite).toHaveBeenCalledWith(article.web_url);
  });

  test("handles null favorites array gracefully", () => {
    useSearchStore.mockReturnValue({
      favorites: null,
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite,
      setScrollY: mockSetScrollY,
    });

    render(
      <MemoryRouter>
        <ArticleCard article={makeArticle()} />
      </MemoryRouter>
    );
    
    // Should not crash and should show unfavorited heart
    const favoriteButton = screen.getByTitle("Add to favorites");
    expect(favoriteButton).toBeInTheDocument();
    expect(favoriteButton).toHaveTextContent("♡");
  });
});
