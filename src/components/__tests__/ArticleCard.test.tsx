import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import ArticleCard from "../ArticleCard";
import type { NytArticle } from "../../types/nyt"; 
jest.mock("../../store/searchStore", () => ({
  useSearchStore: {
    getState: () => ({ setScrollY: jest.fn() }),
  },
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
    ...overrides,
  };
}

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
