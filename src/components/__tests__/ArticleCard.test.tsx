import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import ArticleCard from "../ArticleCard";
import type { NytArticle } from "../../types/nyt";
import type { MostPopularArticle } from "../../types/nyt.other"; 

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
    multimedia: { url: "images/2024/05/01/thumb.jpg" },
    headline: { main: "Headline" },
    pub_date: "2024-05-01T12:00:00Z",
    section_name: "World",
    keywords: [],
    ...overrides,
  };
}

function makeMostPopularArticle(overrides: Partial<MostPopularArticle> = {}): MostPopularArticle {
  return {
    id: 100000001,
    url: "https://www.nytimes.com/2024/05/01/world/example.html",
    title: "Most Popular Headline",
    abstract: "Most popular abstract",
    published_date: "2024-05-01T12:00:00Z",
    section: "World",
    byline: "By Test Author",
    media: [{
      type: "image",
      subtype: "photo",
      caption: "Test caption",
      copyright: "Test copyright",
      approved_for_syndication: 1,
      "media-metadata": [{
        url: "https://static01.nyt.com/images/2024/05/01/test-image.jpg",
        format: "Standard Thumbnail",
        height: 75,
        width: 75
      }]
    }],
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

  describe('Image URL handling', () => {
    test("displays image from regular article multimedia", () => {
      const article = makeArticle({
        multimedia: {
          default: {
            url: "https://static01.nyt.com/images/2024/05/01/regular-image.jpg",
            height: 150,
            width: 150
          }
        }
      });

      render(
        <MemoryRouter>
          <ArticleCard article={article} />
        </MemoryRouter>
      );

      const image = screen.getByAltText("");
      expect(image).toHaveAttribute("src", "https://static01.nyt.com/images/2024/05/01/regular-image.jpg");
    });

    test("displays image from Most Popular article media", () => {
      const article = makeMostPopularArticle({
        media: [{
          type: "image",
          subtype: "photo",
          caption: "Test caption",
          copyright: "Test copyright",
          approved_for_syndication: 1,
          "media-metadata": [{
            url: "https://static01.nyt.com/images/2024/05/01/most-popular-image.jpg",
            format: "Standard Thumbnail",
            height: 75,
            width: 75
          }]
        }]
      });

      render(
        <MemoryRouter>
          <ArticleCard article={article} />
        </MemoryRouter>
      );

      const image = screen.getByAltText("");
      expect(image).toHaveAttribute("src", "https://static01.nyt.com/images/2024/05/01/most-popular-image.jpg");
    });

    test("falls back to thumbnail when default image not available", () => {
      const article = makeArticle({
        multimedia: {
          thumbnail: {
            url: "https://static01.nyt.com/images/2024/05/01/thumbnail-image.jpg",
            height: 75,
            width: 75
          }
        }
      });

      render(
        <MemoryRouter>
          <ArticleCard article={article} />
        </MemoryRouter>
      );

      const image = screen.getByAltText("");
      expect(image).toHaveAttribute("src", "https://static01.nyt.com/images/2024/05/01/thumbnail-image.jpg");
    });

    test("displays fallback image when no multimedia available", () => {
      const article = makeArticle({
        multimedia: {}
      });

      render(
        <MemoryRouter>
          <ArticleCard article={article} />
        </MemoryRouter>
      );

      const image = screen.getByAltText("");
      expect(image).toHaveAttribute("src", "https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg");
    });

    test("displays fallback image when Most Popular article has no media", () => {
      const article = makeMostPopularArticle({
        media: []
      });

      render(
        <MemoryRouter>
          <ArticleCard article={article} />
        </MemoryRouter>
      );

      const image = screen.getByAltText("");
      expect(image).toHaveAttribute("src", "https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg");
    });

    test("handles Most Popular article with empty media-metadata", () => {
      const article = makeMostPopularArticle({
        media: [{
          type: "image",
          subtype: "photo",
          caption: "Test caption",
          copyright: "Test copyright",
          approved_for_syndication: 1,
          "media-metadata": []
        }]
      });

      render(
        <MemoryRouter>
          <ArticleCard article={article} />
        </MemoryRouter>
      );

      const image = screen.getByAltText("");
      expect(image).toHaveAttribute("src", "https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg");
    });

    test("handles Most Popular article with media-metadata but no URL", () => {
      const article = makeMostPopularArticle({
        media: [{
          type: "image",
          subtype: "photo",
          caption: "Test caption",
          copyright: "Test copyright",
          approved_for_syndication: 1,
          "media-metadata": [{
            url: "",
            format: "Standard Thumbnail",
            height: 75,
            width: 75
          }]
        }]
      });

      render(
        <MemoryRouter>
          <ArticleCard article={article} />
        </MemoryRouter>
      );

      const image = screen.getByAltText("");
      expect(image).toHaveAttribute("src", "https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg");
    });
  });

  describe('Most Popular Article rendering', () => {
    test("renders Most Popular article with correct title and abstract", () => {
      const article = makeMostPopularArticle();

      render(
        <MemoryRouter>
          <ArticleCard article={article} />
        </MemoryRouter>
      );

      expect(screen.getByText("Most Popular Headline")).toBeInTheDocument();
      expect(screen.getByText("Most popular abstract")).toBeInTheDocument();
    });

    test("handles Most Popular article with missing properties gracefully", () => {
      const article = makeMostPopularArticle({
        title: undefined,
        abstract: undefined,
        media: undefined
      });

      render(
        <MemoryRouter>
          <ArticleCard article={article} />
        </MemoryRouter>
      );

      // Should not crash and should show fallback image
      const image = screen.getByAltText("");
      expect(image).toHaveAttribute("src", "https://upload.wikimedia.org/wikipedia/commons/4/40/New_York_Times_logo_variation.jpg");
    });
  });
});
